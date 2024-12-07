import * as workerPath from 'file-loader?name=[name].js!./renderworker';

/**
 * An entity with a custom `draw` function.
 */
export abstract class CustomRenderable {
    /**
     * Custom draw function invoked for each instance of the entity.
     * @param {OffscreenCanvasRenderingContext2D} ctx Canvas context for the current layer
     */
    abstract draw(ctx: OffscreenCanvasRenderingContext2D): void | Promise<void>;
}

interface LineRenderableLinear {
    readonly type: 'line';
    x: number;
    y: number;
}
interface LineRenderableArc {
    readonly type: 'arc';
    x: number;
    y: number;
    r: number;
}
interface LineRenderableQuad {
    readonly type: 'quad';
    x: number;
    y: number;
}

/**
 * A point in a `PathRenderable` that a straight line segment is drawn to from the previous point.
 */
export class LinearPoint implements LineRenderableLinear {
    readonly type: 'line' = 'line';
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}
/**
 * A point in a `PathRenderable` that an arc of radius `r` is drawn to from the previous
 * point to be tangent with the line between the next point and the control point.
 */
export class ArcPoint implements LineRenderableArc {
    readonly type: 'arc' = 'arc';
    x: number;
    y: number;
    r: number;
    constructor(x: number, y: number, r: number) {
        this.x = x;
        this.y = y;
        this.r = r;
    }
}
/**
 * A point in a `PathRenderable` that serves as a control point for a quadratic to be drawn
 * from the previous point to the next point.
 */
