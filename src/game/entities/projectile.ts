import { AnimatedTexturedRenderable, CompositeRenderable, type CustomRenderable, PathRenderable, RectangleRenderable, TexturedRenderable } from '@/game/renderer';

import Entity from './entity';

import type { EntityTickData } from './entity';
import { Collidable, Player, type Point } from './player';

/**
 * Provides debug visuals for projectiles. (but also hitboxes look cool)
 */
export class ProjectileCollisionDebugView extends CompositeRenderable<CustomRenderable> {
    constructor(points: Point[]) {
        super({});
        this.components.push(new RectangleRenderable({
            color: '#0B0',
            outline: 0.04
        }));
        this.components.push(new PathRenderable({
            points: points.map((p) => ({ type: 'line', x: p.x, y: p.y })) as PathRenderable['points'],
            color: '#0D0',
            lineWidth: 0.04,
            close: true
        }));
    }

    set boundingBox(rect: Collidable['boundingBox']) {
        const comp = this.components[0] as RectangleRenderable;
        comp.x = (rect.right + rect.left) / 2;
        comp.y = (rect.top + rect.bottom) / 2;
        comp.width = rect.right - rect.left;
        comp.height = rect.top - rect.bottom;
    }

    /**
     * Sets the angle of the collision drawing without rotating the bounding box.
     */
    set angle2(a: number) {
        this.angle = a;
        (this.components[0] as RectangleRenderable).angle = -a;
    }
}

/**
 * General projectile entity that is created from projectile templates. Collision vertices for
 * debug information are sent from server.
 */
export class Projectile extends Entity {
    static get tick(): number { return Entity.tick; }

    static readonly list: Map<number, Projectile> = new Map();

    /**
     * All projectile templates available.
     * Vertices are loaded from server.
     */
    static readonly types: Readonly<Record<string, ProjectileType>> = {
        bullet: {
            vertices: [],
            width: 0.25,
            height: 0.25,
            display: (parent) => parent.color
        }
    };

    readonly parent: Player;
    readonly collisionDebugView: ProjectileCollisionDebugView;
    private readonly animationSpeed: number = 0;
    private readonly animationLength: number = 0;

    constructor(data: ProjectileTickData) {
        super(data);
        this.parent = Player.list.get(data.parent)!;
        if (this.parent === undefined) throw new ReferenceError(`Projectile parent player not found - ${data.parent}`);
        const typeData = Projectile.types[data.type];
        if (typeof typeData.display == 'string') {
            this.components.push(new RectangleRenderable({
                width: typeData.width,
                height: typeData.height,
                color: typeData.display
            }));
        } else if (typeof typeData.display == 'function') {
            this.components.push(new RectangleRenderable({
                width: typeData.width,
                height: typeData.height,
                color: typeData.display(this.parent)
            }));
        } else {
            if (typeData.display.animationLength > 0) {
                this.components.push(new AnimatedTexturedRenderable({
                    width: typeData.width,
                    height: typeData.height,
                    shiftx: typeData.display.shiftx,
                    shifty: typeData.display.shifty,
                    cropx: typeData.display.cropx,
                    cropy: typeData.display.cropy,
                    frameWidth: typeData.display.frameWidth
                }));
                this.animationSpeed = typeData.display.animationSpeed;
                this.animationLength = typeData.display.animationLength;
            } else {
                this.components.push(new TexturedRenderable({
                    width: typeData.width,
                    height: typeData.height,
                    shiftx: typeData.display.shiftx,
                    shifty: typeData.display.shifty,
                    cropx: typeData.display.cropx,
                    cropy: typeData.display.cropy,
                }));
            }
        }
        this.collisionDebugView = new ProjectileCollisionDebugView(typeData.vertices);
        this.collisionDebugView.x = this.tx;
        this.collisionDebugView.y = this.ty;
        this.collisionDebugView.angle2 = this.ta;
        Projectile.list.set(this.id, this);
    }

    lerp(time: number): void {
        super.lerp(time);
        if (this.animationLength > 0) (this.components[0] as AnimatedTexturedRenderable).index = Math.floor(time / this.animationSpeed) % this.animationLength;
    }

    tick(packet: ProjectileTickData): void {
        super.tick(packet);
        this.collisionDebugView.x = this.tx;
        this.collisionDebugView.y = this.ty;
        this.collisionDebugView.boundingBox = packet.boundingBox;
        this.collisionDebugView.angle2 = this.ta;
    }

    /**
     * Advance projectiles to next tick.
     * @param projectiles Projectile list from server tick
     */
    static onTick(projectiles: ProjectileTickData[]): void {
        const updated: Set<Projectile> = new Set();
        for (const uProjectile of projectiles) {
            const projectile = Projectile.list.get(uProjectile.id);
            if (projectile !== undefined) {
                projectile.tick(uProjectile);
                updated.add(projectile);
            } else {
                const newProjectile = new Projectile(uProjectile);
                newProjectile.tick(uProjectile);
                updated.add(newProjectile);
            }
        }
        for (const [id, projectile] of Projectile.list) {
            if (!updated.has(projectile)) Projectile.list.delete(id);
        }
    }
}
/**
 * Defines a projectile template.
 */
export interface ProjectileType {
    readonly vertices: Point[]
    readonly width: number
    readonly height: number
    readonly display: string | {
        map: number
        shiftx: number
        shifty: number
        cropx: number
        cropy: number
        frameWidth: number
        animationSpeed: number
        animationLength: number
    } | ((parent: Player) => string)
}

/**
 * All data necessary to create one projectile on the client, fetched each tick.
 */
export interface ProjectileTickData extends EntityTickData {
    readonly type: keyof typeof Projectile.types
    readonly parent: string
    readonly boundingBox: Collidable['boundingBox']
}

export default Projectile;