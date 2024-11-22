import { ref } from 'vue';

import gameInstance from '@/game/game';
import { CompositeRenderable, LinearPoint, PathRenderable, RectangleRenderable, TextRenderable } from '@/game/renderer';
import { connectionState } from '@/server';

import GameMap, { MapCollision } from '../map';
import Entity from './entity';

import type { Ref } from 'vue';

import type { EntityTickData } from './entity';
import type { CustomRenderable } from '@/game/renderer';

/**
 * Uncontrolled player entity.
 */
export class Player extends Entity {
    static get tick(): number { return Entity.tick; }

    static readonly list: Map<string, Player> = new Map();

    readonly username: string;
    width: number = 0.75;
    height: number = 0.75;
    color: string;
    hp: number;
    maxHp: number;
    private readonly healthBarRenderable: RectangleRenderable;
    /**Separate renderable for debug drawing */
    readonly debugRenderable: CompositeRenderable<CustomRenderable>;

    constructor(data: PlayerTickData) {
        super(data);
        this.username = data.username;
        if (Player.list.has(this.username)) throw new Error(`Duplicate Player "${this.username}"!`);
        this.color = data.color;
        this.hp = data.hp;
        this.maxHp = data.maxHp;
        this.components.push(new RectangleRenderable({ width: this.width, height: this.height, color: this.color }));
        this.components.push(new TextRenderable({ text: this.username, x: 0, y: 0.65, size: 0.2, align: 'center' }))
        this.healthBarRenderable = new RectangleRenderable({ y: 0.5, height: 0.1 });
        this.components.push(this.healthBarRenderable);
        this.debugRenderable = new CompositeRenderable({ x: this.x, y: this.y, angle: this.angle });
        this.debugRenderable.components.push(new RectangleRenderable({ x: 0, y: 0, color: '#0F0', width: this.width, height: this.height, outline: 0.04 }));
        this.debugRenderable.components.push(new RectangleRenderable({ x: this.vx / 2, y: 0, color: '#05D', width: this.vx, height: 0, outline: 0.04 }));
        this.debugRenderable.components.push(new RectangleRenderable({ x: 0, y: this.vy / 2, color: '#05D', width: 0, height: this.vy, outline: 0.04 }));
        Player.list.set(this.username, this);
    }

    tick(packet: PlayerTickData): void {
        super.tick(packet);
        this.tickUpdateRenderables(packet);
    }

    /**
     * Helper for `tick` function that updates debug and health bar renderables.
     * @param packet Update data from server
     */
    tickUpdateRenderables(packet: PlayerTickData): void {
        this.color = packet.color;
        this.hp = packet.hp;
        this.maxHp = packet.maxHp;
        (this.components[0] as RectangleRenderable).color = this.color;
        this.healthBarRenderable.width = this.hp / this.maxHp * 1.2;
        this.healthBarRenderable.x = -0.6 + this.healthBarRenderable.width / 2;
        this.healthBarRenderable.color = `hsl(${(this.hp - 1) / (this.maxHp - 1) * 120}deg, 100%, 50%)`;
        this.tickUpdateDebugRenderables();
    }

    /**
     * Updates debug draw renderables on both server and client physics ticks.
     */
    tickUpdateDebugRenderables(): void {
        this.debugRenderable.x = this.tx;
        this.debugRenderable.y = this.ty;
        this.debugRenderable.angle = this.ta;
        (this.debugRenderable.components[1] as RectangleRenderable).x = this.vx / 2;
        (this.debugRenderable.components[1] as RectangleRenderable).width = this.vx;
        (this.debugRenderable.components[2] as RectangleRenderable).y = this.vy / 2;
        (this.debugRenderable.components[2] as RectangleRenderable).height = this.vy;
    }