export class QuadPoint implements LineRenderableQuad {
    readonly type: 'quad' = 'quad';
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

/**
 * A simple entity that takes the form of continuous connected line segments, circular arcs, or quadratic arcs.
 */
export interface PathRenderable {
    /**Line/fill color */
    color: string;
    /**Whether to attempt to fill the shape or not */
    fill: boolean;
    /**List of coordinate points in the line */
    points: [LineRenderableLinear, ...(LineRenderableLinear | LineRenderableArc | LineRenderableQuad)[], LineRenderableLinear];
    /**Appearance of "joins" (where two segments meet) */
    join: CanvasLineJoin;
    /**Appearance of "caps" (where a segment ends) */
    cap: CanvasLineCap;
    /**Thickness of path lines (setting this to 0 skips the line) */
    lineWidth: number
    /**Line dash style (setting this to `[]` makes a solid line) */
    lineDash: number[]
    /**Whether to close the shape with a line back to the first point or not */
    close: boolean
}

export class PathRenderable {
    constructor(init: Partial<PathRenderable>) {
        this.color = init.color ?? '#000000';
        this.fill = init.fill ?? false;
        this.points = init.points ?? [new LinearPoint(0, 0), new LinearPoint(0, 0)];
        this.join = init.join ?? 'miter';
        this.cap = init.cap ?? 'butt';
        this.lineWidth = init.lineWidth ?? 1;
        this.lineDash = init.lineDash ?? [];
        this.close = init.close ?? false;
    }
}

/**
 * A simple entity that takes the form of a centered rectangle.
 */
export interface RectangleRenderable {
    /**X coordinate of center */
    x: number;
    /**Y coordinate of center */
    y: number;
    /**Width */
    width: number;
    /**Height */
    height: number;
    /**Angle in radians rotating counterclockwise */
    angle: number;
    /**Fill color */
    color: string;
    /**Outline color (has no effect if `lineWidth` is non-positive, leaving `undefined` disables outline) */
    stroke?: string;
    /**Width of outline (setting to 0 disables outline) */
    lineWidth: number;
}

export class RectangleRenderable {
    constructor(init: Partial<RectangleRenderable>) {
        this.x = init.x ?? 0;
        this.y = init.y ?? 0;
        this.width = init.width ?? 100;
        this.height = init.height ?? 100;
        this.angle = init.angle ?? 0;
        this.color = init.color ?? '#000000';
        this.stroke = init.stroke ?? '#000000';
        this.lineWidth = init.lineWidth ?? 0;
    }
}

/**
 * A simple entity that takes the form of a circle.
 */
export interface CircleRenderable {
    /**X coordinate of center */
    x: number;
    /**Y coordinate of center */
    y: number;
    /**Exterior radius */
    r: number;
    /**Fill color (leaving `undefined` disables fill) */
    fill?: string;
    /**Outline color (leaving `undefined` disables outline) */
    stroke?: string;
    /**Width of outline (setting to a non-positive value disables outline) */
    lineWidth: number;
    /**Line dash style (setting this to `[]` makes a solid line) */
    lineDash: number[]
}

export class CircleRenderable {
    constructor(init: Partial<CircleRenderable>) {
        this.x = init.x ?? 0;
        this.y = init.y ?? 0;
        this.r = init.r ?? 50;
        this.fill = init.fill;
        this.stroke = init.stroke;
        this.lineWidth = init.lineWidth ?? 4;
        this.lineDash = init.lineDash ?? [];
    }
}

/**
 * A simple entity that takes the form of some centered text.
 */
export interface TextRenderable {
    /**X coordinate of center */
    x: number;
    /**Y coordinate of center */
    y: number;
    /**Font size in pixels */
    size: number;
    /**Angle in radians rotating counterclockwise */
    angle: number;
    /**Color of text */
    color: string;
    /**Text string */
    text: string;
    /**Horizontal alignment of text */
    align: CanvasTextAlign;
    /**Turns the text draw mode from fill to stroke */
    stroke: boolean;
}

export class TextRenderable {
    constructor(init: Partial<TextRenderable>) {
        this.x = init.x ?? 0;
        this.y = init.y ?? 0;
        this.size = init.size ?? 11;
        this.angle = init.angle ?? 0;
        this.color = init.color ?? '#000000';
        this.text = init.text ?? 'Text';
        this.align = init.align ?? 'center';
        this.stroke = init.stroke ?? false;
    }
}

/**
 * A `RectangleRenderable` with a textured face instead of a solid fill.
 */
export interface TexturedRenderable extends Omit<RectangleRenderable, 'color' | 'outline'> {
    /**Texture index of the layer, cropped area will be scaled to fit size */
    texture?: ImageBitmap;
    /**Shift in texture pixels along the texture's X axis */
    shiftx: number;
    /**Shift in texture pixels along the texture's Y axis */
    shifty: number;
    /**Width of cropped texture area (texture spans from `shiftx` to `shiftx + cropx`) */
    cropx: number;
    /**Height of cropped texture area (texture spans from `shifty` to `shifty + cropy`) */
    cropy: number;
    /**If not same as width, controls the width of the drawn texture and repeats the texture to fill the object width */
    tileWidth: number;
    /**If not same as height, controls the height of the drawn texture and repeats the texture to fill the object height */
    tileHeight: number;
}

export class TexturedRenderable {
    constructor(init: Partial<TexturedRenderable>) {
        this.x = init.x ?? 0;
        this.y = init.y ?? 0;
        this.width = init.width ?? 100;
        this.height = init.height ?? 100;
        this.angle = init.angle ?? 0;
        this.texture = init.texture;
        this.shiftx = init.shiftx ?? 0;
        this.shifty = init.shifty ?? 0;
        this.cropx = init.cropx ?? this.width - this.shiftx;
        this.cropy = init.cropy ?? this.height - this.shifty;
        this.tileWidth = init.tileWidth ?? this.width;
        this.tileHeight = init.tileHeight ?? this.height;
    }
}

/**
 * A `TexturedRenderable` that simplifies animating textures by additionally shifting the cropping area along the X axis.
 */
export interface AnimatedTexturedRenderable extends TexturedRenderable {
    /**Amount of pixels along the X axis to shift for each frame */
    frameWidth: number;
    /**The current frame number of the animation */
    index: number;
}

export class AnimatedTexturedRenderable extends TexturedRenderable {
    constructor(init: Partial<AnimatedTexturedRenderable>) {
        super(init);
        this.frameWidth = init.frameWidth ?? this.width;
        this.index = init.index ?? 0;
    }
}

/**
 * A complex entity that contains subcomponents (other entities) parented to it, following its transform.
 */
export interface CompositeRenderable {
    /**X coordinate of center */
    x: number;
    /**Y coordinate of center */
    y: number;
    /**Angle in radians rotating counterclockwise */
    angle: number;
    /**
     * Subcomponents: `CustomRenderable` or `CustomReadRenderable` (depends on layer type),
     * `PathRenderable`, `RectangleRenderable`, `TextRenderable`, and subclasses
     */
    components: (CompositeRenderable | PathRenderable | RectangleRenderable | CircleRenderable | TexturedRenderable | TextRenderable)[]
}

export class CompositeRenderable {
    constructor(init: Partial<CompositeRenderable>) {
        this.x = init.x ?? 0;
        this.y = init.y ?? 0;
        this.angle = init.angle ?? 0;
        this.components = init.components ?? [];
    }
}

export class WebGLRectangleRenderable {
    x: number;
    y: number;
    width: number;
    height: number;
    angle: number;
    color: string;

