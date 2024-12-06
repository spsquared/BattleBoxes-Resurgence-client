import {
    CompositeRenderable, RectangleRenderable, RenderEngineError, RenderWorkerMessages,
    TextRenderable, TexturedRenderable
} from './renderer';

import type {
    RenderEngineFrameInput, Stats, RenderEngineInitPack, RenderEngineLayerDescriptors, RenderEngineLayers, RenderEngineViewport
} from './renderer';

/**
 * Worker thread that runs rendering in a separate thread. The main thread creates a worker for each `RenderEngine`
 * and initializes its layers. Updated frame data is sent to workers by creating and transfering a tree with the
 * minimum amount of data, as to not copy external instance data from entities.
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
            const targetCtx = targetCanvas.getContext('2d');
            if (targetCtx === null) throw new RenderEngineError('OffscreenCanvas2D context is not supported');
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
                const ctx = canvas.getContext('2d');
                if (ctx === null) throw new RenderEngineError('OffscreenCanvas2D context is not supported');
                this.layers.push({
                    canvas: canvas,
                    ctx: ctx,
                    ...layerProps
                });
            } else if (layer.type == 'webgl') {
                const canvas = canvases[layer.canvas];
                const ctx = canvas.getContext('webgl2');
                if (ctx === null) throw new RenderEngineError('WebGL2 context is not supported');
                this.layers.push({
                    canvas: canvas,
                    ctx: ctx,
                    ...layerProps
                });
            }
        }
        // create aux canvas
        this.auxCanvas = new OffscreenCanvas(1, 1);
        const auxCtx = this.auxCanvas.getContext('2d');
        if (auxCtx == null) throw new RenderEngineError('OffscreenCanvas2D context is not supported');
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
    }

    handleWorkerMessage(e: MessageEvent<[RenderWorkerMessages, ...any[]]>): void {
        switch (e.data[0]) {
            case RenderWorkerMessages.FRAMEDATA:
                break;
            case RenderWorkerMessages.FRAMETICK:
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
        const renderWorker = new RenderEngineWorker<any>(e.data[1], e.data[2]);
        self.onmessage = renderWorker.handleWorkerMessage;
    } else {
        throw new RenderEngineError('Unexpected worker message ' + e.data[0]);
    }
};

postMessage([RenderWorkerMessages.READY]);