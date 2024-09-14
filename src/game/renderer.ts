// graphics engine


export abstract class CustomRenderable {
    abstract draw(ctx: OffscreenCanvasRenderingContext2D): void;
}

export abstract class RectangleRenderable {
    abstract readonly x: number;
    abstract readonly y: number;
    abstract readonly width: number;
    abstract readonly height: number;
    abstract readonly angle: number;
    abstract readonly color: string;
}

export abstract class TexturedRenderable extends RectangleRenderable {
    abstract readonly texture: number;
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

export class RenderingEngineError extends Error {
    name: string = 'RenderingEngineError';
}

export type CanvasLayerDescriptors = {
    type: 'direct' | 'offscreen' | 'webgl' | 'webgl3d',
    textures: ImageBitmap[]
}[];

export type CanvasLayers<Descriptors extends CanvasLayerDescriptors> = {
    [Index in keyof Descriptors]: {
        type: Descriptors[Index]['type'] & 'direct'
        canvas: HTMLCanvasElement
        ctx: CanvasRenderingContext2D
    } | {
        type: Descriptors[Index]['type'] & 'offscreen'
        canvas: OffscreenCanvas
        ctx: OffscreenCanvasRenderingContext2D
    } | {
        type: Descriptors[Index]['type'] & 'webgl'
        canvas: OffscreenCanvas
        ctx: WebGL2RenderingContext
    } | {
        type: Descriptors[Index]['type'] & 'webgl3d'
        canvas: OffscreenCanvas
        ctx: WebGL2RenderingContext
    }
};

export type LayeredEntities<Descriptors extends CanvasLayerDescriptors> = {
    [Index in keyof Descriptors]: (Descriptors[Index]['type'] & 'direct') extends never ? ((Descriptors[Index]['type'] & 'offscreen') extends never ? ((Descriptors[Index]['type'] & 'webgl') extends never ? (never[]) : WebGLRectangleRenderable[]) : (CustomRenderable | RectangleRenderable)[]) : RectangleRenderable[]
}

export default class RenderingEngine<LayerDescriptors extends CanvasLayerDescriptors> {
    private readonly canvas: HTMLCanvasElement;

    private fr: number = 60;
    private readonly layers: CanvasLayers<LayerDescriptors>;
    private drawing: boolean = true;

    constructor(canvas: HTMLCanvasElement, layers: LayerDescriptors) {
        this.canvas = canvas;
        for (const layer of layers) {
            layer.type
        }
        this.layers = layers.map((layer) => {
            const canvas = layer.type == 'direct' ? this.canvas : new OffscreenCanvas(window.innerWidth, window.innerHeight);
            const ctx = (layer.type == 'direct' || layer.type == 'offscreen') ? canvas.getContext('2d') : canvas.getContext('webgl2');
            if (ctx === null) throw new RenderingEngineError(`${(layer.type == 'direct' || layer.type == 'offscreen') ? 'Canvas' : 'WebGL2'} context is not supported`);
            return {
                type: layer.type,
                canvas: canvas,
                ctx: ctx
            };
        }) as CanvasLayers<LayerDescriptors>;

        // start draw loop
        const startDraw = async () => {
            while (this.drawing) {
                await new Promise<void>((resolve) => {
                    window.requestAnimationFrame(async () => {
                        await this.drawFrame();
                        resolve();
                    });
                });
            }
        };
        startDraw();
        window.addEventListener('resize', () => this.updateResolution(), { passive: true });
        window.addEventListener('load', () => this.updateResolution());
    }

    set framerate(fr: number) {
        if (fr < 0) throw new RenderingEngineError('Framerate cannot be negative');
        this.fr = fr;
    }
    get framerate(): number {
        return this.fr;
    }

    sendFrame(entities: LayeredEntities<LayerDescriptors>) {
        console.log(entities);
    }

    // setLayers(layers: ('direct' | 'offscreen2d' | 'webgl2')[]): void {
    //     this.layers.length = 0;
    //     for (const layer of layers) {
    //         if (layer == 'direct') {
    //             config.layers.push({ canvas: canvas, ctx: ctx });
    //         } else if (layer == 'offscreen2d') {
    //             const offscreenCanvas = new OffscreenCanvas(window.innerWidth, window.innerHeight);
    //             const offscreenCanvas2dContext = offscreenCanvas.getContext('2d');
    //             if (offscreenCanvas2dContext === null) throw new RenderingEngineError('2d rendering context offscreen not supported');
    //             config.layers.push({ canvas: offscreenCanvas, ctx: offscreenCanvas2dContext });
    //         } else {
    //             const offscreenCanvas = new OffscreenCanvas(window.innerWidth, window.innerHeight);
    //             const offscreenCanvasWebglContext = offscreenCanvas.getContext('webgl2');
    //             if (offscreenCanvasWebglContext === null) throw new RenderingEngineError('WebGL2 rendering context offscreen not supported');
    //             config.layers.push({ canvas: offscreenCanvas, ctx: offscreenCanvasWebglContext });
    //             throw new RenderingEngineError('WebGL rendering not implemented');
    //             // TODO: create and compile shaders
    //         }
    //     }
    //     updateResolution();
    // }

    // // yeet this
    // sendFrame(layers: (CustomRenderable[] | RectangleRenderable[] | WebGLRectangleRenderable[])[]): void {
    //     if (layers.length != config.layers.length) throw new RenderingEngineError('Mismatched rendering layers: layer count mismatched');
    //     for (const i in config.layers) {
    //         const canvas = config.layers[i].canvas;
    //         const ctx = config.layers[i].ctx;
    //         const entities = layers[i];
    //         if (ctx instanceof CanvasRenderingContext2D) {
    //             const rectangles = entities.filter((entity) => entity instanceof RectangleRenderable);
    //             const customEntities = entities.filter((entity) => entity instanceof CustomRenderable);
    //             if (rectangles.length + customEntities.length != entities.length) console.warn(new RenderingEngineError('Invalid entities present in "direct" layer, these will not be drawn!'));
    //         } else if (ctx instanceof OffscreenCanvasRenderingContext2D) {
    //             const rectangles = entities.filter((entity) => entity instanceof RectangleRenderable);
    //             if (rectangles.length != entities.length) console.warn(new RenderingEngineError('Invalid entities present in "offscreen2d" layer, these will not be drawn!'));
    //         } else if (ctx instanceof WebGL2RenderingContext) {
    //             throw new RenderingEngineError('WebGL rendering not implemented');
    //             const rectangles = entities.filter((entity) => entity instanceof WebGLRectangleRenderable);
    //         }
    //     }
    // }

    private drawFrame() {

    }

    private updateResolution() {
        for (const layer of this.layers) {
            if (layer.canvas != this.canvas) {
                layer.canvas.width = window.innerWidth;
                layer.canvas.height = window.innerHeight;
            }
        }
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    stop() {
        this.drawing = false;
    }
}