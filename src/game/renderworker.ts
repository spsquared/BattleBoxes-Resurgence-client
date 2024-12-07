import {
    AnimatedTexturedRenderable, CircleRenderable, CompositeRenderable, CustomRenderable,
    PathRenderable, RectangleRenderable, RenderEngineError, RenderWorkerMessages, TextRenderable,
    TexturedRenderable
} from './renderer';

import type {
    RenderEngineFrameInput, Stats, RenderEngineInitPack, RenderEngineLayerDescriptors, RenderEngineLayers, RenderEngineViewport,
} from './renderer';

/**
 * Worker thread that runs rendering in a separate thread. The main thread creates a worker for each `RenderEngine`
 * and initializes its layers. Updated frame data is sent to workers by flattening the renderable tree, pre-transforming
 * entities within `CompositeRenderable`s and culling entities outside the viewport, as to not copy external
 * instance data from entities.
 * 
 * The worker will sort and draw all entities, though `custom` layer types will interrupt the drawing as functions
 * are non-transferable to Worker threads. For `custom` layers, the main thread will execute the drawing before
 * the worker can resume.
 * 
 * Image transfering is handled with `ImageBitmap` objects. Textures, however, will be cached and only be sent to
 * the worker when a new texture is found. Unused textures are removed immediately from cache.
 */
export default class RenderEngineWorker<LayerDescriptors extends RenderEngineLayerDescriptors> {
    private readonly frame: RenderEngineFrameInput<LayerDescriptors> = [] as RenderEngineFrameInput<LayerDescriptors>;
    private readonly viewport: RenderEngineViewport = {
        x: 0,
        y: 0,
        angle: 0,
        width: 0,
        height: 0,
        scale: 1
    };

    private readonly layers: RenderEngineLayers<LayerDescriptors>;
    // Auxillary canvas used in intermediate drawing for some textures
    private readonly auxCanvas: OffscreenCanvas;
    private readonly auxCtx: OffscreenCanvasRenderingContext2D;
    private readonly missingTexture: Promise<ImageBitmap>;

    private readonly metricsCounters: {
        frames: number[]
        frameHistory: number[]
        timings: number[]
        sortTimings: number[]
        drawTimings: number[]
    } = {
            frames: [],
            frameHistory: [],
            timings: [],
            sortTimings: [],
            drawTimings: []
        };

    /**
     * @param {RenderEngineInitPack} layers Layer data following the `RenderEngineLayerDescriptors` given
     */
    constructor(mainCanvas: OffscreenCanvas, layers: RenderEngineInitPack<LayerDescriptors>) {
        this.layers = [] as RenderEngineLayers<LayerDescriptors>;
        const canvases = [mainCanvas];
        // create canvases
        for (const layer of layers) {
            if (layer.canvas < 0) throw new RenderEngineError('Cannot have negative canvas index');
            canvases[layer.canvas] ??= new OffscreenCanvas(1, 1);
        }
        // create layer contexts
        for (const layer of layers) {
            // grab target canvases (typescript keeps messing up types for getContext buh)
            const targetCanvas = canvases[layer.target];
            if (targetCanvas == undefined) throw new RenderEngineError(`Invalid configuration: Target canvas ${layer.target} does not exist`);
            const targetCtx = targetCanvas.getContext('2d', { desynchronized: true })!;
            // stuff that'll be used by all the layers
            const layerProps = {
                compositing: layer.compositing ?? 'source-over',
                filter: layer.filter ?? '',
                targetCanvas: layer.target == layer.canvas ? null : targetCtx,
                targetCompositing: layer.targetCompositing ?? 'source-over',
                clear: layer.clear ?? false,
                smoothing: layer.smoothing ?? true,
                culling: layer.culling ?? true
            };
            // differentiate layer types
            if (layer.type == '2d' || layer.type == 'custom') {
                const canvas = canvases[layer.canvas];
                const ctx = canvas.getContext('2d', { desynchronized: true })!;
                this.layers.push({
                    canvas: canvas,
                    ctx: ctx,
                    ...layerProps
                });
            } else if (layer.type == 'webgl') {
                const canvas = canvases[layer.canvas];
                const ctx = canvas.getContext('webgl2', { desynchronized: true })!;
                this.layers.push({
                    canvas: canvas,
                    ctx: ctx,
                    ...layerProps
                });
            }
        }
        // create aux canvas
        this.auxCanvas = new OffscreenCanvas(1, 1);
        const auxCtx = this.auxCanvas.getContext('2d')!;
        this.auxCtx = auxCtx;
        this.auxCanvas.width = 2;
        this.auxCanvas.height = 2;
        this.auxCtx.reset();
        this.auxCtx.fillStyle = '#000';
        this.auxCtx.fillRect(0, 0, 2, 2);
        this.auxCtx.fillStyle = '#F0F';
        this.auxCtx.fillRect(0, 0, 1, 1);
        this.auxCtx.fillRect(1, 1, 1, 1);
        this.missingTexture = createImageBitmap(this.auxCanvas);
        // listen for messages from main thread
        self.onmessage = this.handleWorkerMessage;
    }

