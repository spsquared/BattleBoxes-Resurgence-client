import { LinearPoint, PathRenderable, RectangleRenderable, TextRenderable } from '@/game/renderer';
import { connectionState } from '@/server';

import gameInstance from '../game';
import GameMap, { MapCollision } from '../map';
import Entity from './entity';

import type { EntityTickData } from './entity';
/**
 * Uncontrolled player entity.
 */
export class Player extends Entity {
    static get tick(): number { return Entity.tick; }

    static readonly list: Map<string, Player> = new Map();

    readonly username: string;
    width: number = 0.75;
    height: number = 0.75;
    color: string

    constructor(id: number, username: string, x: number, y: number, color: string) {
        super(id, x, y);
        this.username = username;
        this.color = color;
        this.components.push(new RectangleRenderable({ width: this.width, height: this.height, color: this.color }));
        this.components.push(new TextRenderable({ text: this.username, x: 0, y: 0.6, size: 0.2, align: 'center' }))
        if (Player.list.has(this.username)) throw new Error(`Duplicate Player "${this.username}"!`);
        Player.list.set(this.username, this);
    }

    tick(packet: PlayerTickData): void {
        super.tick(packet);
        this.color = packet.color;
        (this.components[0] as RectangleRenderable).color = this.color;
    }

    /**
     * Advance players to next tick.
     * @param players Player list from server tick
     */
    static onTick(players: PlayerTickData[]): void {
        const updated: Set<Player> = new Set();
        for (const uPlayer of players) {
            const player = Player.list.get(uPlayer.username);
            if (player !== undefined) {
                player.tick(uPlayer);
                updated.add(player);
            } else {
                const playerConstructor = (uPlayer.username == connectionState.username) ? ControlledPlayer : Player
                const newPlayer = new playerConstructor(uPlayer.id, uPlayer.username, uPlayer.x, uPlayer.y, uPlayer.color);
                Player.list.set(newPlayer.username, newPlayer);
                newPlayer.tick(uPlayer);
                updated.add(newPlayer);
                if (newPlayer instanceof ControlledPlayer) ControlledPlayer.self = newPlayer;
            }
        }
        for (const [username, player] of Player.list) {
            if (!updated.has(player)) Player.list.delete(username);
        }
    }
}

/**
 * Player controlled by user input with locally simulated physics to reduce input lag.
 */
export class ControlledPlayer extends Player {
    static get tick(): number { return Entity.tick; }
    static physicsTick: number = 0;
    static physicsResolution: number = 64;
    static physicsBuffer: number = 0.01;
    static self?: ControlledPlayer;

    gridx: number;
    gridy: number;
    cosVal: number = NaN;
    sinVal: number = NaN;
    boundingWidth: number = NaN;
    boundingHeight: number = NaN;
    halfBoundingWidth: number = NaN;
    halfBoundingHeight: number = NaN;
    /**List of vertices going clockwise that make up a convex polygon to define the collision shape of the entity */
    readonly vertices: Point[] = [];

    /**Friction coefficients of contact sides (along the axes), where zero is no friction or no contact */
    contactEdges: {
        left: number
        right: number
        top: number
        bottom: number
    } = {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0
        };
    readonly contactEdgeLineOffset: number;

    static baseProperties: ControlledPlayer['properties'] = {
        gravity: 0,
        movePower: 0,
        jumpPower: 0,
        wallJumpPower: 0,
        airMovePower: 0,
        drag: 0,
        airDrag: 0,
        wallDrag: 0,
        grip: 0,
        fly: false
    };
    properties: {
        gravity: number
        movePower: number
        jumpPower: number
        wallJumpPower: number
        airMovePower: number
        drag: number
        airDrag: number
        wallDrag: number
        grip: number
        fly: boolean
    } = {
            gravity: ControlledPlayer.baseProperties.gravity,
            movePower: ControlledPlayer.baseProperties.movePower,
            jumpPower: ControlledPlayer.baseProperties.jumpPower,
            wallJumpPower: ControlledPlayer.baseProperties.wallJumpPower,
            airMovePower: ControlledPlayer.baseProperties.airMovePower,
            drag: ControlledPlayer.baseProperties.drag,
            airDrag: ControlledPlayer.baseProperties.airDrag,
            wallDrag: ControlledPlayer.baseProperties.wallDrag,
            grip: ControlledPlayer.baseProperties.grip,
            fly: ControlledPlayer.baseProperties.fly
        };
    modifiers: { id: number, modifier: Modifiers, length: number }[] = [];

