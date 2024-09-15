// graphics engine

/**
 * An entity with a custom `draw` function.
 */
export abstract class CustomRenderable {
    /**
     * Custom draw function invoked for each instance of the entity.
     * @param {OffscreenCanvasRenderingContext2D} ctx Canvas context for the current layer, always an off-screen canvas context
     * @param {ImageBitmap[]} textures Available textures for the current layer
     */
    abstract draw(ctx: OffscreenCanvasRenderingContext2D, textures: ImageBitmap[]): void;
}

/**
 * An entity with a custom `draw` function that can read the canvas data as well as write to it.
 */
export abstract class CustomReadRenderable {
    /**
     * Custom draw function invoked for each instance of the entity. Can be used to pull data off the current layer.
     * @param {CanvasRenderingContext2D} ctx Canvas context for the current layer, always an on-screen canvas context
     * @param {ImageBitmap[]} textures Available textures for the current layer
     */
    abstract draw(ctx: CanvasRenderingContext2D, textures: ImageBitmap[]): void;
}

/**
 * A simple entity that takes the form of a centered rectangle.
 */
export abstract class RectangleRenderable {
    /**X coordinate of center */
    abstract readonly x: number;
    /**Y coordinate of center */
    abstract readonly y: number;
    /**Width */
    abstract readonly width: number;
    /**Height */
    abstract readonly height: number;
    /**Angle in radians rotating counterclockwise */
    abstract readonly angle: number;
    /**Fill color */
    abstract readonly color: string;
}

/**
 * A simple entity that takes the form of some centered text.
 */
export abstract class TextRenderable {
    /**X coordinate of center */
    abstract readonly x: number;
    /**Y coordinate of center */
    abstract readonly y: number;
    /**Font size in pixels */
    abstract readonly size: number;
    /**Angle in radians rotating counterclockwise */
    abstract readonly angle: number;
    /**Color of text */
    abstract readonly color: string;
    /**Text string */
    abstract readonly text: string;
}

/**
 * A `RectangleRenderable` with a textured face instead of a solid fill.
 */
export abstract class TexturedRenderable extends RectangleRenderable {
    /**Texture index of the layer, cropped area will be scaled to fit size */
    abstract readonly texture: number;
    /**Shift in texture pixels along the texture's X axis */
    abstract readonly shiftx: number;
    /**Shift in texture pixels along the texture's Y axis */
    abstract readonly shifty: number;
    /**Width of cropped texture area (texture spans from `shiftx` to `shiftx + cropx`) */
    abstract readonly cropx: number;
    /**Height of cropped texture area (texture spans from `shifty` to `shifty + cropy`) */
    abstract readonly cropy: number;
}

/**
 * A `TexturedRenderable` that simplifies animating textures by additionally shifting the cropping area along the X axis.
 */
export abstract class AnimatedTexturedRenderable extends TexturedRenderable {
    /**Amount of pixels along the X axis to shift for each frame */
    abstract readonly frameWidth: number;
    /**The current frame number of the animation */
    abstract readonly index: number;
}

/**
 * A complex entity that contains subcomponents (other entities) parented to it, following its transform.
 */
export abstract class CompositeRenderable<CustomEntity extends CustomRenderable | CustomReadRenderable> {
    /**X coordinate of center */
    abstract readonly x: number;
    /**Y coordinate of center */
    abstract readonly y: number;
    /**Angle in radians rotating counterclockwise */
    abstract readonly angle: number;
    /**
     * Subcomponents: `CustomRenderable` or `CustomReadRenderable` (depends on layer type),
     * `RectangleRenderable`, `TextRenderable`, and subclasses
     */
    abstract readonly components: (CustomEntity | RectangleRenderable | TextRenderable)[]
}

export abstract class WebGLRectangleRenderable {
    abstract readonly x: number;
    abstract readonly y: number;
    abstract readonly width: number;
    abstract readonly height: number;
    abstract readonly angle: number;
    abstract readonly color: string;
}

export abstract class WebGLTexturedRenderable extends WebGLRectangleRenderable {
    abstract readonly texture: number;
}

export class RenderEngineError extends Error {
    name: string = 'RenderEngineError';
}