    constructor(x: number, y: number, width: number, height: number, color: string, angle?: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.angle = angle ?? 0;
        this.color = color;
    }
}

export class WebGLTexturedRenderable extends WebGLRectangleRenderable {
    texture: number;

    constructor(x: number, y: number, width: number, height: number, texture: number, angle?: number) {
        super(x, y, width, height, '', angle);
        this.texture = texture;
    }
}

export class RenderEngineError extends Error {
    name: string = 'RenderEngineError';
}

/**
 * Describes the layers of the rendering pipeline from bottom to top.
 * 
 * * **`2d`**: Render in 2D to an `OffscreenCanvas`, using a Web `Worker`. Allows,
 * `PathRenderable`,  `RectangleRenderable`, `TextRenderable`, and `CompositeRenderable`
 * entities (includes subclasses like `TexturedRenderable`)
 * 
 * * **`webgl`**: Render in 3D or 2D to an `OffscreenCanvas`. Useful for large numbers of simple entities or 3D effects.
 * 
 * * **`custom`**: Render in 2D with direct canvas access. Only allows `CustomRenderable` entities.
 */
export type RenderEngineLayerDescriptors = ('2d' | 'webgl' | 'custom')[];

/**
 * Rendering pipeline descriptor to be followed for each frame. This is used to define the relationships
 * between different layers, like copying layers between each other with different composite operations.
 * 
 * Canvas `0` is always the rendering canvas - the one shown on screen.
 * 
 * Note that in order for entities drawn on a layer to be visible, it must eventually lead to a `target` of canvas `0`.
 */
export type RenderEngineInitPack<Descriptors extends RenderEngineLayerDescriptors> = {
    [Index in keyof Descriptors]: {
        /**The layer type, mirroring the type given in the `RenderEngineLayerDescriptors` of the `RenderEngine` constructor. */
        type: Descriptors[Index]
        /**The canvas to use - canvas `0` is always the main rendering canvas passed into the `RenderEngine` constructor. "custom"` layers cannot use this) */
        canvas: number
        /**Optionally change the CSS filter of entities drawn onto the layer. (default: none) */
        filter?: string
        /**Optionally change the composite operation of entities drawn onto the layer. (default: `'source-over'`) */
        compositing?: GlobalCompositeOperation
        /**The target canvas to paint the layer to after completion. Leaving this the same as the `canvas` property will cause the `RenderEngine` to skip the copying step. */
        target: number
        /**Optionally change the composite operation to use when copying the layer onto another canvas. (default: `'source-over'`) */
        targetCompositing?: GlobalCompositeOperation
        /**Whether to clear the canvas upon starting drawing on the layer. (default: `false`) */
        clear?: boolean
        /**Enable draw smoothing. This is useful when rendering lots of axis-aligned rectangles as smoothing is resource-intense. (default: `true`) */
        smoothing?: boolean
        /**Enable culling. This helps performance when there are lots of objects far from the screen. Disable this if large objects are disappearing from the screen. (default: `true`) */
        culling?: boolean
    }
};

export type RenderEngineLayerMetadata = {
    filter: string
    compositing: GlobalCompositeOperation
    targetCompositing: GlobalCompositeOperation
    clear: boolean
    smoothing: boolean
    culling: boolean
}

export type RenderEngineLayersMeta<Descriptors extends RenderEngineLayerDescriptors> = {
    [i in keyof Descriptors]: RenderEngineLayerMetadata
}

/**
 * Internal representation of layers, containing the canvases and contexts as well as layer information like target canvases.
 */
export type RenderEngineLayers<Descriptors extends RenderEngineLayerDescriptors> = {
    [i in keyof Descriptors]: ([{
        canvas: OffscreenCanvas
        ctx: OffscreenCanvasRenderingContext2D
    }, Descriptors[i] & ('2d' | 'custom')][0] | [{
        canvas: OffscreenCanvas
        ctx: WebGL2RenderingContext
    }, Descriptors[i] & 'webgl'][0]) & RenderEngineLayerMetadata & {
        targetCanvas: OffscreenCanvasRenderingContext2D | null
    }
};

/**
 * The frame data laid out in a similar way to the `RenderEngineLayerDescriptors`. Each layer's
 * index accepts an array of valid renderable entities to be drawn.
 */
export type RenderEngineFrameInput<Descriptors extends RenderEngineLayerDescriptors> = {
    [i in keyof Descriptors]:
    Descriptors[i] extends '2d' ? (PathRenderable | RectangleRenderable | CircleRenderable | TexturedRenderable | TextRenderable | CompositeRenderable)[] :
    Descriptors[i] extends 'webgl' ? (WebGLRectangleRenderable | WebGLTexturedRenderable)[] :
    CustomRenderable[]
};

/**
 * Viewport of the rendering engine defines the size and location of the visible (drawn) region.
 */
export interface RenderEngineViewport {
    /**X coordinate of the center of the viewport */
    x: number
    /**Y coordinate of the center of the viewport */
    y: number
    /**Angle in radians rotating counterclockwise */
    angle: number
    /**Width of the viewport */
    width: number
    /**Height of the viewport */
    height: number
    /**Scale factor of items drawn in viewport */
    scale: number
}

export type Stats = { readonly avg: number, readonly min: number, readonly max: number };

/**
 * Performance metrics of a `RenderEngine`
 */
export interface RenderEngineMetrics {
    readonly fps: number
    readonly fpsHistory: Stats
    readonly timings: {
        readonly total: Stats,
        readonly sort: Stats,
        readonly draw: Stats
    }
}

/**
 * Message events for communication between render worker and main thread.
 */
export enum RenderWorkerMessages {
    /**Worker -> Main | JS parsing finished and worker is ready */
    READY,
    /**Main -> Worker | Initialization pack, includes layer data */
    INIT,
    /**Worker -> Main | Initialization is done and worker is ready to process frames */
    INITREADY,
    /**Main -> Worker | New data for a frame */
    FRAMEDATA,
    /**Main -> Worker | Prompts worker to begin drawing a frame */
    FRAMETICK,
    /**Worker -> Main | Drawing was interrupted by a custom layer, canvas sent to main thread to draw on */
    FRAMEINTP,
    /**Main -> Worker | Custom layer drawing finished, canvas sent back to worker*/
    FRAMECONT,
    /**Worker -> Main | Drawing complete */
    FRAMEDONE,
    /**Worker -> Main | New performance metrics */
    METRICS
}

/**
 * Abstracted rendering engine with static typing and layers. Supports drawing rectangles, cirlces, complex line paths,
 * textures, and "composite entities". "Composite entities" are composed of multiple children that move with
 * the parent, allowing for easy creation of otherwise complex entities. WebGL can be used for drawing lots of
 * very similar objects or 3D effects.
 * 
 *  * **Example usage:**
 * ```
 * const canvas = document.createElement('canvas');
 * const renderer = new RenderEngine<['offscreen2d', 'offscreen2d', '2d']>(canvas, [
 *     {
 *         type: 'offscreen2d',
 *         canvas: 1,
 *         target: 1,
 *         clear: true
 *     },
 *     {
 *         type: 'offscreen2d',
 *         canvas: 1,
 *         target: 0
 *     },
 *     {
 *         type: '2d',
 *         canvas: 0,
 *         target: 0
 *     },
 * ]);
 * 
 * const texture = await createImageBitmap(mapImg);
 * renderer.sendFrame({ x: 200, y: 150, angle: 0, width: 400, height: 300 }, [
 *     [ new TexturedRenderable({ x: 200, y: 150, width: 400, height: 300, texture: texture }) ],
 *     [ player1, player2, ...arrows ],
 *     [ new PathRenderable({
 *         color: '#FFFF00',
 *         points: [
 *             { type: 'line', x: player1.x, y: player1.y },
 *             { type: 'quad', x: player1.x, y: player2.y },
 *             { type: 'line', x: player2.x, y: player2.y }
 *         ]
 *     }) ]
 * ]);
 * ```
 * A new `RenderEngine` is instantiated using a new canvas, with static layers `offscreen2d`, `offscreen2d`, and `2d`.
 * The first two layers use canvas `1`, an `OffscreenCanvas`. The first layer has a texture created from an existing
 * image `mapImg`, and clears its canvas before starting drawing. The second canvas draws on the same canvas as the
 * first layer, then copies its contents to the main canvas (canvas `0`) before the third layer draws on the main canvas.
 * 
 * Finally, a frame is sent to the `RenderEngine` with the viewport positioned at (200, 150) using a `TexturedRenderable`
 * showing texture `0` - the `mapImg`, scaled to 400x300 pixels, lined up with the viewport. Two players are drawn
 * (they are of classes extending `RectangleRenderable`) and a list called `arrows` is also passed in (also of classes
 * extending `TexturedRenderable`). The final layer draws a yellow quadratic curve between `player1` and `player2`,
 * with the control point being a mix of their coordinates.
 */
export class RenderEngine<LayerDescriptors extends RenderEngineLayerDescriptors> {
    private readonly baseCanvas: HTMLCanvasElement;
    private readonly worker: Worker;
    private readonly layers: RenderEngineLayersMeta<LayerDescriptors>;
    private readonly frame: RenderEngineFrameInput<LayerDescriptors> = [] as RenderEngineFrameInput<LayerDescriptors>;
    private readonly viewport: RenderEngineViewport = {
        x: 0,
        y: 0,
        angle: 0,
        width: 0,
        height: 0,
        scale: 1
    };
    private readonly auxCanvas: OffscreenCanvas;
    private readonly auxCtx: OffscreenCanvasRenderingContext2D;