    readonly inputs: {
        left: boolean
        right: boolean
        up: boolean
        down: boolean
    } = {
            left: false,
            right: false,
            up: false,
            down: false
        };

    private lastPhysicsTick: number = 0;

    constructor(id: number, username: string, x: number, y: number, color: string) {
        super(id, username, x, y, color);
        this.gridx = Math.floor(this.x);
        this.gridy = Math.floor(this.y);
        this.contactEdgeLineOffset = this.components.length;
        this.components.push(
            new PathRenderable({ points: [new LinearPoint(-this.width / 2, -this.height / 2), new LinearPoint(-this.width / 2, this.height / 2)], color: 'rgba(0, 200, 0, 0)', lineWidth: 4 / ControlledPlayer.physicsResolution }),
            new PathRenderable({ points: [new LinearPoint(this.width / 2, -this.height / 2), new LinearPoint(this.width / 2, this.height / 2)], color: 'rgba(0, 200, 0, 0)', lineWidth: 4 / ControlledPlayer.physicsResolution }),
            new PathRenderable({ points: [new LinearPoint(-this.width / 2, -this.height / 2), new LinearPoint(this.width / 2, -this.height / 2)], color: '#rgba(0, 200, 0, 0)', lineWidth: 4 / ControlledPlayer.physicsResolution }),
            new PathRenderable({ points: [new LinearPoint(-this.width / 2, this.height / 2), new LinearPoint(this.width / 2, this.height / 2)], color: 'rgba(0, 200, 0, 0)', lineWidth: 4 / ControlledPlayer.physicsResolution }),
        );
    }

    tick(packet: PlayerTickData): void {
        super.tick(packet);
        this.properties = packet.properties;
        this.modifiers = packet.modifiers;
    }

    lerp(time: number): void {
        // const t = (time - this.lastPhysicsTick) * Entity.serverTps / 1000;
        // this.x = this.tx + this.vx * t;
        // this.y = this.ty + this.vy * t;
        // this.angle = this.ta + this.va * t;
    }