/**
 * Describes the layers of the rendering pipeline from bottom to top.
 * 
 * * **`2d`**: Render in 2D to a `HTMLCanvasElement`. Allows `CustomReadRenderable`, `RectangleRenderable`,
 * `TextRenderable`, and `CompositeRenderable<CustomReadRenderable>` entities (includes subclasses like `TexturedRenderable`)
 * 
 * * **`offscreen2d`**: Render in 2D to an `OffscreenCanvas`. Allows `CustomRenderable`, `RectangleRenderable`,
 * `TextRenderable`, and `CompositeRenderable<CustomRenderable>` entities (includes subclasses like `TexturedRenderable`)
 * 
 * * **`webgl`**: Render in 3D or 2D to an `OffscreenCanvas`. Useful for large numbers of simple entities
 * or 3D effects
 */
export type RenderEngineLayerDescriptors = ('2d' | 'offscreen2d' | 'webgl')[];

export type RenderEngineInitPack<Descriptors extends RenderEngineLayerDescriptors> = {
    [Index in keyof Descriptors]: {
        type: Descriptors[Index]
        canvas: number
        target: number
        targetCompositing?: GlobalCompositeOperation
        textures: ImageBitmap[]
        clear?: boolean
        smoothing?: boolean
    }
};

export type RenderEngineLayers<Descriptors extends RenderEngineLayerDescriptors> = {
    [Index in keyof Descriptors]: ({
        canvas: HTMLCanvasElement
        ctx: CanvasRenderingContext2D
    } | {
        canvas: OffscreenCanvas
        ctx: OffscreenCanvasRenderingContext2D
    } | {
        canvas: OffscreenCanvas
        ctx: WebGL2RenderingContext
    }) & {
        targetCanvas: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
        targetCompositing: GlobalCompositeOperation
        clear: boolean
        smoothing: boolean
        textures: ImageBitmap[]
    }
};

export type RenderEngineFrameInput<Descriptors extends RenderEngineLayerDescriptors> = {
    [Index in keyof Descriptors]:
    [(CustomReadRenderable | RectangleRenderable | TextRenderable | CompositeRenderable<CustomReadRenderable>)[], Descriptors[Index] & '2d'][0] |
    [(CustomRenderable | RectangleRenderable | TextRenderable | CompositeRenderable<CustomRenderable>)[], Descriptors[Index] & 'offscreen2d'][0] |
    [(WebGLRectangleRenderable | WebGLTexturedRenderable)[], Descriptors[Index] & 'webgl'][0]
};

export default class RenderEngine<LayerDescriptors extends RenderEngineLayerDescriptors> {
    private readonly baseCanvas: HTMLCanvasElement;
    private readonly frame: RenderEngineFrameInput<LayerDescriptors> = [] as RenderEngineFrameInput<LayerDescriptors>;
    private readonly camera: {
        x: number,
        y: number
    } = {
            x: 0,
            y: 0
        };

    private fr: number = 60;
    private readonly layers: RenderEngineLayers<LayerDescriptors>;
    private drawing: boolean = true;

