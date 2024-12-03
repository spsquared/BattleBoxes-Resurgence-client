import { type RenderEngineLayerDescriptors, type RenderEngineFrameInput, type RenderEngineViewport, RenderEngineError, type RenderEngineLayers } from "./renderer";

export enum RenderWorkerMessages {
    /**Main -> Worker | Initialization pack, includes layer data */
    INIT,
    /**Worker -> Main | Initialization is done and worker is ready to process frames */
    INITREADY,
    /**Main -> Worker | New data for a frame */
    FRAMEDATA,
    /**Main -> Worker | Prompts worker to begin drawing a frame */
    FRAMETICK,
    /**Worker -> Main | Drawing was interrupted by a custom layer and main thread */
    FRAMEINTP,
    /**Main -> Worker | Custom layer*/
    FRAMECONT,

    METRICS
}

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
    constructor(layers: RenderEngineInitPack<LayerDescriptors>) {
        // create canvases from layers
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
        postMessage([]);
    }
}

// when instantiating
new RenderEngineWorker<any>();