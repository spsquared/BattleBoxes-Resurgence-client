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
    /**Fill or stroke color */
    color: string;
    /**Switch rendering to outline rather than fill (setting to 0 retains fill appearance, while non-zero values control outline thickness) */
    outline: number;
}

export class RectangleRenderable {
    constructor(init: Partial<RectangleRenderable>) {
        this.x = init.x ?? 0;
        this.y = init.y ?? 0;
        this.width = init.width ?? 100;
        this.height = init.height ?? 100;
        this.angle = init.angle ?? 0;
        this.color = init.color ?? '#000000';
        this.outline = init.outline ?? 0;
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
    /**Outline color (leaving empty disables outline) */
    stroke: string;
    /**Fill color (leaving empty disables fill) */
    fill: string;
    /**Width of outline (setting to 0 disables outline) - positive values draw outlines *inside* the radius, negative values draw outlines *outside* the radius */
    lineWidth: number;
}

export class CircleRenderable {
    constructor(init: Partial<CircleRenderable>) {
        this.x = init.x ?? 0;
        this.y = init.y ?? 0;
        this.r = init.r ?? 50;
        this.stroke = init.stroke ?? '#000000';
        this.fill = init.fill ?? '#000000';
        this.lineWidth = init.lineWidth ?? 4;
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
    }
}

/**
 * A `RectangleRenderable` with a textured face instead of a solid fill.
 */
export interface TexturedRenderable extends Omit<RectangleRenderable, 'color' | 'outline'> {
    /**Texture index of the layer, cropped area will be scaled to fit size */
    texture: number;
    /**Shift in texture pixels along the texture's X axis */
    shiftx: number;
    /**Shift in texture pixels along the texture's Y axis */
    shifty: number;
    /**Width of cropped texture area (texture spans from `shiftx` to `shiftx + cropx`) */
    cropx: number;
    /**Height of cropped texture area (texture spans from `shifty` to `shifty + cropy`) */
    cropy: number;
}

export class TexturedRenderable {
    constructor(init: Partial<TexturedRenderable>) {
        this.x = init.x ?? 0;
        this.y = init.y ?? 0;
        this.width = init.width ?? 100;
        this.height = init.height ?? 100;
        this.angle = init.angle ?? 0;
        this.texture = init.texture ?? 0;
        this.shiftx = init.shiftx ?? 0;
        this.shifty = init.shifty ?? 0;
        this.cropx = init.cropx ?? this.width - this.shiftx;
        this.cropy = init.cropy ?? this.height - this.shifty;
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
export interface CompositeRenderable<CustomEntity extends CustomRenderable | CustomReadRenderable> {
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
    components: (CompositeRenderable<CustomEntity> | CustomEntity | PathRenderable | RectangleRenderable | CircleRenderable | TexturedRenderable | TextRenderable)[]
}

export class CompositeRenderable<CustomEntity extends CustomRenderable | CustomReadRenderable> {
    constructor(init: Partial<CompositeRenderable<CustomEntity>>) {
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
 * * **`2d`**: Render in 2D to a `HTMLCanvasElement`, using a Web `Worker`. Allows `CustomReadRenderable`,
 * `PathRenderable`,  `RectangleRenderable`, `TextRenderable`, and `CompositeRenderable<CustomReadRenderable>`
 * entities (includes subclasses like `TexturedRenderable`)
 * 
 * * **`offscreen2d`**: Render in 2D to an `OffscreenCanvas`, using a Web `Worker`. Allows `CustomRenderable`,
 * `PathRenderable`,  `RectangleRenderable`, `TextRenderable`, and `CompositeRenderable<CustomRenderable>`
 * entities (includes subclasses like `TexturedRenderable`)
 * 
 * * **`webgl`**: Render in 3D or 2D to an `OffscreenCanvas`. Useful for large numbers of simple entities or 3D effects.
 */
export type RenderEngineLayerDescriptors = ('2d' | 'offscreen2d' | 'webgl')[];

/**
 * Rendering pipeline descriptor to be followed for each frame. This is used to define the relationships
 * between different layers, like copying layers between each other, and defining textures available in each layer.
 * 
 * Canvas `0` is always the rendering canvas - the one shown on screen.
 * 
 * Note that in order for entities drawn on a layer to be visible, it must eventually lead to a `target` of canvas `0`.
 */
export type RenderEngineInitPack<Descriptors extends RenderEngineLayerDescriptors> = {
    [Index in keyof Descriptors]: {
        /**The layer type, mirroring the type given in the `RenderEngineLayerDescriptors` of the `RenderEngine` constructor. */
        type: Descriptors[Index]
        /**The canvas to use - canvas `0` is always the main rendering canvas passed into the `RenderEngine` constructor. */
        canvas: number
        /**Optionally change the composite operation of entities drawn onto the layer. */
        compositing?: GlobalCompositeOperation
        /**The target canvas to paint the layer to after completion. Leaving this the same as the `canvas` property will cause the `RenderEngine` to skip the copying step. */
        target: number
        /**Optionally change the composite operation to use when copying the layer onto another canvas. (default: `'source-over'`) */
        targetCompositing?: GlobalCompositeOperation
        /**List of textures available to this layer. They can later be accessed by their index through entities. */
        textures: ImageBitmap[]
        /**Whether to clear the canvas upon starting drawing on the layer. (default: `false`) */
        clear?: boolean
        /**Enable draw smoothing. This is useful when rendering lots of axis-aligned rectangles as smoothing is resource-intense. (default: `true`) */
        smoothing?: boolean
        /**Enable culling. This helps performance when there are lots of objects far from the screen. Disable this if large objects are disappearing from the screen. (default: `true`) */
        culling?: boolean
    }
};

/**
 * Internal representation of layers, containing the canvases and contexts as well as layer information like
 * target canvases and texture maps.
 */
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
        compositing: GlobalCompositeOperation
        targetCanvas: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
        targetCompositing: GlobalCompositeOperation
        clear: boolean
        smoothing: boolean
        culling: boolean
        textures: ImageBitmap[]
    }
};

/**
 * The frame data laid out in a similar way to the `RenderEngineLayerDescriptors`. Each layer's
 * index accepts an array of valid renderable entities to be drawn.
 */
export type RenderEngineFrameInput<Descriptors extends RenderEngineLayerDescriptors> = {
    [Index in keyof Descriptors]:
    [(CustomReadRenderable | PathRenderable | RectangleRenderable | CircleRenderable | TexturedRenderable | TextRenderable | CompositeRenderable<CustomReadRenderable>)[], Descriptors[Index] & '2d'][0] |
    [(CustomRenderable | PathRenderable | RectangleRenderable | CircleRenderable | TexturedRenderable | TextRenderable | CompositeRenderable<CustomRenderable>)[], Descriptors[Index] & 'offscreen2d'][0] |
    [(WebGLRectangleRenderable | WebGLTexturedRenderable)[], Descriptors[Index] & 'webgl'][0]
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

type Stats = { readonly avg: number, readonly min: number, readonly max: number };

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
 *         textures: [await createImageBitmap(mapImg)],
 *         clear: true
 *     },
 *     {
 *         type: 'offscreen2d',
 *         canvas: 1,
 *         target: 0,
 *         textures: []
 *     },
 *     {
 *         type: '2d',
 *         canvas: 0,
 *         target: 0,
 *         textures: []
 *     },
 * ]);
 * renderer.sendFrame({ x: 200, y: 150, angle: 0, width: 400, height: 300 }, [
 *     [ new TexturedRenderable({ x: 200, y: 150, width: 400, height: 300, texture: 0 }) ],
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
export default class RenderEngine<LayerDescriptors extends RenderEngineLayerDescriptors> {
    private readonly baseCanvas: HTMLCanvasElement;
    private readonly frame: RenderEngineFrameInput<LayerDescriptors> = [] as RenderEngineFrameInput<LayerDescriptors>;
    private readonly viewport: RenderEngineViewport = {
        x: 0,
        y: 0,
        angle: 0,
        width: 0,
        height: 0,
        scale: 1
    };

    private cullDist = 500;
    private fr: number = 60;
    private readonly layers: RenderEngineLayers<LayerDescriptors>;
    private drawing: boolean = true;
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
     * @param {HTMLCanvasElement} baseCanvas Visible canvas to use as canvas `0`
     * @param {RenderEngineInitPack} layers Layer data including textures and canvas instructions, following the `RenderEngineLayerDescriptors` given
     */
    constructor(baseCanvas: HTMLCanvasElement, layers: RenderEngineInitPack<LayerDescriptors>) {
        this.baseCanvas = baseCanvas;
        this.layers = [] as RenderEngineLayers<LayerDescriptors>;
        const canvases: (HTMLCanvasElement | OffscreenCanvas)[] = [this.baseCanvas];
        // create canvases
        for (const layer of layers) {
            if (layer.canvas < 0) throw new RenderEngineError('Cannot have negative canvas index');
            if (layer.type == '2d') {
                canvases[layer.canvas] ??= document.createElement('canvas');
                if (canvases[layer.canvas] instanceof OffscreenCanvas) throw new RenderEngineError(`Invalid configuration: "2d" layer cannot use OffscreenCanvas of canvas ${layer.canvas}`);
            } else if (layer.type == 'offscreen2d' || layer.type == 'webgl') {
                canvases[layer.canvas] ??= new OffscreenCanvas(1, 1);
                if (canvases[layer.canvas] instanceof HTMLCanvasElement) throw new RenderEngineError(`Invalid configuration: "${layer.type}" layer cannot use HTMLCanvasElement of canvas ${layer.canvas}`);
            }
        }
        // create layer contexts
        for (const layer of layers) {
            // grab target canvases (typescript keeps messing up types for getContext buh)
            const targetCanvas = canvases[layer.target];
            if (targetCanvas == undefined) throw new RenderEngineError(`Invalid configuration: Target canvas ${layer.target} does not exist`);
            const targetCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = targetCanvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
            if (targetCtx === null) throw new RenderEngineError('Canvas2D context is not supported');
            // stuff that'll be used by all the layers
            const layerProps = {
                compositing: layer.compositing ?? 'source-over',
                targetCanvas: layer.target == layer.canvas ? null : targetCtx,
                targetCompositing: layer.targetCompositing ?? 'source-over',
                clear: layer.clear ?? false,
                smoothing: layer.smoothing ?? true,
                culling: layer.culling ?? true,
                textures: layer.textures
            };
            // differentiate layer types
            if (layer.type == '2d') {
                const canvas = canvases[layer.canvas] as HTMLCanvasElement;
                const ctx = canvas.getContext('2d');
                if (ctx === null) throw new RenderEngineError('Canvas2D context is not supported');
                this.layers.push({
                    canvas: canvas,
                    ctx: ctx,
                    ...layerProps
                });
            } else if (layer.type == 'offscreen2d') {
                const canvas = canvases[layer.canvas] as OffscreenCanvas;
                const ctx = canvas.getContext('2d');
                if (ctx === null) throw new RenderEngineError('OffscreenCanvas2D context is not supported');
                this.layers.push({
                    canvas: canvas,
                    ctx: ctx,
                    ...layerProps
                });
            } else if (layer.type == 'webgl') {
                const canvas = canvases[layer.canvas] as OffscreenCanvas;
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

    /**
     * Send a new frame to the `RenderEngine`. This frame data will be held until the next call to `sendFrame`. Calling this does not cause a frame to be drawn.
     * @param {RenderEngineFrameInput} entities Entities to draw on each layer, following the `RenderEngineLayerDescriptors` given
     */
    sendFrame(viewport: RenderEngineViewport, entities: RenderEngineFrameInput<LayerDescriptors>) {
        this.viewport.x = viewport.x;
        this.viewport.y = viewport.y;
        this.viewport.angle = viewport.angle;
        if (this.viewport.width != viewport.width || this.viewport.height != viewport.height) {
            this.viewport.width = viewport.width;
            this.viewport.height = viewport.height;
            const resized: Set<HTMLCanvasElement | OffscreenCanvas> = new Set();
            for (const layer of this.layers) {
                if (!resized.has(layer.canvas)) {
                    resized.add(layer.canvas);
                    layer.canvas.width = this.viewport.width;
                    layer.canvas.height = this.viewport.height;
                }
            }
        }
        this.viewport.scale = viewport.scale;
        this.frame.length = 0;
        this.frame.push(...entities);
    }

    private readonly nextFrameCallbacks: Set<() => any> = new Set();
    private readonly frameCallbacks: Set<() => any> = new Set();
    private readonly nextFramePromises: Set<() => void> = new Set();

    private transformRenderable<Renderable extends CompositeRenderable<CustomRenderable | CustomReadRenderable> | RectangleRenderable | TexturedRenderable | TextRenderable>(entity: Renderable, parent: CompositeRenderable<CustomRenderable | CustomReadRenderable>, cosVal: number, sinVal: number): Renderable {
        return {
            ...entity,
            x: parent.x + entity.x * cosVal - entity.y * sinVal,
            y: parent.y - entity.x * sinVal + entity.y * cosVal,
            angle: (parent.angle) + (entity.angle)
        };
    }

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
        if (this.frame.length != this.layers.length) return;
        const cullTop = this.viewport.y - this.viewport.height / 2 / this.viewport.scale - this.cullDist;
        const cullBottom = this.viewport.y + this.viewport.height / 2 / this.viewport.scale + this.cullDist;
        const cullLeft = this.viewport.x - this.viewport.width / 2 / this.viewport.scale - this.cullDist;
        const cullRight = this.viewport.x + this.viewport.width / 2 / this.viewport.scale + this.cullDist;
        const twoPi = 2 * Math.PI;
        const start = performance.now();
        let sortTotal = 0;
        let drawTotal = 0;
        for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];
            const canvas = layer.canvas;
            const ctx = layer.ctx;
            const textures = layer.textures;
            if (ctx instanceof CanvasRenderingContext2D || ctx instanceof OffscreenCanvasRenderingContext2D) {
                const renderables = this.frame[i] as (CustomRenderable | CustomReadRenderable | PathRenderable | RectangleRenderable | TexturedRenderable | TextRenderable | CompositeRenderable<CustomRenderable | CustomReadRenderable>)[];
                // clear canvas and save default state
                if (layer.clear) ctx.reset();
                else ctx.restore();
                ctx.resetTransform();
                ctx.globalCompositeOperation = layer.compositing;
                ctx.imageSmoothingEnabled = layer.smoothing;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                // center canvas onto viewport (optimization is actually kinda pointless)
                ctx.translate(this.viewport.x * this.viewport.scale + this.viewport.width / 2, -this.viewport.y * this.viewport.scale + this.viewport.height / 2);
                if (this.viewport.angle % twoPi != 0) ctx.rotate(-this.viewport.angle);
                ctx.scale(this.viewport.scale, this.viewport.scale);
                ctx.save();
                // flatten all composite renderables out into categories
                // immediately draw all custom renderables
                // bucket everything else into line, rectangular, and text groups (by color)
                const sortStart = performance.now();
                const simpleRenderableBuckets: Map<string, [RectangleRenderable[], CircleRenderable[], CircleRenderable[], TextRenderable[], PathRenderable[]]> = new Map();
                const texturedRenderables: TexturedRenderable[] = [];
                const brokenTexturedRenderables: TexturedRenderable[] = [];
                const compositeRenderableStack: CompositeRenderable<CustomRenderable | CustomReadRenderable>[] = [];
                for (const entity of renderables) {
                    if (entity instanceof CompositeRenderable) {
                        if (layer.culling && (entity.x < cullLeft || entity.x > cullRight || entity.y < cullTop || entity.y > cullBottom)) continue;
                        compositeRenderableStack.push(entity);
                    } else if (entity instanceof TexturedRenderable) {
                        if (layer.culling && (entity.x < cullLeft || entity.x > cullRight || entity.y < cullTop || entity.y > cullBottom)) continue;
                        if (textures[entity.texture] === undefined) brokenTexturedRenderables.push(entity);
                        else texturedRenderables.push(entity);
                    } else if (entity instanceof RectangleRenderable) {
                        if (layer.culling && (entity.x < cullLeft || entity.x > cullRight || entity.y < cullTop || entity.y > cullBottom)) continue;
                        const bucket = simpleRenderableBuckets.get(entity.color);
                        if (bucket === undefined) simpleRenderableBuckets.set(entity.color, [[entity], [], [], [], []]);
                        else bucket[0].push(entity);
                    } else if (entity instanceof TextRenderable) {
                        if (layer.culling && (entity.x < cullLeft || entity.x > cullRight || entity.y < cullTop || entity.y > cullBottom)) continue;
                        const bucket = simpleRenderableBuckets.get(entity.color);
                        if (bucket === undefined) simpleRenderableBuckets.set(entity.color, [[], [], [], [entity], []]);
                        else bucket[3].push(entity);
                    } else if (entity instanceof PathRenderable) {
                        const bucket = simpleRenderableBuckets.get(entity.color);
                        if (bucket === undefined) simpleRenderableBuckets.set(entity.color, [[], [], [], [], [entity]]);
                        else bucket[4].push(entity);
                    } else if (entity instanceof CircleRenderable) {
                        if (layer.culling && (entity.x < cullLeft || entity.x > cullRight || entity.y < cullTop || entity.y > cullBottom)) continue;
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
                    } else if (entity instanceof CustomRenderable || entity instanceof CustomReadRenderable) {
                        ctx.save();
                        entity.draw(ctx as CanvasRenderingContext2D & OffscreenCanvasRenderingContext2D, textures);
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
                    const customComponents: (CustomRenderable | CustomReadRenderable)[] = [];
                    for (const entity of compositeEntity.components) {
                        if (entity instanceof CompositeRenderable) {
                            const transformed = this.transformRenderable(entity, compositeEntity, cosVal, sinVal);
                            if (layer.culling && (transformed.x < cullLeft || transformed.x > cullRight || transformed.y < cullTop || transformed.y > cullBottom)) continue;
                            compositeRenderableStack.push();
                        } else if (entity instanceof TexturedRenderable) {
                            const transformed = this.transformRenderable(entity, compositeEntity, cosVal, sinVal);
                            if (layer.culling && (transformed.x < cullLeft || transformed.x > cullRight || transformed.y < cullTop || transformed.y > cullBottom)) continue;
                            if (textures[transformed.texture] === undefined) brokenTexturedRenderables.push(transformed);
                            else texturedRenderables.push(transformed);
                        } else if (entity instanceof RectangleRenderable) {
                            const bucket = simpleRenderableBuckets.get(entity.color);
                            const transformed = this.transformRenderable(entity, compositeEntity, cosVal, sinVal);
                            if (layer.culling && (transformed.x < cullLeft || transformed.x > cullRight || transformed.y < cullTop || transformed.y > cullBottom)) continue;
                            if (bucket === undefined) simpleRenderableBuckets.set(entity.color, [[transformed], [], [], [], []]);
                            else bucket[0].push(transformed);
                        } else if (entity instanceof TextRenderable) {
                            const bucket = simpleRenderableBuckets.get(entity.color);
                            const transformed = this.transformRenderable(entity, compositeEntity, cosVal, sinVal);
                            if (layer.culling && (transformed.x < cullLeft || transformed.x > cullRight || transformed.y < cullTop || transformed.y > cullBottom)) continue;
                            if (bucket === undefined) simpleRenderableBuckets.set(entity.color, [[], [], [], [transformed], []]);
                            else bucket[3].push(transformed);
                        } else if (entity instanceof PathRenderable) {
                            const bucket = simpleRenderableBuckets.get(entity.color);
                            const transformed: PathRenderable = {
                                ...entity,
                                points: entity.points.map((point) => ({
                                    ...point,
                                    x: compositeEntity.x + point.x * cosVal - point.y * sinVal,
                                    y: compositeEntity.y - point.x * sinVal - point.y * cosVal
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
                            if (layer.culling && (transformed.x < cullLeft || transformed.x > cullRight || transformed.y < cullTop || transformed.y > cullBottom)) continue;
                            if (entity.fill != '') {
                                const bucket = simpleRenderableBuckets.get(entity.fill);
                                if (bucket === undefined) simpleRenderableBuckets.set(entity.fill, [[], [transformed], [], [], []]);
                                else bucket[1].push(transformed);
                            }
                            if (entity.stroke != '' && entity.lineWidth != 0) {
                                const bucket = simpleRenderableBuckets.get(entity.stroke);
                                if (bucket === undefined) simpleRenderableBuckets.set(entity.stroke, [[], [], [transformed], [], []]);
                                else bucket[2].push(transformed);
                            }
                        } else if (entity instanceof CustomRenderable || entity instanceof CustomReadRenderable) {
                            customComponents.push(entity);
                        } else {
                            console.warn(new RenderEngineError('Unrecognizable entity in pipeline (under CompositeRenderable), discarding!'));
                        }
                    }
                    if (customComponents.length != 0) {
                        ctx.save();
                        ctx.translate(compositeEntity.x, compositeEntity.y);
                        if (compositeEntity.angle) ctx.rotate(compositeEntity.angle);
                        for (const component of customComponents) {
                            ctx.save();
                            if (component instanceof CustomReadRenderable) component.draw(ctx as CanvasRenderingContext2D, textures.slice());
                            else component.draw(ctx as OffscreenCanvasRenderingContext2D, textures.slice());
                            ctx.restore();
                        }
                        ctx.restore();
                    }
                }
                sortTotal += performance.now() - sortStart;
                // reset again to clear any accidental changes
                ctx.restore();
                ctx.save();
                // draw textured entities
                const drawStart = performance.now();
                for (const entity of texturedRenderables) {
                    if (entity.angle % twoPi == 0) {
                        if (entity instanceof AnimatedTexturedRenderable) {
                            ctx.drawImage(textures[entity.texture], entity.index * entity.frameWidth + entity.shiftx, entity.shifty, entity.cropx, entity.cropy, entity.x - entity.width / 2, -entity.y - entity.height / 2, entity.width, entity.height);
                        } else {
                            ctx.drawImage(textures[entity.texture], entity.shiftx, entity.shifty, entity.cropx, entity.cropy, entity.x - entity.width / 2, -entity.y - entity.height / 2, entity.width, entity.height);
                        }
                    } else {
                        ctx.save();
                        ctx.translate(entity.x, -entity.y);
                        ctx.rotate(-entity.angle!);
                        if (entity instanceof AnimatedTexturedRenderable) {
                            ctx.drawImage(textures[entity.texture], entity.index * entity.frameWidth + entity.shiftx, entity.shifty, entity.cropx, entity.cropy, -entity.width / 2, -entity.height / 2, entity.width, entity.height);
                        } else {
                            ctx.drawImage(textures[entity.texture], entity.shiftx, entity.shifty, entity.cropx, entity.cropy, -entity.width / 2, -entity.height / 2, entity.width, entity.height);
                        }
                        ctx.restore();
                    }
                }
                // draw all bucketed entities
                for (const [color, bucket] of simpleRenderableBuckets) {
                    ctx.fillStyle = color;
                    ctx.strokeStyle = color;
                    ctx.lineJoin = 'miter';
                    const rectangles = bucket[0].sort((a, b) => a.outline - b.outline);
                    const circleFills = bucket[1];
                    const circleStrokes = bucket[2].sort((a, b) => a.lineWidth - b.lineWidth);
                    const texts = bucket[3].sort((a, b) => a.size - b.size);
                    const lines = bucket[4].sort((a, b) => a.lineWidth - b.lineWidth);
                    // rectangles
                    let currOutline: number = 0;
                    for (const rect of rectangles) {
                        if (rect.outline != currOutline) {
                            ctx.lineWidth = rect.outline;
                            currOutline = rect.outline;
                        }
                        const drawFn = rect.outline != 0 ? ctx.strokeRect : ctx.fillRect;
                        if (rect.angle % twoPi == 0) {
                            drawFn.call(ctx, rect.x - rect.width / 2, -rect.y - rect.height / 2, rect.width, rect.height);
                        } else {
                            ctx.save();
                            ctx.translate(rect.x, -rect.y);
                            ctx.rotate(-rect.angle!);
                            drawFn.call(ctx, -rect.width / 2, -rect.height / 2, rect.width, rect.height);
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
                    let currWidth: number = 0;
                    for (const circle of circleStrokes) {
                        if (circle.lineWidth !== currWidth) {
                            ctx.stroke();
                            ctx.beginPath();
                            ctx.lineWidth = Math.abs(circle.lineWidth);
                            currWidth = circle.lineWidth;
                        }
                        ctx.arc(circle.x, -circle.y, circle.r - circle.lineWidth / 2, 0, twoPi);
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
                            ctx.fillText(text.text, text.x, -text.y);
                        } else {
                            ctx.save();
                            ctx.translate(text.x, -text.y);
                            ctx.rotate(-text.angle!);
                            ctx.fillText(text.text, 0, 0);
                            ctx.restore();
                        }
                    }
                    // lines
                    ctx.beginPath();
                    for (const line of lines) {
                        if (ctx.lineJoin !== line.join || ctx.lineCap != line.cap || currWidth != line.lineWidth) {
                            ctx.stroke();
                            ctx.beginPath();
                        }
                        if (ctx.lineJoin !== line.join) ctx.lineJoin = line.join;
                        if (ctx.lineCap !== line.cap) ctx.lineCap = line.cap;
                        if (currWidth != line.lineWidth) {
                            ctx.lineWidth = line.lineWidth;
                            currWidth = line.lineWidth;
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
                if (brokenTexturedRenderables.length > 0) console.warn(brokenTexturedRenderables.length + ' TexturedRenderables referencing nonexistant textures found!');
                ctx.fillStyle = '#000';
                for (const rect of brokenTexturedRenderables) {
                    if (rect.angle % twoPi == 0) {
                        ctx.fillRect(rect.x - rect.width / 2, -rect.y - rect.height / 2, rect.width, rect.height);
                    } else {
                        ctx.save();
                        ctx.translate(rect.x, -rect.y);
                        ctx.rotate(-rect.angle!);
                        ctx.fillRect(-rect.width / 2, -rect.height / 2, rect.width, rect.height);
                        ctx.restore();
                    }
                }
                ctx.fillStyle = '#F0F';
                for (const rect of brokenTexturedRenderables) {
                    if (rect.angle % twoPi == 0) {
                        ctx.fillRect(rect.x - rect.width / 2, -rect.y - rect.height / 2, rect.width / 2, rect.height / 2);
                        ctx.fillRect(rect.x, rect.y, rect.width / 2, rect.height / 2);
                    } else {
                        ctx.save();
                        ctx.translate(rect.x, -rect.y);
                        ctx.rotate(-rect.angle!);
                        ctx.fillRect(-rect.width / 2, -rect.height / 2, rect.width / 2, rect.height / 2);
                        ctx.fillRect(0, 0, rect.width / 2, rect.height / 2);
                        ctx.restore();
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
        // record performance metrics
        const now = performance.now();
        this.metricsCounters.frames.push(now);
        this.metricsCounters.timings.push(now - start);
        this.metricsCounters.sortTimings.push(sortTotal);
        this.metricsCounters.drawTimings.push(drawTotal);
        while (this.metricsCounters.frames[0] <= start - 1000) {
            this.metricsCounters.frames.shift();
            this.metricsCounters.frameHistory.shift();
            this.metricsCounters.timings.shift();
            this.metricsCounters.sortTimings.shift();
            this.metricsCounters.drawTimings.shift();
        }
        this.metricsCounters.frameHistory.push(this.metricsCounters.frames.length);
        // callbacks for frame completion
        this.nextFramePromises.forEach((resolve) => resolve());
        this.nextFramePromises.clear();
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

    private getStats(arr: number[]): Stats {
        return {
            avg: arr.reduce((p, c) => p + c, 0) / arr.length,
            min: Math.min(...arr),
            max: Math.max(...arr)
        };
    }

    /**
     * Performance metrics like framerates
     */
    get metrics(): RenderEngineMetrics {
        return {
            fps: this.metricsCounters.frames.length,
            fpsHistory: this.getStats(this.metricsCounters.frameHistory),
            timings: {
                total: this.getStats(this.metricsCounters.timings),
                sort: this.getStats(this.metricsCounters.sortTimings),
                draw: this.getStats(this.metricsCounters.drawTimings)
            }
        }
    }

    /**
     * Stop all refreshing of the rendering context PERMANENTLY.
     */
    stop() {
        this.drawing = false;
        this.layers.length = 0;
    }
}