    /**
     * Player-unique physics tick to reduce input lag. Runs player movement and attempts to synchronize
     * with server tickrate. Any physics will be validated by the server.
     */
    physicsTick(): void {
        // restore coordinates to stop frame interpolation from interfering
        this.x = this.tx;
        this.y = this.ty;
        this.angle = this.ta;
        // flying moment
        if (this.properties.fly) {
            // flying just moves
            this.vx = ((this.inputs.right ? 1 : 0) - (this.inputs.left ? 1 : 0)) * this.properties.movePower;
            this.vy = ((this.inputs.up ? 1 : 0) - (this.inputs.down ? 1 : 0)) * this.properties.movePower;
        } else {

            // tick simulation - should be identical to server (but server can override anyway)
            // update modifiers
            // modifiers always count down
            // modifiers will stay at full until the server counts down because server overrides timers
            // movement
            //   see server code for explanation of player movement (under `/game/entities/player.ts/Player/physicsTick()`)
            // apply contact drag
            this.vx *= Math.pow(this.properties.drag, this.contactEdges.top + this.contactEdges.bottom);
            this.vy *= Math.pow(this.properties.drag, this.contactEdges.left + this.contactEdges.right);
            // apply air drag
            this.vx *= this.properties.airDrag;
            this.vy *= this.properties.airDrag;
            // apply input velocity
            const moveInput = ((this.inputs.right ? 1 : 0) - (this.inputs.left ? 1 : 0));
            if (this.contactEdges.left * moveInput < 0 || this.contactEdges.right * moveInput > 0) {
                const friction = this.contactEdges.left + this.contactEdges.right;
                this.vy *= Math.pow(this.properties.wallDrag, friction);
                if (this.inputs.up || (this.inputs.down && this.contactEdges.bottom == 0)) {
                    const jumpPower = this.properties.jumpPower * this.properties.grip * friction;
                    this.vx -= moveInput * jumpPower * this.properties.wallJumpPower;
                    if (this.inputs.up) this.vy += jumpPower;
                }
            } else if (this.contactEdges.bottom != 0) {
                this.vx += moveInput * this.properties.movePower * this.properties.grip * this.contactEdges.bottom;
                if (this.inputs.up) this.vy += this.properties.jumpPower;
            } else {
                this.vx += moveInput * this.properties.airMovePower;
            }
            // apply gravity
            this.vy -= this.properties.gravity * Math.cos(this.angle);
            this.vx += this.properties.gravity * Math.sin(this.angle);
        }
        // move to next position
        this.nextPosition();
        this.tx = this.x;
        this.ty = this.y;
        this.ta = this.angle;
        // update debug
        const showContactEdgeDebug = gameInstance.value?.overlayRenderer.playerInfo ? 255 : 0;
        (this.components[this.contactEdgeLineOffset + 0] as PathRenderable).color = `rgba(0, 200, 0, ${showContactEdgeDebug * this.contactEdges.left})`;
        (this.components[this.contactEdgeLineOffset + 1] as PathRenderable).color = `rgba(0, 200, 0, ${showContactEdgeDebug * this.contactEdges.right})`;
        (this.components[this.contactEdgeLineOffset + 2] as PathRenderable).color = `rgba(0, 200, 0, ${showContactEdgeDebug * this.contactEdges.top})`;
        (this.components[this.contactEdgeLineOffset + 3] as PathRenderable).color = `rgba(0, 200, 0, ${showContactEdgeDebug * this.contactEdges.bottom})`;
        // send to server
        gameInstance.value?.socket.emit('tick', {
            tick: ControlledPlayer.physicsTick,
            modifiers: this.modifiers.map((mod) => mod.id),
            inputs: this.inputs
        } satisfies ControlledPlayerTickInput);
        this.lastPhysicsTick = performance.now();
    }

    /**
     * Moves the entity to its "next" position following its velocity (`vx` and `vy`) and map collisions.
     * Note that translations are calculated first, then rotations.
     */
    nextPosition(): void {
        this.calculateCollisionInfo();
        const steps = Math.max(Math.abs(this.vx), Math.abs(this.vy)) * ControlledPlayer.physicsResolution;
        const step = 1 / steps;
        const pos = {
            x: this.x,
            y: this.y,
            lx: this.x,
            ly: this.y,
            dx: this.vx / steps,
            dy: this.vy / steps
        };
        const bufferX = ControlledPlayer.physicsBuffer * Math.log2(this.x);
        const bufferY = ControlledPlayer.physicsBuffer * Math.log2(this.y);
        for (let i = step; i <= 1 && (pos.dx != 0 || pos.dy != 0); i += step) {
            pos.lx = pos.x;
            pos.ly = pos.y;
            pos.x += pos.dx;
            pos.y += pos.dy;
            const col1 = this.collidesWithMap(pos.x, pos.y);
            if (col1 !== null) {
                const col2 = this.collidesWithMap(pos.x, pos.ly);
                if (col2 !== null) {
                    const col3 = this.collidesWithMap(pos.lx, pos.y);
                    if (col3 !== null) {
                        pos.x = pos.lx = col3.x + (pos.x - col3.x < 0 ? -1 : 1) * (col3.halfBoundingWidth + this.halfBoundingWidth + bufferX);
                        pos.y = pos.ly = col3.y + (pos.y - col3.y < 0 ? -1 : 1) * (col3.halfBoundingHeight + this.halfBoundingHeight + bufferY);
                        pos.dx = this.vx = 0;
                        pos.dy = this.vy = 0;
                    } else {
                        pos.x = pos.lx = col2.x + (pos.x - col2.x < 0 ? -1 : 1) * (col2.halfBoundingWidth + this.halfBoundingWidth + bufferX);
                        pos.dx = this.vx = 0;
                    }
                } else {
                    pos.y = pos.ly = col1.y + (pos.y - col1.y < 0 ? -1 : 1) * (col1.halfBoundingHeight + this.halfBoundingHeight + bufferY);
                    pos.dy = this.vy = 0;
                }
            }
        }
        this.x = pos.x;
        this.y = pos.y;
        this.angle += this.va;
        this.calculateCollisionInfo();
        const shiftX = (1 + bufferX) / ControlledPlayer.physicsResolution;
        const shiftY = (1 + bufferY) / ControlledPlayer.physicsResolution;
        this.contactEdges.left = this.collidesWithMap(this.x - shiftX, this.y)?.friction ?? 0;
        this.contactEdges.right = this.collidesWithMap(this.x + shiftX, this.y)?.friction ?? 0;
        this.contactEdges.top = this.collidesWithMap(this.x, this.y + shiftY)?.friction ?? 0;
        this.contactEdges.bottom = this.collidesWithMap(this.x, this.y - shiftY)?.friction ?? 0;
    }