    constructor(baseCanvas: HTMLCanvasElement, layers: RenderEngineInitPack<LayerDescriptors>) {
        this.baseCanvas = baseCanvas;
        this.layers = [] as RenderEngineLayers<LayerDescriptors>;
        const canvases: (HTMLCanvasElement | OffscreenCanvas)[] = [this.baseCanvas];
        // create canvases
        for (const layer of layers) {
            if (layer.canvas < 0) throw new RenderEngineError('Cannot have negative canvas index');
            if (layer.type == '2d') canvases[layer.canvas] ??= document.createElement('canvas');
            else if (layer.type == 'offscreen2d' || layer.type == 'webgl') canvases[layer.canvas] ??= new OffscreenCanvas(1, 1);
        }
        // create layer contexts
        for (const layer of layers) {
            // grab target canvases (typescript keeps messing up types for getContext buh)
            const targetCanvas = canvases[layer.target];
            if (targetCanvas == undefined) throw new RenderEngineError(`Invalid configuration: Target canvas ${layer.target} does not exist`);
            const targetCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = targetCanvas.getContext('2d');
            if (targetCtx === null) throw new RenderEngineError('Canvas2D context is not supported');
            // stuff that'll be used by all the layers
            const layerProps = {
                targetCanvas: layer.target == layer.canvas ? null : targetCtx,
                targetCompositing: layer.targetCompositing ?? 'source-over',
                clear: layer.clear ?? false,
                smoothing: layer.smoothing ?? true,
                textures: layer.textures
            };
            // differentiate layer types
            if (layer.type == '2d') {
                const canvas = canvases[layer.canvas];
                if (canvas instanceof OffscreenCanvas) throw new RenderEngineError(`Invalid configuration: "2d" layer cannot use OffscreenCanvas of canvas ${layer.canvas}`);
                const ctx = canvas.getContext('2d');
                if (ctx === null) throw new RenderEngineError('Canvas2D context is not supported');
                this.layers.push({
                    canvas: canvas,
                    ctx: ctx,
                    ...layerProps
                });
            } else if (layer.type == 'offscreen2d') {
                const canvas = canvases[layer.canvas];
                if (canvas instanceof HTMLCanvasElement) throw new RenderEngineError(`Invalid configuration: "offscreen2d" layer cannot use HTMLCanvasElement of canvas ${layer.canvas}`);
                const ctx = canvas.getContext('2d');
                if (ctx === null) throw new RenderEngineError('OffscreenCanvas2D context is not supported');
                this.layers.push({
                    canvas: canvas,
                    ctx: ctx,
                    ...layerProps
                });
            } else if (layer.type == 'webgl') {
                if (canvases[layer.canvas] == undefined) canvases[layer.canvas] = new OffscreenCanvas(window.innerWidth, window.innerHeight);
                const canvas = canvases[layer.canvas];
                if (canvas instanceof HTMLCanvasElement) throw new RenderEngineError(`Invalid configuration: "${layer.type}" layer cannot use HTMLCanvasElement of canvas ${layer.canvas}`);
                const ctx = canvas.getContext('webgl2');
                if (ctx === null) throw new RenderEngineError('WebGL2 context is not supported');
                this.layers.push({
                    canvas: canvas,
                    ctx: ctx,
                    ...layerProps
                });
            }
        }
        // start draw loop
        const startDraw = async () => {
            let start = performance.now();
            while (this.drawing) {
                start = performance.now();
                await new Promise<void>((resolve) => {
                    window.requestAnimationFrame(async () => {
                        await this.drawFrame();
                        resolve();
                    });
                });
                await new Promise<void>((resolve) => setTimeout(resolve, (1000 / this.framerate) - (performance.now() - start)));
            }
        };
        startDraw();
        // resizing
        window.addEventListener('resize', () => this.updateResolution(), { passive: true });
        this.updateResolution();
    }

    set framerate(fr: number) {
        if (fr < 0) throw new RenderEngineError('Framerate cannot be negative');
        this.fr = fr;
    }
    get framerate(): number {
        return this.fr;
    }

    sendFrame(entities: RenderEngineFrameInput<LayerDescriptors>) {
        this.frame.length = 0;
        this.frame.push(...entities);
    }

