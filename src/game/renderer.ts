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
    abstract readonly texture: ImageBitmap;
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
    abstract readonly texture: ImageBitmap;
}

export class RenderingEngineError extends Error {
    name: string = 'RenderingEngineError';
}

const canvasRoot = document.getElementById('canvasRoot');
if (canvasRoot === null) throw new RenderingEngineError('Canvas root was not found');
Array.from(canvasRoot.childNodes).forEach((node) => canvasRoot.removeChild(node));
const canvas = document.createElement('canvas');
const canvas2dContext = canvas.getContext('2d');
if (canvas2dContext === null) throw new RenderingEngineError('2d rendering context not supported');
const ctx = canvas2dContext; // stops eslint weirdness

const updateResolution = () => {
    for (const layer of config.layers) {
        if (layer.canvas != canvas) {
            layer.canvas.width = window.innerWidth;
            layer.canvas.height = window.innerHeight;
        }
    }
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
};

interface CanvasLayer<Canvas, Context> {
    readonly canvas: Canvas,
    readonly ctx: Context
}

// export interface CanvasLayerDescriptor

const config: {
    framerate: number
    layers: (CanvasLayer<HTMLCanvasElement, CanvasRenderingContext2D> | CanvasLayer<OffscreenCanvas, OffscreenCanvasRenderingContext2D> | CanvasLayer<OffscreenCanvas, WebGL2RenderingContext>)[]
} = {
    framerate: 60,
    layers: []
};

export default class RenderingEngine {
    static set framerate(fr: number) {
        if (this.framerate < 0) throw new RenderingEngineError('Framerate cannot be negative');
        config.framerate = fr;
    }
    static get framerate(): number {
        return config.framerate;
    }

    static setLayers(layers: ('direct' | 'offscreen2d' | 'webgl2')[]): void {
        config.layers = [];
        for (const layer of layers) {
            if (layer == 'direct') {
                config.layers.push({ canvas: canvas, ctx: ctx });
            } else if (layer == 'offscreen2d') {
                const offscreenCanvas = new OffscreenCanvas(window.innerWidth, window.innerHeight);
                const offscreenCanvas2dContext = offscreenCanvas.getContext('2d');
                if (offscreenCanvas2dContext === null) throw new RenderingEngineError('2d rendering context offscreen not supported');
                config.layers.push({ canvas: offscreenCanvas, ctx: offscreenCanvas2dContext });
            } else {
                const offscreenCanvas = new OffscreenCanvas(window.innerWidth, window.innerHeight);
                const offscreenCanvasWebglContext = offscreenCanvas.getContext('webgl2');
                if (offscreenCanvasWebglContext === null) throw new RenderingEngineError('WebGL2 rendering context offscreen not supported');
                config.layers.push({ canvas: offscreenCanvas, ctx: offscreenCanvasWebglContext });
                throw new RenderingEngineError('WebGL rendering not implemented');
                // TODO: create and compile shaders
            }
        }
        updateResolution();
    }

    static sendFrame(layers: (CustomRenderable[] | RectangleRenderable[] | WebGLRectangleRenderable[])[]): void {
        if (layers.length != config.layers.length) throw new RenderingEngineError('Mismatched rendering layers: layer count mismatched');
        for (const i in config.layers) {
            const canvas = config.layers[i].canvas;
            const ctx = config.layers[i].ctx;
            const entities = layers[i];
            if (ctx instanceof CanvasRenderingContext2D) {
                const rectangles = entities.filter((entity) => entity instanceof RectangleRenderable);
                const customEntities = entities.filter((entity) => entity instanceof CustomRenderable);
                if (rectangles.length + customEntities.length != entities.length) console.warn(new RenderingEngineError('Invalid entities present in "direct" layer, these will not be drawn!'));
            } else if (ctx instanceof OffscreenCanvasRenderingContext2D) {
                const rectangles = entities.filter((entity) => entity instanceof RectangleRenderable);
                if (rectangles.length != entities.length) console.warn(new RenderingEngineError('Invalid entities present in "offscreen2d" layer, these will not be drawn!'));
            } else if (ctx instanceof WebGL2RenderingContext) {
                throw new RenderingEngineError('WebGL rendering not implemented');
                const rectangles = entities.filter((entity) => entity instanceof WebGLRectangleRenderable);
            }
        }
    }
}

canvasRoot.appendChild(canvas);

const drawFrame = async () => {
};
const startDraw = async () => {
    while (true) {
        await new Promise<void>((resolve) => {
            window.requestAnimationFrame(async () => {
                await drawFrame();
                resolve();
            });
        });
    }
};
window.addEventListener('load', startDraw);

window.addEventListener('resize', () => updateResolution(), { passive: true });
window.addEventListener('load', () => updateResolution());