    /**
     * If the entity would intersect with any part of the map when placed at the coordinates (`x`, `y`).
     * If so, returns the colliding segment.
     * @param x X coordinate to test
     * @param y Y coordinate to test
     * @returns First colliding object or null if no collisions detected.
     */
    collidesWithMap(x: number, y: number): MapCollision | null {
        if (GameMap.current === undefined) return null;
        const sx = Math.max(Math.floor(x - this.halfBoundingWidth), 0);
        const ex = Math.min(Math.ceil(x + this.halfBoundingWidth), GameMap.current.width - 1);
        const sy = Math.max(Math.floor(y - this.halfBoundingHeight), 0);
        const ey = Math.min(Math.ceil(y + this.halfBoundingHeight), GameMap.current.height - 1);
        const dx = x - this.x;
        const dy = y - this.y;
        const vertices = this.vertices.map((p) => ({ x: p.x + dx, y: p.y + dy }));
        for (let cy = sy; cy <= ey; cy++) {
            for (let cx = sx; cx <= ex; cx++) {
                for (const col of GameMap.current.collisionGrid[cy][cx]) {
                    if (Math.abs(x - col.x) > this.halfBoundingWidth + col.halfBoundingWidth || Math.abs(y - col.y) > this.halfBoundingHeight + col.halfBoundingHeight) {
                        continue;
                    }
                    for (const p of vertices) {
                        if (col.points.every((q, i) => ControlledPlayer.isWithin(p, q, col.points[(i + 1) % col.points.length]))) {
                            return col;
                        }
                    }
                    for (const p of col.points) {
                        if (vertices.every((q, i) => ControlledPlayer.isWithin(p, q, vertices[(i + 1) % vertices.length]))) {
                            return col;
                        }
                    }
                }
            }
        }
        return null;
    }

    /**
     * Determines if point P is "within" the boundary formed by points Q and R by
     * checking if the determinant of the below matrix is positive or zero.
     * ```
     * |  1   1   1  |
     * | Q.x P.x R.x |
     * | Q.y P.y R.y |
     * ```
     * @param p Test point P
     * @param q Boundary point Q
     * @param r Boundary point R
     * @returns If point P is within the boundary of QR
     */
    private static isWithin(p: Point, q: Point, r: Point): boolean {
        return q.x * (p.y - r.y) + p.x * (r.y - q.y) + r.x * (q.y - p.y) >= 0;
    }