    /**
     * Removes the player from the player list
     */
    remove(): void {
        Player.list.delete(this.username);
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
                const PlayerConstructor = (uPlayer.username == connectionState.username) ? ControlledPlayer : Player
                const newPlayer = new PlayerConstructor(uPlayer);
                newPlayer.tick(uPlayer);
                updated.add(newPlayer);
            }
        }
        for (const player of Player.list.values()) {
            if (!updated.has(player)) player.remove();
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
    static readonly selfRef: Ref<ControlledPlayer | null> = ref(null);

    gridx: number;
    gridy: number;
    cosVal: number = NaN;
    sinVal: number = NaN;
    readonly boundingBox: Collidable['boundingBox'] = {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
    };
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
        sneakDrag: 0,
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
        sneakDrag: number
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
            sneakDrag: ControlledPlayer.baseProperties.sneakDrag,
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
        primary: boolean
        secondary: boolean
        mouseAngle: number
    } = {
            left: false,
            right: false,
            up: false,
            down: false,
            primary: false,
            secondary: false,
            mouseAngle: 0
        };

    constructor(data: PlayerTickData) {
        super(data);
        if (ControlledPlayer.self !== undefined) throw new Error('Cannot have two ControlledPlayer instances!');
        this.gridx = Math.floor(this.x);
        this.gridy = Math.floor(this.y);
        this.contactEdgeLineOffset = this.components.length;
        this.components.push(
            new PathRenderable({ points: [new LinearPoint(-this.width / 2, this.height / 2), new LinearPoint(-this.width / 2, -this.height / 2)], color: 'rgba(0, 200, 0, 0)', lineWidth: 4 / ControlledPlayer.physicsResolution }),
            new PathRenderable({ points: [new LinearPoint(this.width / 2, this.height / 2), new LinearPoint(this.width / 2, -this.height / 2)], color: 'rgba(0, 200, 0, 0)', lineWidth: 4 / ControlledPlayer.physicsResolution }),
            new PathRenderable({ points: [new LinearPoint(-this.width / 2, this.height / 2), new LinearPoint(this.width / 2, this.height / 2)], color: '#rgba(0, 200, 0, 0)', lineWidth: 4 / ControlledPlayer.physicsResolution }),
            new PathRenderable({ points: [new LinearPoint(-this.width / 2, -this.height / 2), new LinearPoint(this.width / 2, -this.height / 2)], color: 'rgba(0, 200, 0, 0)', lineWidth: 4 / ControlledPlayer.physicsResolution }),
        );
        ControlledPlayer.self = this;
        ControlledPlayer.selfRef.value = this;
    }

    lerp(_time: number): void {
        _time;
        // idk do something funny with debug
    }

    tick(packet: PlayerTickData): void {
        if (packet.overridePosition) super.tick(packet);
        else this.tickUpdateRenderables(packet);
        this.properties = packet.properties;
        this.modifiers = packet.modifiers;
    }

    /**
     * Player-unique physics tick to reduce input lag. Runs player movement and attempts to synchronize
     * with server tickrate. Synchronization is done by server too (see server documentation).
     * Any movement is then validated by the server.
     */
    physicsTick(): void {
        // restore coordinates to stop frame interpolation from interfering
        this.x = this.tx;
        this.y = this.ty;
        this.angle = this.ta;
        this.calculateCollisionInfo();
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
                if (this.vy < 0) this.vy *= Math.pow(this.properties.wallDrag, friction);
                if (this.inputs.up || (this.inputs.down && this.contactEdges.bottom == 0)) {
                    const jumpPower = this.properties.jumpPower * this.properties.grip * friction;
                    this.vx -= moveInput * jumpPower * this.properties.wallJumpPower;
                    if (this.inputs.up) this.vy += jumpPower;
                }
            } else if (this.contactEdges.bottom != 0) {
                this.vx += moveInput * this.properties.movePower * this.properties.grip;
                if (this.inputs.down) this.vx *= this.properties.sneakDrag;
                if (this.inputs.up) this.vy += this.properties.jumpPower;
            } else {
                this.vx += moveInput * this.properties.airMovePower;
            }
            // apply gravity
            this.vy -= this.properties.gravity;
        }
        // move to next position
        this.nextPosition();
        this.tx = this.x;
        this.ty = this.y;
        this.ta = this.angle;
        // update debug
        const showContactEdgeDebug = gameInstance.value?.showDebugInfo ? 255 : 0;
        (this.components[this.contactEdgeLineOffset + 0] as PathRenderable).color = `rgba(0, 200, 0, ${showContactEdgeDebug * this.contactEdges.left})`;
        (this.components[this.contactEdgeLineOffset + 1] as PathRenderable).color = `rgba(0, 200, 0, ${showContactEdgeDebug * this.contactEdges.right})`;
        (this.components[this.contactEdgeLineOffset + 2] as PathRenderable).color = `rgba(0, 200, 0, ${showContactEdgeDebug * this.contactEdges.top})`;
        (this.components[this.contactEdgeLineOffset + 3] as PathRenderable).color = `rgba(0, 200, 0, ${showContactEdgeDebug * this.contactEdges.bottom})`;
        this.tickUpdateDebugRenderables();
        // send to server
        gameInstance.value?.socket.emit('tick', {
            tick: ControlledPlayer.physicsTick,
            modifiers: this.modifiers.map((mod) => mod.id),
            inputs: this.inputs,
            position: {
                endx: this.x,
                endy: this.y
            }
        } satisfies ControlledPlayerTickInput);
    }

    /**
     * Moves the entity to its "next" position following its velocity (`vx` and `vy`) and map collisions.
     * Note that translations are calculated first, then rotations.
     */
    nextPosition(): void {
        this.contactEdges.left = this.contactEdges.right = this.contactEdges.top = this.contactEdges.bottom = 0;
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
        const mapBounds = {
            x1: -this.boundingBox.left,
            x2: (GameMap.current?.width ?? 1) - this.boundingBox.right,
            y1: -this.boundingBox.bottom - 10,
            y2: (GameMap.current?.height ?? 1) - this.boundingBox.top + 10,
        };
        for (let i = step; i <= 1 && (pos.dx != 0 || pos.dy != 0); i += step) {
            pos.lx = pos.x;
            pos.ly = pos.y;
            pos.x = Math.max(mapBounds.x1, Math.min(pos.x + pos.dx, mapBounds.x2));
            pos.y = Math.max(mapBounds.y1, Math.min(pos.y + pos.dy, mapBounds.y2));
            const col1 = this.collidesWithMap(pos.x, pos.y);
            if (col1 !== null) {
                const col2 = this.collidesWithMap(pos.x, pos.ly);
                if (col2 !== null) {
                    const col3 = this.collidesWithMap(pos.lx, pos.y);
                    if (col3 !== null) {
                        pos.x = pos.lx;
                        pos.y = pos.ly;
                        pos.dx = this.vx = 0;
                        pos.dy = this.vy = 0;
                        this.contactEdges.left = this.contactEdges.right = this.contactEdges.top = this.contactEdges.bottom = col3.friction;
                        break;
                    } else {
                        const dir = pos.x < col2.x;
                        pos.x = pos.lx = dir ? (col2.boundingBox.left - this.boundingBox.right - ControlledPlayer.physicsBuffer) : (col2.boundingBox.right - this.boundingBox.left + ControlledPlayer.physicsBuffer);
                        pos.dx = this.vx = 0;
                        if (dir) this.contactEdges.right = col2.friction;
                        else this.contactEdges.left = col2.friction;
                    }
                } else {
                    const dir = pos.y < col1.y;
                    pos.y = pos.ly = dir ? (col1.boundingBox.bottom - this.boundingBox.top - ControlledPlayer.physicsBuffer) : (col1.boundingBox.top - this.boundingBox.bottom + ControlledPlayer.physicsBuffer);
                    pos.dy = this.vy = 0;
                    if (dir) this.contactEdges.top = col1.friction;
                    else this.contactEdges.bottom = col1.friction;
                }
            }
        }
        this.x = pos.x;
        this.y = pos.y;
        this.angle += this.va;
        this.calculateCollisionInfo();
        // const offset = 2 * ControlledPlayer.physicsBuffer;
        // this.contactEdges.top = this.contactEdges.top || (this.collidesWithMap(this.x, this.y + offset)?.friction ?? this.contactEdges.top);
        // this.contactEdges.bottom = this.contactEdges.bottom || (this.collidesWithMap(this.x, this.y - offset)?.friction ?? this.contactEdges.bottom);
        // this.contactEdges.left = this.contactEdges.left || (this.collidesWithMap(this.x - offset, this.y)?.friction ?? this.contactEdges.left);
        // this.contactEdges.right = this.contactEdges.right || (this.collidesWithMap(this.x + offset, this.y)?.friction ?? this.contactEdges.right);
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
        const sx = Math.max(Math.floor(x + this.boundingBox.left), 0);
        const ex = Math.min(Math.ceil(x + this.boundingBox.right), GameMap.current.width - 1);
        const sy = Math.max(Math.floor(y + this.boundingBox.bottom), 0);
        const ey = Math.min(Math.ceil(y + this.boundingBox.top), GameMap.current.height - 1);
        const dx = x - this.x;
        const dy = y - this.y;
        const vertices = this.vertices.map((p) => ({ x: p.x + dx, y: p.y + dy }));
        for (let cy = sy; cy <= ey; cy++) {
            for (let cx = sx; cx <= ex; cx++) {
                for (const col of GameMap.current.collisionGrid[cy][cx]) {
                    if (x + this.boundingBox.left > col.boundingBox.right
                        || x + this.boundingBox.right < col.boundingBox.left
                        || y + this.boundingBox.top < col.boundingBox.bottom
                        || y + this.boundingBox.bottom > col.boundingBox.top
                    ) {
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
    calculateCollisionInfo(): void {
        this.gridx = Math.floor(this.x);
        this.gridy = Math.floor(this.y);
        this.cosVal = Math.cos(this.angle);
        this.sinVal = Math.sin(this.angle);
        this.boundingBox.right = (Math.abs(this.width * this.cosVal) + Math.abs(this.height * this.sinVal)) / 2;
        this.boundingBox.left = -this.boundingBox.right;
        this.boundingBox.top = (Math.abs(this.height * this.cosVal) + Math.abs(this.width * this.sinVal)) / 2;
        this.boundingBox.bottom = -this.boundingBox.top;
        const hWidth = this.width / 2;
        const hHeight = this.height / 2;
        this.vertices[0] = { x: this.x - this.cosVal * hWidth + this.sinVal * hHeight, y: this.y + this.cosVal * hWidth + this.sinVal * hHeight };
        this.vertices[1] = { x: this.x + this.cosVal * hWidth + this.sinVal * hHeight, y: this.y + this.cosVal * hWidth + this.sinVal * hHeight };
        this.vertices[2] = { x: this.x + this.cosVal * hWidth - this.sinVal * hHeight, y: this.y - this.cosVal * hWidth - this.sinVal * hHeight };
        this.vertices[3] = { x: this.x - this.cosVal * hWidth - this.sinVal * hHeight, y: this.y - this.cosVal * hWidth - this.sinVal * hHeight };
    }

    remove(): void {
        super.remove();
        ControlledPlayer.self = undefined;
    }

    private static readonly physicsPerfMetrics: {
        tpsTimes: number[]
        tpsHist: number[]
        tickTimes: number[]
    } = {
            tpsTimes: [],
            tpsHist: [],
            tickTimes: []
        };

    /**
     * Starts physics tick loop - this is run once and never ends, only slowing down the timer when not in games.
     * Has a PD control loop to match the client tick with the server tick.
     */
    static async startPhysicsTickLoop(): Promise<void> {
        const kP = 3;
        const kI = 1;
        const kD = 2;
        const integralDecay = 0.5;
        let integral = 0;
        let lastError = 0;
        const session = (window as any).bbrPlayerPhysicsSession = Math.random();
        while ((window as any).bbrPlayerPhysicsSession == session) {
            const start = performance.now();
            ControlledPlayer.physicsTick++;
            ControlledPlayer.self?.physicsTick();
            const end = performance.now();
            // use start so 0tps is reportable
            this.physicsPerfMetrics.tpsTimes.push(start);
            while (this.physicsPerfMetrics.tpsTimes[0] <= end - 1000) {
                this.physicsPerfMetrics.tpsTimes.shift();
                this.physicsPerfMetrics.tpsHist.shift();
                this.physicsPerfMetrics.tickTimes.shift();
            }
            this.physicsPerfMetrics.tpsHist.push(this.physicsPerfMetrics.tpsTimes.length);
            this.physicsPerfMetrics.tickTimes.push(end - start);
            const error = ControlledPlayer.physicsTick - Entity.tick;
            integral = integralDecay * integral + error;
            if (!document.hidden || ControlledPlayer.physicsTick >= Entity.tick) await new Promise<void>((resolve) => setTimeout(resolve, (1000 / Math.max(2, Entity.serverTps - (kP * error + kI * integral + kD * (error - lastError)))) - end + start));
            lastError = error;
        }
    }

    /**
     * Retrieves physics ticking performance data
     */
    static get physicsPerformanceMetrics() {
        return {
            tps: {
                curr: this.physicsPerfMetrics.tpsTimes.length,
                avg: this.physicsPerfMetrics.tpsHist.reduce((p, c) => p + c, 0) / this.physicsPerfMetrics.tpsHist.length,
                max: Math.max(...this.physicsPerfMetrics.tpsHist),
                min: Math.min(...this.physicsPerfMetrics.tpsHist),
                jitter: Math.max(...this.physicsPerfMetrics.tpsHist) - Math.min(...this.physicsPerfMetrics.tpsHist)
            },
            timings: {
                avg: this.physicsPerfMetrics.tickTimes.reduce((p, c) => p + c, 0) / this.physicsPerfMetrics.tickTimes.length,
                max: Math.max(...this.physicsPerfMetrics.tickTimes),
                min: Math.min(...this.physicsPerfMetrics.tickTimes)
            }
        }
    }

    /**
     * Should never be used
     */
    static onTick(): void {
        throw new Error('Cannot call ControlledPlayer.onTick');
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
    readonly overridePosition: boolean
    readonly hp: number
    readonly maxHp: number
}

/**
 * A point in 2D space
 */
export interface Point {
    x: number
    y: number
}

/**
 * A collidable entity for player physics.
 */
export class Collidable extends PathRenderable {
    x: number;
    y: number;
    /**Relative coordinates of axis-aligned rectangular bounding box - left/right are X, top/bottom are Y */
    readonly boundingBox: {
        left: number
        right: number
        top: number
        bottom: number
    }

    constructor(x: number, y: number, points: PathRenderable['points'], dispColor: string) {
        super({ points: points, color: dispColor, lineWidth: 0.04, close: true });
        this.x = x;
        this.y = y;
        const xcoords = points.map((p) => p.x);
        const ycoords = points.map((p) => p.y);
        this.boundingBox = {
            left: Math.min(...xcoords),
            right: Math.max(...xcoords),
            top: Math.max(...ycoords),
            bottom: Math.min(...ycoords)
        };
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
    /**Position of player at end of tick (for verification of player position) */
    readonly position: {
        endx: number
        endy: number
    }
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

if (import.meta.env.DEV) {
    if ((window as any).Player == undefined) {
        (window as any).Player = Player;
        (window as any).ControlledPlayer = ControlledPlayer;
    }
}