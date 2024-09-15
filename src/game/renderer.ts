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
    /**X coordinate */
    abstract readonly x: number;
    abstract readonly y: number;
    abstract readonly width: number;
    abstract readonly height: number;
    abstract readonly angle: number;
    abstract readonly color: string;
}

/**
 * 
 */
export abstract class TextRenderable {
    abstract readonly x: number;
    abstract readonly y: number;
    abstract readonly size: number;
    abstract readonly angle: number;
    abstract readonly color: string;
    abstract readonly text: string;
}

export abstract class TexturedRenderable extends RectangleRenderable {
    abstract readonly texture: number;
    abstract readonly shiftx: number;
    abstract readonly shifty: number;
    abstract readonly cropx: number;
    abstract readonly cropy: number;
}

export abstract class AnimatedTexturedRenderable extends TextRenderable {
    abstract readonly frameWidth: number;
    abstract readonly index: number;
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
    [(CustomReadRenderable | RectangleRenderable | TextRenderable)[], Descriptors[Index] & '2d'][0] |
    [(CustomRenderable | RectangleRenderable | TextRenderable)[], Descriptors[Index] & 'offscreen2d'][0] |
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
        const twoPi = 2 * Math.PI;
        for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];
            const canvas = layer.canvas;
            const ctx = layer.ctx;
            const textures = layer.textures;
            if (ctx instanceof CanvasRenderingContext2D || ctx instanceof OffscreenCanvasRenderingContext2D) {
                const renderables = this.frame[i] as (CustomRenderable | CustomReadRenderable | RectangleRenderable | TextRenderable)[];
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
                    if (ctx instanceof CanvasRenderingContext2D && entity instanceof CustomReadRenderable) {
                        entity.draw(ctx, textures.slice());
                    } else if (ctx instanceof OffscreenCanvasRenderingContext2D && entity instanceof CustomRenderable) {
                        entity.draw(ctx, textures.slice());
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
                        continue;
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
                    } else if (entity instanceof RectangleRenderable) {
                        const arr = buckets.get(entity.color);
                        if (arr == undefined) buckets.set(entity.color, [[entity], []]);
                        else arr[0].push(entity);
                    } else if (entity instanceof TextRenderable) {
                        const arr = buckets.get(entity.color);
                        if (arr == undefined) buckets.set(entity.color, [[], [entity]]);
                        else arr[1].push(entity);
                    } else {
                        console.warn('Unrecognizable entity in pipeline, discarding!');
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