    /**
     * Calculates essential values for collisions that would otherwise be redundantly calculated. MUST
     * be called after any angle, position, or size changes or some collisions will behave weirdly!
     */
    calculateCollisionInfo() {
        this.gridx = Math.floor(this.x);
        this.gridy = Math.floor(this.y);
        this.cosVal = Math.cos(this.angle);
        this.sinVal = Math.sin(this.angle);
        this.boundingWidth = Math.abs(this.width * this.cosVal) + Math.abs(this.height * this.sinVal);
        this.boundingHeight = Math.abs(this.height * this.cosVal) + Math.abs(this.width * this.sinVal);
        this.halfBoundingWidth = this.boundingWidth / 2;
        this.halfBoundingHeight = this.boundingHeight / 2;
        const hWidth = this.width / 2;
        const hHeight = this.height / 2;
        this.vertices[0] = { x: this.x - this.cosVal * hWidth + this.sinVal * hHeight, y: this.y + this.cosVal * hWidth + this.sinVal * hHeight };
        this.vertices[1] = { x: this.x + this.cosVal * hWidth + this.sinVal * hHeight, y: this.y + this.cosVal * hWidth + this.sinVal * hHeight };
        this.vertices[2] = { x: this.x + this.cosVal * hWidth - this.sinVal * hHeight, y: this.y - this.cosVal * hWidth - this.sinVal * hHeight };
        this.vertices[3] = { x: this.x - this.cosVal * hWidth - this.sinVal * hHeight, y: this.y - this.cosVal * hWidth - this.sinVal * hHeight };
    }

    /**
     * Starts physics tick loop - this is run once and never ends, only slowing down the timer when not in games.
     * Has a PD control loop to match the client tick with the server tick.
     */
    static async startPhysicsTickLoop(): Promise<void> {
        const kP = 5;
        const kD = 10;
        let lastError = 0;
        const session = (window as any).bbrPlayerPhysicsSession = Math.random();
        while ((window as any).bbrPlayerPhysicsSession == session) {
            const start = performance.now();
            ControlledPlayer.physicsTick++;
            ControlledPlayer.self?.physicsTick();
            const end = performance.now();
            const error = ControlledPlayer.physicsTick - Entity.tick;
            if (!document.hidden || ControlledPlayer.physicsTick >= Entity.tick) await new Promise<void>((resolve) => setTimeout(resolve, (1000 / Math.max(2, Entity.serverTps - kP * error - kD * (error - lastError))) - end + start));
            lastError = error;
        }
    }
}

/**
 * All data necessary to create one player from the server, fetched each tick.
 */
export interface PlayerTickData extends EntityTickData {
    readonly username: string
    readonly color: string
    readonly properties: ControlledPlayer['properties']
    readonly modifiers: ControlledPlayer['modifiers']
}

export interface Point {
    x: number
    y: number
}

export class Collidable extends PathRenderable {
    x: number;
    y: number;
    halfBoundingWidth: number;
    halfBoundingHeight: number;

    constructor(x: number, y: number, hw: number, hh: number, points: PathRenderable['points'], dispColor: string) {
        super({ points: points, color: dispColor, lineWidth: 2 / ControlledPlayer.physicsResolution, close: true });
        this.x = x;
        this.y = y;
        this.halfBoundingWidth = hw;
        this.halfBoundingHeight = hh;
    }
}

/**
 * A packet representing a client physics tick, to be cross-checked by the server to minimize cheating.
 * The server runs the same tick to make sure movement physics are unmodified and effect timers are correct.
 */
export interface ControlledPlayerTickInput {
    /**Client tick number, not strictly linked to server tickrate */
    readonly tick: number
    /**List of modifier ID list for cross-checking with server */
    readonly modifiers: number[]
    /**All inputs being held for that tick */
    readonly inputs: ControlledPlayer['inputs']
}

/**
 * Enumeration of player effects, usually achieved through lootboxes
 */
export enum Modifiers {
    /**Makes you faaaast */
    MOVE_POWER,
    /**Makes you faaaast faster */
    MOVE_DRAG,
    /**Makes you jump higher */
    JUMP_POWER,
    /**Allows you to completely stop on walls by pressing down */
    WALL_GRIP,
    /**Allows for full acceleration when not on ground */
    AIR_MOVE,
    /**Halves player friction for SPEEEED */
    LOW_FRICTION
}

export default Player;

// development restart - vite hot updating is weird
setTimeout(() => {
    if (gameInstance.value == undefined) ControlledPlayer.startPhysicsTickLoop();
});