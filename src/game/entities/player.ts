import { connectionState } from '@/server';

import gameInstance from '../game';
import GameMap from '../map';
import Entity from './entity';

import type { EntityTickData } from './entity';

/**
 * Uncontrolled player entity.
 */
export class Player extends Entity {
    static get tick(): number { return Entity.tick; }

    static readonly list: Map<string, Player> = new Map();

    readonly username: string;

    constructor(id: number, username: string, x: number, y: number, color: string) {
        super(id, x, y, 0.75, 0.75, color);
        this.username = username;
        if (Player.list.has(this.username)) throw new Error(`Duplicate Player "${this.username}"!`);
        Player.list.set(this.username, this);
    }

    tick(packet: PlayerTickData): void {
        super.tick(packet);
        this.color = packet.color;
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

    static baseProperties: ControlledPlayer['properties'] = {
        gravity: 0,
        movePower: 0,
        jumpPower: 0,
        airMovePower: 0,
        drag: 0,
        friction: 0,
        grip: 0
    };
    properties: {
        gravity: number
        movePower: number
        jumpPower: number
        airMovePower: number
        drag: number
        friction: number
        grip: number
    } = {
            gravity: ControlledPlayer.baseProperties.gravity,
            movePower: ControlledPlayer.baseProperties.movePower,
            jumpPower: ControlledPlayer.baseProperties.jumpPower,
            airMovePower: ControlledPlayer.baseProperties.airMovePower,
            drag: ControlledPlayer.baseProperties.drag,
            friction: ControlledPlayer.baseProperties.friction,
            grip: ControlledPlayer.baseProperties.grip
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

    constructor(id: number, username: string, x: number, y: number, color: string) {
        super(id, username, x, y, color);
        this.gridx = Math.floor(this.x);
        this.gridy = Math.floor(this.y);
    }

    tick(packet: PlayerTickData): void {
        super.tick(packet);
        this.properties = packet.properties;
        this.modifiers = packet.modifiers;
    }

    /**
     * Player-unique physics tick to reduce input lag. Runs player movement and attempts to synchronize
     * with server tickrate. Any physics will be validated by the server.
     */
    physicsTick(): void {
        // tick simulation - should be identical to server (but server can override anyway)
        // update modifiers
        // modifiers always count down
        // modifiers will stay at full until the server counts down because server overrides timers
        // movement
        // see server code for explanation of player movement (under `/game/entities/player.ts/Player/physicsTick()`)
        const onWall = (this.contactEdges.left || this.contactEdges.right) != 0;
        const onGround = (this.contactEdges.bottom || onWall) != 0;
        // apply contact friction
        this.vx *= this.properties.friction * (this.contactEdges.top || 1) * (this.contactEdges.bottom || 1);
        this.vy *= this.properties.friction * (this.contactEdges.left || 1) * (this.contactEdges.right || 1);
        // apply air drag
        this.vx *= this.properties.drag;
        this.vy *= this.properties.drag;
        // apply input velocity
        const groundGrip = this.properties.grip * (!onGround ? this.properties.airMovePower : (onWall ? -1 : 1));
        const wallGrip = this.properties.grip * (this.contactEdges.left || 1) * (this.contactEdges.right || 1);
        if ((this.contactEdges.left && this.inputs.left) || (this.contactEdges.right && this.inputs.right)) this.vy *= Math.pow(2, -wallGrip);
        this.vx += ((this.inputs.left ? -1 : 0) + (this.inputs.right ? 1 : 0)) * this.properties.movePower * groundGrip;
        if (this.contactEdges.bottom && this.inputs.up) this.vy += this.properties.jumpPower * wallGrip;
        // apply gravity
        this.vy -= this.properties.gravity * Math.cos(this.angle);
        this.vx += this.properties.gravity * Math.sin(this.angle);
        // move to next position
        this.nextPosition();
        // send to server
        gameInstance.value?.socket.emit('tick', {
            tick: ControlledPlayer.physicsTick,
            modifiers: this.modifiers.map((mod) => mod.id),
            inputs: this.inputs
        } satisfies ControlledPlayerTickInput);
    }

    /**
     * Moves the entity to its "next" position following its velocity (`vx` and `vy`) and map collisions.
     * Note that translations are calculated first, then rotations.
     */
    nextPosition(): void {
        this.calculateCollisionInfo();
        const startx = this.x;
        const starty = this.y;
        const steps = Math.max(Math.abs(this.vx), Math.abs(this.vy)) * ControlledPlayer.physicsResolution;
        const step = 1 / steps;
        const pos = {
            x: this.x,
            y: this.y,
            lx: this.x,
            ly: this.y
        };
        console.log(this.x, this.y)
        for (let i = step; i <= 1; i += step) {
            pos.lx = pos.x;
            pos.ly = pos.y;
            pos.x = this.x + this.vx * i;
            pos.y = this.y + this.vy * i;
            if (this.collidesWithMap(pos.x, pos.y) != 0) {
                console.log('collision1', ControlledPlayer.physicsTick)
                if (this.collidesWithMap(pos.x, pos.ly) != 0) {
                    console.log('collision2', ControlledPlayer.physicsTick)
                    if (this.collidesWithMap(pos.lx, pos.y) != 0) {
                        console.log('collision3', ControlledPlayer.physicsTick)
                        pos.x = pos.lx;
                        pos.y = pos.ly;
                        break;
                    } else {
                        pos.x = pos.lx;
                    }
                } else {
                    pos.y = pos.ly;
                }
            }
        }
        this.x = pos.x;
        this.y = pos.y;
        this.vx = this.x - startx;
        this.vy = this.y - starty;
        this.angle += this.va;
        this.calculateCollisionInfo();
        const invRes = 1 / ControlledPlayer.physicsResolution;
        this.contactEdges.left = this.collidesWithMap(this.x - invRes, this.y);
        this.contactEdges.right = this.collidesWithMap(this.x + invRes, this.y);
        this.contactEdges.top = this.collidesWithMap(this.x, this.y - invRes);
        this.contactEdges.bottom = this.collidesWithMap(this.x, this.y + invRes);
    }

    /**
     * If the entity would intersect with any part of the map when placed at the coordinates (`x`, `y`).
     * If so, returns the friction coefficient of the colliding segment.
     * **Note:** Surfaces with zero friction will appear to be non-collidable!
     * @param x X coordinate to test
     * @param y Y coordinate to test
     * @returns Friction coefficient of contacted map, or 0 if no contact
     */
    collidesWithMap(x: number, y: number): number {
        if (GameMap.current === undefined) return 0;
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
                    if (Math.abs(x - col.x) <= this.halfBoundingWidth + col.halfBoundingWidth && Math.abs(y - col.y) <= this.halfBoundingHeight + col.halfBoundingHeight) {
                        console.log(vertices, col.vertices)
                        for (const p of vertices) {
                            if (col.vertices.every((q, i) => ControlledPlayer.isWithin(p, q, col.vertices[(i + 1) % col.vertices.length]))) {
                                return col.friction;
                            }
                        }
                        for (const p of col.vertices) {
                            if (vertices.every((q, i) => ControlledPlayer.isWithin(p, q, vertices[(i + 1) % vertices.length]))) {
                                return col.friction;
                            }
                        }
                    }
                }
            }
        }
        return 0;
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
        this.vertices[1] = { x: this.x + this.cosVal * hWidth + this.sinVal * hHeight, y: this.y - this.cosVal * hWidth + this.sinVal * hHeight };
        this.vertices[2] = { x: this.x + this.cosVal * hWidth - this.sinVal * hHeight, y: this.y - this.cosVal * hWidth - this.sinVal * hHeight };
        this.vertices[3] = { x: this.x - this.cosVal * hWidth - this.sinVal * hHeight, y: this.y + this.cosVal * hWidth - this.sinVal * hHeight };
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
            if (!document.hidden || ControlledPlayer.physicsTick >= Entity.tick) await new Promise<void>((resolve) => setTimeout(resolve, (1000 / Math.max(1, Entity.serverTps - kP * error - kD * (error - lastError))) - end + start));
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
    x: number,
    y: number
}

export interface Collidable {
    x: number
    y: number
    halfBoundingWidth: number
    halfBoundingHeight: number
    readonly vertices: Point[]
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