    private handleWorkerMessage(e: MessageEvent<[RenderWorkerMessages, ...any[]]>): void {
        switch (e.data[0]) {
            case RenderWorkerMessages.FRAMEDATA:
                this.updateFrameData(e.data[1], e.data[2]);
                break;
            case RenderWorkerMessages.FRAMETICK:
                this.drawFrame();
                break;
            case RenderWorkerMessages.FRAMECONT:
                break;
            default:
                throw new RenderEngineError('Unmatched worker message ' + e.data[0]);
        }
    }

    /**
     * Transforms a renderable entity based on its relative position in parent space to global space.
     * @param entity Entity to transform
     * @param parent Parent entity to transform relative to
     * @param cosVal Cosine of the parent entity's angle
     * @param sinVal Sine of hte parent entity's angle
     * @returns Transformed renderable in global space
     */
    private transformRenderable<Renderable extends CompositeRenderable | RectangleRenderable | TexturedRenderable | TextRenderable>(entity: Renderable, parent: CompositeRenderable, cosVal: number, sinVal: number): Renderable {
        return {
            ...entity,
            x: parent.x + entity.x * cosVal - entity.y * sinVal,
            y: parent.y + entity.y * cosVal + entity.x * sinVal,
            angle: (parent.angle) + (entity.angle)
        };
    }

    /**
     * Handles new frame data from the main thread. Entities are sorted and bucketed here rather than in @{link drawFrame}
     * as it is only needed once. Does not cull entities as that is done on the main thread.
     */
    private updateFrameData(viewport: RenderEngineViewport, entities: RenderEngineFrameInput<LayerDescriptors>) {
        this.viewport.x = viewport.x;
        this.viewport.y = viewport.y;
        this.viewport.angle = viewport.angle;
        if (this.viewport.width != viewport.width || this.viewport.height != viewport.height) {
            this.viewport.width = viewport.width;
            this.viewport.height = viewport.height;
            const resized: Set<OffscreenCanvas> = new Set();
            for (const layer of this.layers) {
                if (!resized.has(layer.canvas)) {
                    resized.add(layer.canvas);
                    layer.canvas.width = this.viewport.width;
                    layer.canvas.height = this.viewport.height;
                }
            }
        }
        this.viewport.scale = viewport.scale;
        // sort entities here as is only needed once
    }