    private async drawFrame() {
        if (this.frame.length != this.layers.length) return;
        const twoPi = 2 * Math.PI;
        for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];
            const canvas = layer.canvas;
            const ctx = layer.ctx;
            const textures = layer.textures;
            if (ctx instanceof CanvasRenderingContext2D || ctx instanceof OffscreenCanvasRenderingContext2D) {
                const renderables = this.frame[i] as (CustomRenderable | CustomReadRenderable | RectangleRenderable | TextRenderable | CompositeRenderable<CustomRenderable> | CompositeRenderable<CustomReadRenderable>)[];
                // clear canvas and save default state
                if (layer.clear) ctx.reset();
                else ctx.restore();
                ctx.resetTransform();
                ctx.imageSmoothingEnabled = layer.smoothing;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.translate(-this.camera.x, -this.camera.y);
                ctx.save();
                // draw custom entities separately to avoid spillover of effects
                for (const entity of renderables) {
                    if (entity instanceof CustomReadRenderable) {
                        entity.draw(ctx as CanvasRenderingContext2D, textures.slice());
                    } else if (entity instanceof CustomRenderable) {
                        entity.draw(ctx as OffscreenCanvasRenderingContext2D, textures.slice());
                    } else if (entity instanceof CompositeRenderable) {
                        const customComponents: (CustomRenderable | CustomReadRenderable)[] = entity.components.filter((comp) => comp instanceof CustomRenderable || comp instanceof CustomReadRenderable);
                        if (customComponents.length != 0) {
                            ctx.save();
                            ctx.translate(entity.x, entity.y);
                            ctx.rotate(entity.angle);
                            for (const component of customComponents) {
                                if (component instanceof CustomReadRenderable) component.draw(ctx as CanvasRenderingContext2D, textures.slice());
                                else component.draw(ctx as OffscreenCanvasRenderingContext2D, textures.slice());
                            }
                            ctx.restore();
                        }
                    }
                }
                // reset again to clear any accidental changes
                ctx.restore();
                ctx.save();
                const buckets: Map<string, [RectangleRenderable[], TextRenderable[]]> = new Map();
                const noTextureEntities: TexturedRenderable[] = [];
                // draw all textured entities immediately, bucket everything else by color
                for (const entity of renderables) {
                    if (entity instanceof CustomRenderable || entity instanceof CustomReadRenderable) {
                        // already drew these
                    } else if (entity instanceof CompositeRenderable) {
                        // destructure the composite entity using spaghetti
                        const cosVal = Math.cos(entity.angle);
                        const sinVal = Math.sin(entity.angle);
                        for (const component of entity.components) {
                            if (component instanceof CustomRenderable || component instanceof CustomReadRenderable) {
                                // we already drew these
                                continue;
                            }
                            // BUT POSITIVE Y IS DOWN HOW FIX
                            if (component instanceof TexturedRenderable) {
                                // use transformed coordinates to avoid lots of canvas transforms
                                if ((entity.angle + component.angle) % twoPi == 0) {
                                    if (component instanceof AnimatedTexturedRenderable) {
                                        ctx.drawImage(textures[component.texture], component.index * component.frameWidth + component.shiftx, component.shifty, component.cropx, component.cropy, entity.x + component.x - component.width / 2, entity.y + component.y - component.height / 2, component.width, component.height);
                                    } else {
                                        ctx.drawImage(textures[component.texture], component.shiftx, component.shifty, component.cropx, component.cropy, entity.x + component.x - component.width / 2, entity.y + component.y - component.height / 2, component.width, component.height);
                                    }
                                } else {
                                    const transformedX = entity.x + component.x * cosVal - component.y * sinVal;
                                    const transformedY = entity.y - component.x * sinVal - component.y * cosVal;
                                    ctx.save();
                                    ctx.translate(transformedX, transformedY);
                                    ctx.rotate(entity.angle + component.angle);
                                    if (component instanceof AnimatedTexturedRenderable) {
                                        ctx.drawImage(textures[component.texture], component.index * component.frameWidth + component.shiftx, component.shifty, component.cropx, component.cropy, -component.width / 2, -component.height / 2, component.width, component.height);
                                    } else {
                                        ctx.drawImage(textures[component.texture], component.shiftx, component.shifty, component.cropx, component.cropy, -component.width / 2, -component.height / 2, component.width, component.height);
                                    }
                                    ctx.restore();
                                }
                            } else if (component instanceof TextRenderable || component instanceof RectangleRenderable) {
                                // transform the coordinates when bucketing
                                const arr = buckets.get(component.color);
                                const transformed: TextRenderable | RectangleRenderable = {
                                    ...component,
                                    x: entity.x + component.x,
                                    y: entity.y + component.y,
                                    angle: entity.angle + component.angle
                                };
                                if (transformed instanceof TextRenderable) {
                                    if (arr == undefined) buckets.set(component.color, [[], [transformed]]);
                                    else arr[1].push(transformed);
                                } else {
                                    if (arr == undefined) buckets.set(component.color, [[transformed], []]);
                                    else arr[0].push(transformed);
                                }
                            } else {
                                console.warn(new RenderEngineError('Unrecognizable entity in pipeline (under CompositeRenderable), discarding!'));
                            }
                        }
                    } else if (entity instanceof TexturedRenderable) {
                        if (textures[entity.texture] == undefined) {
                            noTextureEntities.push(entity);
                        } else {
                            if (entity.angle % twoPi == 0) {
                                if (entity instanceof AnimatedTexturedRenderable) {
                                    ctx.drawImage(textures[entity.texture], entity.index * entity.frameWidth + entity.shiftx, entity.shifty, entity.cropx, entity.cropy, entity.x - entity.width / 2, entity.y - entity.height / 2, entity.width, entity.height);
                                } else {
                                    ctx.drawImage(textures[entity.texture], entity.shiftx, entity.shifty, entity.cropx, entity.cropy, entity.x - entity.width / 2, entity.y - entity.height / 2, entity.width, entity.height);
                                }
                            } else {
                                ctx.save();
                                ctx.translate(entity.x, entity.y);
                                ctx.rotate(entity.angle);
                                if (entity instanceof AnimatedTexturedRenderable) {
                                    ctx.drawImage(textures[entity.texture], entity.index * entity.frameWidth + entity.shiftx, entity.shifty, entity.cropx, entity.cropy, -entity.width / 2, -entity.height / 2, entity.width, entity.height);
                                } else {
                                    ctx.drawImage(textures[entity.texture], entity.shiftx, entity.shifty, entity.cropx, entity.cropy, -entity.width / 2, -entity.height / 2, entity.width, entity.height);
                                }
                                ctx.restore();
                            }
                        }
                    } else if (entity instanceof TextRenderable) {
                        const arr = buckets.get(entity.color);
                        if (arr == undefined) buckets.set(entity.color, [[], [entity]]);
                        else arr[1].push(entity);
                    } else if (entity instanceof RectangleRenderable) {
                        const arr = buckets.get(entity.color);
                        if (arr == undefined) buckets.set(entity.color, [[entity], []]);
                        else arr[0].push(entity);
                    } else {
                        console.warn(new RenderEngineError('Unrecognizable entity in pipeline, discarding!'));
                    }
                }
                // draw all bucketed entities
                for (const [color, bucket] of buckets) {
                    ctx.fillStyle = color;
                    const rectangles = bucket[0];
                    const texts = bucket[1].sort((a, b) => a.size - b.size);
                    for (const rect of rectangles) {
                        if (rect.angle % twoPi == 0) {
                            ctx.fillRect(rect.x - rect.width / 2, rect.y - rect.height / 2, rect.width, rect.height);
                        } else {
                            ctx.save();
                            ctx.translate(rect.x, rect.y);
                            ctx.rotate(rect.angle);
                            ctx.fillRect(-rect.width / 2, -rect.height / 2, rect.width, rect.height);
                            ctx.restore();
                        }
                    }
                    let currSize: number | undefined = undefined;
                    for (const text of texts) {
                        if (text.size !== currSize) {
                            ctx.font = text.size + 'px \'Pixel\'';
                            currSize = text.size;
                        }
                        if (text.angle % twoPi == 0) {
                            ctx.fillText(text.text, text.x, text.y);
                        } else {
                            ctx.save();
                            ctx.translate(text.x, text.y);
                            ctx.rotate(text.angle);
                            ctx.fillText(text.text, 0, 0);
                            ctx.restore();
                        }
                    }
                }
                // draw all textured entities with invalid textures
                ctx.fillStyle = '#000';
                for (const rect of noTextureEntities) {
                    if (rect.angle % twoPi == 0) {
                        ctx.fillRect(rect.x - rect.width / 2, rect.y - rect.height / 2, rect.width, rect.height);
                    } else {
                        ctx.save();
                        ctx.translate(rect.x, rect.y);
                        ctx.rotate(rect.angle);
                        ctx.fillRect(-rect.width / 2, -rect.height / 2, rect.width, rect.height);
                        ctx.restore();
                    }
                }
                ctx.fillStyle = '#F0F';
                for (const rect of noTextureEntities) {
                    if (rect.angle % twoPi == 0) {
                        ctx.fillRect(rect.x - rect.width / 2, rect.y - rect.height / 2, rect.width / 2, rect.height / 2);
                        ctx.fillRect(rect.x, rect.y, rect.width / 2, rect.height / 2);
                    } else {
                        ctx.save();
                        ctx.translate(rect.x, rect.y);
                        ctx.rotate(rect.angle);
                        ctx.fillRect(-rect.width / 2, -rect.height / 2, rect.width / 2, rect.height / 2);
                        ctx.fillRect(0, 0, rect.width / 2, rect.height / 2);
                        ctx.restore();
                    }
                }
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
    }


    private updateResolution() {
        const resized: Set<HTMLCanvasElement | OffscreenCanvas> = new Set();
        for (const layer of this.layers) {
            if (!resized.has(layer.canvas)) {
                resized.add(layer.canvas);
                layer.canvas.width = window.innerWidth * window.devicePixelRatio;
                layer.canvas.height = window.innerHeight * window.devicePixelRatio;
            }
        }
    }

    stop() {
        this.drawing = false;
    }
}