    readonly readyPromise: Promise<void>;
    private isReady: boolean = false;

    private cullDist = 0;
    private fr: number = 60;
    private drawing: boolean = true;

    /**
     * @param {HTMLCanvasElement} baseCanvas Visible canvas to use as canvas `0`
     * @param {RenderEngineInitPack} layers Layer data following the `RenderEngineLayerDescriptors` given
     */
    constructor(baseCanvas: HTMLCanvasElement, layers: RenderEngineInitPack<LayerDescriptors>) {
        this.baseCanvas = baseCanvas;
        this.layers = layers.map<RenderEngineLayerMetadata>((layer) => ({
            compositing: layer.compositing ?? 'source-over',
            filter: layer.filter ?? '',
            targetCompositing: layer.targetCompositing ?? 'source-over',
            clear: layer.clear ?? false,
            smoothing: layer.smoothing ?? true,
            culling: layer.culling ?? true
        })) as RenderEngineLayersMeta<LayerDescriptors>;
        // create and set up worker
        this.worker = new Worker(workerPath);
        let workerPromiseResolve: () => void = () => { };
        this.readyPromise = new Promise((resolve) => workerPromiseResolve = resolve);
        this.worker.onmessage = (e) => {
            if (e.data[0] == RenderWorkerMessages.READY) {
                this.worker.onmessage = (e) => {
                    if (e.data[0] == RenderWorkerMessages.INITREADY) {
                        workerPromiseResolve();
                        this.worker.onmessage = this.handleWorkerMessage;
                    } else {
                        throw new RenderEngineError('Unexpected worker message ' + e.data[0]);
                    }
                };
                const offscreenCanvas = this.baseCanvas.transferControlToOffscreen();
                this.worker.postMessage([RenderWorkerMessages.INIT, offscreenCanvas, layers], [offscreenCanvas]);
            } else {
                throw new RenderEngineError('Unexpected worker message ' + e.data[0]);
            }
        };
        this.worker.onerror = (err) => {
            console.error(err);
            this.worker.terminate();
            throw new RenderEngineError(err.error);
        };
        this.worker.onmessageerror = (err) => {
            console.error(err);
            this.worker.terminate();
            throw new RenderEngineError(err.data);
        };
        this.readyPromise.then(() => this.isReady = true);
        // create aux canvas
        this.auxCanvas = new OffscreenCanvas(1, 1);
        this.auxCtx = this.auxCanvas.getContext('2d')!;
        // start draw loop
        const startDraw = async () => {
            while (this.drawing) {
                const start = performance.now();
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
    }

    get ready(): boolean {
        return this.isReady;
    }

    /**
     * Attempted refresh rate of the renderer, may be slower due to device performance
     */
    set framerate(fr: number) {
        if (fr <= 0) throw new RenderEngineError('Framerate cannot be zero or negative');
        this.fr = fr;
    }
    get framerate(): number {
        return this.fr;
    }

    /**
     * Culling distance controls what entities are skipped for rendering. Entities who's positions
     * that are more than this distance away from the viewport box.
     * 
     * Culling can be disabled using the `culling` option in layers using {@link RenderEngineInitPack}.
     */
    set cullDistance(dist: number) {
        if (dist < 0) throw new RenderEngineError('Cannot have negative culling distance');
        this.cullDist = dist;
    }
    get cullDistance() {
        return this.cullDist;
    }

    private frameCompletionResolve: () => void = () => { };
    private handleWorkerMessage(e: MessageEvent<[RenderWorkerMessages, ...any[]]>): void {
        switch (e.data[0]) {
            case RenderWorkerMessages.FRAMEINTP:
                this.drawCustomLayer(e.data[1], e.data[2]);
                break;
            case RenderWorkerMessages.FRAMEDONE:
                this.frameCompletionResolve();
                break;
            case RenderWorkerMessages.METRICS:
                this.storedMetrics = e.data[1];
                break;
            default:
                throw new RenderEngineError('Unmatched worker message ' + e.data[0]);
        }
    }

    /**
     * Send a new frame to the `RenderEngine`. This frame data will be held until the next call to `sendFrame`.
     * Calling this does not cause a frame to be drawn. It is recommended to **reuse** renderables across frames
     * for performance, especially with lots of textures.
     * 
     * Sends a copy of the entities to the render worker, flattining the tree and culling entities outside the viewport first.
     * @param {RenderEngineViewport} viewport Viewport information
     * @param {RenderEngineFrameInput} entities Entities to draw on each layer, following the `RenderEngineLayerDescriptors` given
     */
    sendFrameData(viewport: RenderEngineViewport, entities: RenderEngineFrameInput<LayerDescriptors>): void {
        this.viewport.x = viewport.x;
        this.viewport.y = viewport.y;
        this.viewport.angle = viewport.angle;
        // resize the base canvas
        if (this.viewport.width != viewport.width || this.viewport.height != viewport.height) {
            this.viewport.width = viewport.width;
            this.viewport.height = viewport.height;
            this.auxCanvas.width = this.viewport.width;
            this.auxCanvas.height = this.viewport.height;
        }
        // new entities
        this.frame.length = 0;
        this.frame.push(...entities);
        const entityData: RenderEngineFrameInput<LayerDescriptors> = entities.map((layer) => {
            // const entities = [];
            return [];
        }) as RenderEngineFrameInput<LayerDescriptors>;
        // send to worker
        this.worker.postMessage([RenderWorkerMessages.FRAMEDATA, this.viewport, entityData]);
    }

    private readonly nextFrameCallbacks: Set<() => any> = new Set();
    private readonly frameCallbacks: Set<() => any> = new Set();
    private readonly nextFramePromises: Set<() => void> = new Set();

    /**
     * Draws the next frame. Prompts the worker to draw the frame, and custom layers are handled by {@link drawCustomLayer}.
     * Will wait for the frame to complete before resolving promises.
     */
    private async drawFrame() {
        // before frame callbacks first
        await Promise.all([...Array.from(this.nextFrameCallbacks), ...Array.from(this.frameCallbacks)].map((cb) => {
            try {
                return cb();
            } catch (err) {
                return;
            }
        }));
        this.nextFrameCallbacks.clear();
        // send frame tick event
        this.worker.postMessage([RenderWorkerMessages.FRAMETICK]);
        // interrupted frames will be handled via drawCustomLayer
        // wait for frame completion event
        await new Promise<void>((resolve) => this.frameCompletionResolve = resolve);
        // resolve next frame promises
        this.nextFramePromises.forEach((resolve) => resolve());
        this.nextFramePromises.clear();
    }

    /**
     * Draws a custom layer when the worker is interrupted by one. Recieves the canvas data of the
     * layer canvas, draws atop it, and 
     * @param canvasData 
     * @param layer 
     */
    private async drawCustomLayer(canvasData: ImageBitmap, layer: keyof LayerDescriptors) {
        this.auxCtx.reset();
        this.auxCtx.drawImage(canvasData, 0, 0);
        const entities = this.frame[layer] as CustomRenderable[];
        for (const entity of entities) {
            try {
                entity.draw(this.auxCtx);
            } catch (err) {
                throw new RenderEngineError(err as any);
            }
        }
        const img = await createImageBitmap(this.auxCanvas);
        this.worker.postMessage([RenderWorkerMessages.FRAMECONT, img], [img]);
    }

    /**
     * Add a callback function to run before the next frame is drawn. Can be an `async` function.
     * @param cb Callback function (**`async` functions with a long resolve time will block frames!)
     */
    onBeforeNextFrame(cb: () => any): void {
        this.nextFrameCallbacks.add(cb);
    }

    /**
     * Add a callback function to run before a frame is drawn. Can be an `async` function.
     * @param cb Callback function (**`async` functions with a long resolve time will block frames!)
     */
    onBeforeFrame(cb: () => any): void {
        this.frameCallbacks.add(cb);
    }

    /**
     * Remove a previously added callback function that ran before each frame was drawn.
     * @param cb Callback function to remove
     * @returns If the callback function was previously added and is now removed
     */
    offBeforeFrame(cb: () => any): boolean {
        return this.frameCallbacks.delete(cb);
    }

    /**
     * Returns a `Promise` that resolves to `undefined` upon completion of drawing the next frame.
     */
    async nextFrame(): Promise<void> {
        await new Promise<void>((resolve) => this.nextFramePromises.add(resolve));
    }

    private storedMetrics: RenderEngineMetrics = {
        fps: 0,
        fpsHistory: { avg: 0, min: 0, max: 0 },
        timings: {
            total: { avg: 0, min: 0, max: 0 },
            sort: { avg: 0, min: 0, max: 0 },
            draw: { avg: 0, min: 0, max: 0 }
        }
    };
    /**
     * Performance metrics like framerates
     */
    get metrics(): RenderEngineMetrics {
        return this.storedMetrics;
    }

    /**
     * Stop all refreshing of the rendering context PERMANENTLY.
     */
    stop() {
        this.drawing = false;
        this.worker.terminate();
    }
}

export const createTextureFromFunction = async (width: number, height: number, cb: (ctx: CanvasRenderingContext2D) => any): Promise<ImageBitmap> => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    await cb(ctx!);
    return await createImageBitmap(canvas);
};

export default RenderEngine;