    /**
     * 
     */
    private drawFrame() {
        if (this.frame.length != this.layers.length) return;
        // setup

        // remove culling stuff as it's already done on main thread
        // DFS should also be done
        const vpAngleCosVal = Math.cos(this.viewport.angle);
        const vpAngleSinVal = Math.sin(this.viewport.angle);
        const vpTransformX = this.viewport.x * vpAngleCosVal - this.viewport.y * vpAngleSinVal;
        const vpTransformY = this.viewport.y * vpAngleCosVal + this.viewport.x * vpAngleSinVal;
        const hVpTransformWidth = (Math.abs(this.viewport.width * vpAngleCosVal) + Math.abs(this.viewport.height * vpAngleSinVal)) / 2 / this.viewport.scale;
        const hVpTransformHeight = (Math.abs(this.viewport.height * vpAngleCosVal) + Math.abs(this.viewport.width * vpAngleSinVal)) / 2 / this.viewport.scale;
        const cullBottom = vpTransformY - hVpTransformHeight - this.cullDist;
        const cullTop = vpTransformY + hVpTransformHeight + this.cullDist;
        const cullLeft = vpTransformX - hVpTransformWidth - this.cullDist;
        const cullRight = vpTransformX + hVpTransformWidth + this.cullDist;
        const twoPi = 2 * Math.PI;
        const unusedTexturePatterns = new Set(this.texturePatternCache.keys());
        const start = performance.now();
        let sortTotal = 0;
        let drawTotal = 0;
        for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];
            const canvas = layer.canvas;
            const ctx = layer.ctx;
            if (ctx instanceof OffscreenCanvasRenderingContext2D) {
                const renderables = this.frame[i] as (PathRenderable | RectangleRenderable | TexturedRenderable | TextRenderable | CompositeRenderable)[];
                // clear canvas and save default state
                if (layer.clear) ctx.reset();
                else ctx.restore();
                ctx.resetTransform();
                ctx.globalCompositeOperation = layer.compositing;
                ctx.imageSmoothingEnabled = layer.smoothing;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                // center canvas onto viewport (optimization is actually kinda pointless)
                ctx.translate(-this.viewport.x * this.viewport.scale + this.viewport.width / 2, this.viewport.y * this.viewport.scale + this.viewport.height / 2);
                if (this.viewport.angle % twoPi != 0) ctx.rotate(this.viewport.angle);
                ctx.scale(this.viewport.scale, this.viewport.scale);
                ctx.save();
                // flatten all composite renderables out into categories
                // immediately draw all custom renderables
                // bucket everything else into line, rectangular, and text groups (by color)
                const sortStart = performance.now();
                const simpleRenderableBuckets: Map<string, [RectangleRenderable[], CircleRenderable[], CircleRenderable[], TextRenderable[], PathRenderable[]]> = new Map();
                const texturedRenderables: TexturedRenderable[] = [];
                const brokenTexturedRenderables: TexturedRenderable[] = [];
                const compositeRenderableStack: CompositeRenderable[] = [];
                for (const entity of renderables) {
                    if (entity instanceof CompositeRenderable) {
                        if (layer.culling && (entity.x < cullLeft || entity.x > cullRight || entity.y < cullBottom || entity.y > cullTop)) continue;
                        compositeRenderableStack.push(entity);
                    } else if (entity instanceof TexturedRenderable) {
                        if (layer.culling && (entity.x < cullLeft || entity.x > cullRight || entity.y < cullBottom || entity.y > cullTop)) continue;
                        if (entity.texture === undefined) brokenTexturedRenderables.push(entity);
                        else texturedRenderables.push(entity);
                    } else if (entity instanceof RectangleRenderable) {
                        if (layer.culling && (entity.x < cullLeft || entity.x > cullRight || entity.y < cullBottom || entity.y > cullTop)) continue;
                        const bucket = simpleRenderableBuckets.get(entity.color);
                        if (bucket === undefined) simpleRenderableBuckets.set(entity.color, [[entity], [], [], [], []]);
                        else bucket[0].push(entity);
                    } else if (entity instanceof TextRenderable) {
                        if (layer.culling && (entity.x < cullLeft || entity.x > cullRight || entity.y < cullBottom || entity.y > cullTop)) continue;
                        const bucket = simpleRenderableBuckets.get(entity.color);
                        if (bucket === undefined) simpleRenderableBuckets.set(entity.color, [[], [], [], [entity], []]);
                        else bucket[3].push(entity);
                    } else if (entity instanceof PathRenderable) {
                        const bucket = simpleRenderableBuckets.get(entity.color);
                        if (bucket === undefined) simpleRenderableBuckets.set(entity.color, [[], [], [], [], [entity]]);
                        else bucket[4].push(entity);
                    } else if (entity instanceof CircleRenderable) {
                        if (layer.culling && (entity.x < cullLeft || entity.x > cullRight || entity.y < cullBottom || entity.y > cullTop)) continue;
                        if (entity.fill != '') {
                            const bucket = simpleRenderableBuckets.get(entity.fill);
                            if (bucket === undefined) simpleRenderableBuckets.set(entity.fill, [[], [entity], [], [], []]);
                            else bucket[1].push(entity);
                        }
                        if (entity.stroke != '' && entity.lineWidth != 0) {
                            const bucket = simpleRenderableBuckets.get(entity.stroke);
                            if (bucket === undefined) simpleRenderableBuckets.set(entity.stroke, [[], [], [entity], [], []]);
                            else bucket[2].push(entity);
                        }
                    } else if (entity instanceof CustomRenderable) {
                        ctx.save();
                        try {
                            entity.draw(ctx);
                        } catch (err) {
                            console.error(err);
                        }
                        ctx.restore();
                    } else {
                        console.warn(new RenderEngineError('Unrecognizable entity in pipeline, discarding!'));
                    }
                }
                while (compositeRenderableStack.length > 0) {
                    const compositeEntity = compositeRenderableStack.pop()!;
                    // carry transformations through to all children (mild spaghetti)
                    const cosVal = Math.cos(compositeEntity.angle);
                    const sinVal = Math.sin(compositeEntity.angle);
                    for (const entity of compositeEntity.components) {
                        if (entity instanceof CompositeRenderable) {
                            const transformed = this.transformRenderable(entity, compositeEntity, cosVal, sinVal);
                            if (layer.culling && (transformed.x < cullLeft || transformed.x > cullRight || transformed.y < cullBottom || transformed.y > cullTop)) continue;
                            compositeRenderableStack.push();
                        } else if (entity instanceof TexturedRenderable) {
                            const transformed = this.transformRenderable(entity, compositeEntity, cosVal, sinVal);
                            if (layer.culling && (transformed.x < cullLeft || transformed.x > cullRight || transformed.y < cullBottom || transformed.y > cullTop)) continue;
                            if (entity.texture === undefined) brokenTexturedRenderables.push(transformed);
                            else texturedRenderables.push(transformed);
                        } else if (entity instanceof RectangleRenderable) {
                            const bucket = simpleRenderableBuckets.get(entity.color);
                            const transformed = this.transformRenderable(entity, compositeEntity, cosVal, sinVal);
                            if (layer.culling && (transformed.x < cullLeft || transformed.x > cullRight || transformed.y < cullBottom || transformed.y > cullTop)) continue;
                            if (bucket === undefined) simpleRenderableBuckets.set(entity.color, [[transformed], [], [], [], []]);
                            else bucket[0].push(transformed);
                            // split stroke/fill stuff like circles
                        } else if (entity instanceof TextRenderable) {
                            const bucket = simpleRenderableBuckets.get(entity.color);
                            const transformed = this.transformRenderable(entity, compositeEntity, cosVal, sinVal);
                            if (layer.culling && (transformed.x < cullLeft || transformed.x > cullRight || transformed.y < cullBottom || transformed.y > cullTop)) continue;
                            if (bucket === undefined) simpleRenderableBuckets.set(entity.color, [[], [], [], [transformed], []]);
                            else bucket[3].push(transformed);
                        } else if (entity instanceof PathRenderable) {
                            const bucket = simpleRenderableBuckets.get(entity.color);
                            const transformed: PathRenderable = {
                                ...entity,
                                points: entity.points.map((point) => ({
                                    ...point,
                                    x: compositeEntity.x + point.x * cosVal - point.y * sinVal,
                                    y: compositeEntity.y + point.y * cosVal + point.x * sinVal
                                })) as PathRenderable['points']
                            }
                            if (bucket === undefined) simpleRenderableBuckets.set(entity.color, [[], [], [], [], [transformed]]);
                            else bucket[4].push(transformed);
                        } else if (entity instanceof CircleRenderable) {
                            const transformed = {
                                ...entity,
                                x: compositeEntity.x + entity.x,
                                y: compositeEntity.y + entity.y
                            };
                            if (layer.culling && (transformed.x < cullLeft || transformed.x > cullRight || transformed.y < cullBottom || transformed.y > cullTop)) continue;
                            if (entity.fill !== undefined) {
                                const bucket = simpleRenderableBuckets.get(entity.fill);
                                if (bucket === undefined) simpleRenderableBuckets.set(entity.fill, [[], [transformed], [], [], []]);
                                else bucket[1].push(transformed);
                            }
                            if (entity.stroke !== undefined && entity.lineWidth != 0) {
                                const bucket = simpleRenderableBuckets.get(entity.stroke);
                                if (bucket === undefined) simpleRenderableBuckets.set(entity.stroke, [[], [], [transformed], [], []]);
                                else bucket[2].push(transformed);
                            }
                        } else {
                            console.warn(new RenderEngineError('Unrecognizable entity in pipeline (under CompositeRenderable), discarding!'));
                        }
                    }
                }
                sortTotal += performance.now() - sortStart;
                // reset again to clear any accidental changes
                ctx.restore();
                ctx.save();
                const drawStart = performance.now();
                // draw textured entities
                for (const entity of texturedRenderables) {
                    const shiftx = (entity instanceof AnimatedTexturedRenderable ? entity.index * entity.frameWidth : 0) + entity.shiftx;
                    const tiled = entity.tileWidth != entity.width || entity.tileHeight != entity.height;
                    // generate patterns to tile textures
                    if (tiled) {
                        // checks properties and not object (small chance of collision by js wierdness with order of keys)
                        // const patternKey = Object.entries(entity).reduce<string>((prev, curr) => prev + ':' + curr[1], '' + i);
                        // if (this.texturePatternCache.has(patternKey)) {
                        //     ctx.fillStyle = this.texturePatternCache.get(patternKey)!;
                        //     unusedTexturePatterns.delete(patternKey);
                        // } else {
                        this.auxCanvas.width = entity.tileWidth * this.viewport.scale;
                        this.auxCanvas.height = entity.tileHeight * this.viewport.scale;
                        this.auxCtx.reset();
                        this.auxCtx.imageSmoothingEnabled = layer.smoothing;
                        this.auxCtx.drawImage(entity.texture!, shiftx, entity.shifty, entity.cropx, entity.cropy, 0, 0, this.auxCanvas.width, this.auxCanvas.height);
                        const pattern = ctx.createPattern(this.auxCanvas, '') as CanvasPattern;
                        // this.texturePatternCache.set(patternKey, pattern);
                        ctx.fillStyle = pattern;
                        // }
                    }
                    if (entity.angle % twoPi == 0) {
                        if (tiled) {
                            // transform added to align pattern with rectangle
                            ctx.save();
                            ctx.translate(entity.x - entity.width / 2, -entity.y - entity.height / 2);
                            ctx.scale(1 / this.viewport.scale, 1 / this.viewport.scale);
                            ctx.fillRect(0, 0, entity.width * this.viewport.scale, entity.height * this.viewport.scale);
                            ctx.restore();
                        } else {
                            ctx.drawImage(entity.texture!, shiftx, entity.shifty, entity.cropx, entity.cropy, entity.x - entity.width / 2, -entity.y - entity.height / 2, entity.width, entity.height);
                        }
                    } else {
                        ctx.save();
                        ctx.translate(entity.x, -entity.y);
                        ctx.rotate(-entity.angle);
                        if (tiled) {
                            // transform added to align pattern with rectangle
                            ctx.save();
                            ctx.translate(-entity.width / 2, -entity.height / 2);
                            ctx.scale(1 / this.viewport.scale, 1 / this.viewport.scale);
                            ctx.fillRect(0, 0, entity.width * this.viewport.scale, entity.height * this.viewport.scale);
                            ctx.restore();
                        } else {
                            ctx.drawImage(entity.texture!, shiftx, entity.shifty, entity.cropx, entity.cropy, -entity.width / 2, -entity.height / 2, entity.width, entity.height);
                        }
                        ctx.restore();
                    }
                }
                // draw all bucketed entities
                for (const [color, bucket] of simpleRenderableBuckets) {
                    ctx.fillStyle = color;
                    ctx.strokeStyle = color;
                    ctx.lineJoin = 'miter';
                    ctx.lineCap = 'butt';
                    ctx.setLineDash([]);
                    // move sorting to the sort part lol
                    const rectangles = bucket[0].sort((a, b) => a.lineWidth - b.lineWidth);
                    const circleFills = bucket[1];
                    const circleStrokes = bucket[2].sort((a, b) => a.lineWidth - b.lineWidth);
                    const texts = bucket[3].sort((a, b) => a.size - b.size);
                    const lines = bucket[4].sort((a, b) => a.lineWidth - b.lineWidth);
                    let currWidth: number = 0;
                    let isSolidLine = true;
                    // rectangles
                    for (const rect of rectangles) {
                        if (rect.lineWidth != currWidth) {
                            ctx.lineWidth = rect.lineWidth;
                            currWidth = rect.lineWidth;
                        }
                        if (rect.angle % twoPi == 0) {
                            (rect.lineWidth != 0 ? ctx.strokeRect : ctx.fillRect)(rect.x - rect.width / 2, -rect.y - rect.height / 2, rect.width, rect.height);
                        } else {
                            ctx.save();
                            ctx.translate(rect.x, -rect.y);
                            ctx.rotate(-rect.angle);
                            (rect.lineWidth != 0 ? ctx.strokeRect : ctx.fillRect)(-rect.width / 2, -rect.height / 2, rect.width, rect.height);
                            ctx.restore();
                        }
                    }
                    ctx.beginPath();
                    // circle fills
                    for (const circle of circleFills) {
                        ctx.arc(circle.x, -circle.y, circle.r - Math.max(0, circle.lineWidth), 0, twoPi);
                    }
                    ctx.fill();
                    ctx.beginPath();
                    // circle strokes
                    for (const circle of circleStrokes) {
                        if (circle.lineWidth !== currWidth) {
                            ctx.stroke();
                            ctx.beginPath();
                            ctx.lineWidth = circle.lineWidth;
                            currWidth = circle.lineWidth;
                        }
                        if ((circle.lineDash.length == 0) != isSolidLine || circle.lineDash.length > 0) {
                            ctx.setLineDash(circle.lineDash);
                            isSolidLine = circle.lineDash.length == 0;
                        }
                        ctx.arc(circle.x, -circle.y, circle.r, 0, twoPi);
                    }
                    ctx.stroke();
                    // texts
                    let currSize: number = 0;
                    for (const text of texts) {
                        if (text.size !== currSize) {
                            ctx.font = text.size + 'px \'Pixel\'';
                            currSize = text.size;
                        }
                        if (ctx.textAlign != text.align) ctx.textAlign = text.align;
                        if (text.angle % twoPi == 0) {
                            (text.stroke ? ctx.strokeText : ctx.fillText)(text.text, text.x, -text.y);
                        } else {
                            ctx.save();
                            ctx.translate(text.x, -text.y);
                            ctx.rotate(-text.angle);
                            (text.stroke ? ctx.strokeText : ctx.fillText)(text.text, 0, 0);
                            ctx.restore();
                        }
                    }
                    // lines
                    for (const line of lines) {
                        ctx.beginPath();
                        if (ctx.lineJoin !== line.join) ctx.lineJoin = line.join;
                        if (ctx.lineCap !== line.cap) ctx.lineCap = line.cap;
                        if (currWidth != line.lineWidth) {
                            ctx.lineWidth = line.lineWidth;
                            currWidth = line.lineWidth;
                        }
                        if ((line.lineDash.length == 0) != isSolidLine || line.lineDash.length > 0) {
                            ctx.setLineDash(line.lineDash);
                            isSolidLine = line.lineDash.length == 0;
                        }
                        if (line.points.length < 2 || line.points[0].type != 'line' || line.points[line.points.length - 1].type != 'line') {
                            throw new RenderEngineError('Illegal PathRenderable format');
                        }
                        ctx.moveTo(line.points[0].x, -line.points[0].y);
                        for (let i = 1; i < line.points.length; i++) {
                            const point = line.points[i];
                            const nextPoint = line.points[i + 1];
                            switch (point.type) {
                                case 'line':
                                    ctx.lineTo(point.x, -point.y);
                                    break;
                                case 'arc':
                                    ctx.arcTo(point.x, -point.y, nextPoint.x, -nextPoint.y, point.r);
                                    ctx.lineTo(nextPoint.x, nextPoint.y);
                                    break;
                                case 'quad':
                                    ctx.quadraticCurveTo(point.x, -point.y, nextPoint.x, -nextPoint.y);
                                    break;
                            }
                        }
                        if (line.close) ctx.lineTo(line.points[0].x, -line.points[0].y);
                    }
                    ctx.stroke();
                }
                // draw all textured entities with invalid textures
                if (brokenTexturedRenderables.length > 0) {
                    console.warn(brokenTexturedRenderables.length + ' TexturedRenderables referencing nonexistent textures found!');
                    for (const entity of brokenTexturedRenderables) {
                        const tiled = entity.tileWidth != entity.width || entity.tileHeight != entity.height;
                        if (entity.angle % twoPi == 0) {
                            if (tiled) {
                                // transform added to align pattern with rectangle
                                ctx.save();
                                ctx.translate(entity.x - entity.width / 2, -entity.y - entity.height / 2);
                                const pattern = ctx.createPattern(await this.missingTexture, '') as CanvasPattern;
                                ctx.fillStyle = pattern;
                                ctx.fillRect(0, 0, entity.width, entity.height);
                                ctx.restore();
                            } else {
                                ctx.drawImage(await this.missingTexture, entity.x - entity.width / 2, -entity.y - entity.height / 2, entity.width, entity.height);
                            }
                        } else {
                            ctx.save();
                            ctx.translate(entity.x, -entity.y);
                            ctx.rotate(-entity.angle);
                            if (tiled) {
                                // transform added to align pattern with rectangle
                                ctx.save();
                                ctx.translate(-entity.width / 2, -entity.height / 2);
                                const pattern = ctx.createPattern(await this.missingTexture, '') as CanvasPattern;
                                ctx.fillStyle = pattern;
                                ctx.fillRect(0, 0, entity.width, entity.height);
                                ctx.restore();
                            } else {
                                ctx.drawImage(await this.missingTexture, -entity.width / 2, -entity.height / 2, entity.width, entity.height);
                            }
                            ctx.restore();
                        }
                    }
                }
                drawTotal += performance.now() - drawStart;
            } else {
                throw new RenderEngineError('WebGL rendering not implemented yet');
            }
            // copy canvases to targets
            const targetCanvas = layer.targetCanvas;
            if (targetCanvas != null) {
                targetCanvas.save();
                targetCanvas.resetTransform();
                targetCanvas.globalAlpha = 1;
                targetCanvas.imageSmoothingEnabled = false;
                targetCanvas.globalCompositeOperation = layer.targetCompositing;
                targetCanvas.shadowColor = '#0000';
                targetCanvas.drawImage(canvas, 0, 0);
                targetCanvas.restore();
            }
        }
        // remove unused texture patterns
        for (const key of unusedTexturePatterns) this.texturePatternCache.delete(key);
        // record performance metrics
        const now = performance.now();
        // use start so 0fps is reportable
        this.metricsCounters.frames.push(start);
        while (this.metricsCounters.frames[0] <= start - 1000) {
            this.metricsCounters.frames.shift();
            this.metricsCounters.frameHistory.shift();
            this.metricsCounters.timings.shift();
            this.metricsCounters.sortTimings.shift();
            this.metricsCounters.drawTimings.shift();
        }
        this.metricsCounters.frameHistory.push(this.metricsCounters.frames.length);
        this.metricsCounters.timings.push(now - start);
        this.metricsCounters.sortTimings.push(sortTotal);
        this.metricsCounters.drawTimings.push(drawTotal);
    }

    private getStats(arr: number[]): Stats {
        return {
            avg: arr.reduce((p, c) => p + c, 0) / arr.length,
            min: Math.min(...arr),
            max: Math.max(...arr)
        };
    }

    private sendMetrics(): void {
        const metrics = {
            fps: this.metricsCounters.frames.length,
            fpsHistory: this.getStats(this.metricsCounters.frameHistory),
            timings: {
                total: this.getStats(this.metricsCounters.timings),
                sort: this.getStats(this.metricsCounters.sortTimings),
                draw: this.getStats(this.metricsCounters.drawTimings)
            }
        };
        postMessage([RenderWorkerMessages.METRICS, metrics], '', [metrics]);
    }
}

// when instantiating
self.onmessage = (e: MessageEvent<[RenderWorkerMessages.INIT, OffscreenCanvas, RenderEngineInitPack<any>]>) => {
    if (e.data[0] == RenderWorkerMessages.INIT) {
        new RenderEngineWorker<any>(e.data[1], e.data[2]);
    } else {
        throw new RenderEngineError('Unexpected worker message ' + e.data[0]);
    }
};

postMessage([RenderWorkerMessages.READY]);