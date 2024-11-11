import { CompositeRenderable, type CustomRenderable } from '@/game/renderer';

/**
 * Generic entity class that represents any entity
 */
export abstract class Entity extends CompositeRenderable<CustomRenderable> {
    static tick: number = 0;
    static serverTps: number = 0;
    static lastTick: number = 0;

    readonly id: number;
    tx: number;
    ty: number;
    ta: number;
    vx: number = 0;
    vy: number = 0;
    va: number = 0;

    constructor(data: EntityTickData) {
        super({
            x: data.x,
            y: data.y,
            angle: data.angle
        });
        this.id = data.id;
        this.tx = this.x;
        this.ty = this.y;
        this.ta = this.angle;
    }

    /**
     * Update the entity to interpolate/extrapolate between ticks using velocity, server TPS, and time since last tick.
     * @param time Time as returned by `performance.now()`
     */
    lerp(time: number): void {
        const t = (time - Entity.lastTick) * Entity.serverTps / 1000;
        this.x = 0.5 * this.x + 0.5 * (this.tx + this.vx * t);
        this.y = 0.5 * this.y + 0.5 * (this.ty + this.vy * t);
        this.angle = 0.5 * this.angle + 0.5 * (this.ta + this.va * t);
    }

    /**
     * Update the entity to the most recent tick data.
     * @param packet Update data from server
     */
    tick(packet: EntityTickData): void {
        this.tx = packet.x;
        this.ty = packet.y;
        this.ta = packet.angle;
        this.vx = packet.vx;
        this.vy = packet.vy;
        this.va = packet.va;
    }

    /**
     * Advance entities to next tick. Does not use `entities` parameter - update data should be supplied to subclasses.
     * @param entities Do not use
     */
    static onTick(entities: EntityTickData[]): void {
        if (entities.length > 0) console.warn('"Entity.onTick" only exists to give a signature for subclasses, do not call it. Call "onTick" for subclasses instead.');
        this.lastTick = performance.now();
    }
}

/**
 * All data necessary to create one entity from the server, fetched each tick.
 */
export interface EntityTickData {
    readonly id: number
    readonly x: number
    readonly y: number
    readonly angle: number
    readonly vx: number
    readonly vy: number
    readonly va: number
}

export default Entity;

if (import.meta.env.DEV) {
    if ((window as any).Entity == undefined) (window as any).Entity = Entity;
}