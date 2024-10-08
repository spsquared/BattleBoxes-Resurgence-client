import { Entity, type EntityTickData } from "./entity";

export class Player extends Entity {
    static readonly list: Map<string, Player> = new Map();

    readonly username: string;

    constructor(id: number, username: string, x: number, y: number, color: string) {
        super(id, x, y, 48, 48, color);
        this.username = username;
        if (Player.list.has(this.username)) throw new Error(`Duplicate Player "${this.username}"!`);
        Player.list.set(this.username, this);
    }

    tick(packet: PlayerTickData): void {
        super.tick(packet);
        this.color
    }

    static onTick(players: PlayerTickData[]): void {
        console.log(players)
        const updated: Set<Player> = new Set();
        for (const uPlayer of players) {
            console.log(uPlayer)
            const player = Player.list.get(uPlayer.username);
            if (player !== undefined) {
                player.tick(uPlayer);
                updated.add(player);
            } else {
                const newPlayer = new Player(uPlayer.id, uPlayer.username, uPlayer.x, uPlayer.y, uPlayer.color);
                Player.list.set(newPlayer.username, newPlayer);
                newPlayer.tick(uPlayer);
                updated.add(newPlayer);
            }
        }
        for (const [username, player] of Player.list) {
            if (!updated.has(player)) Player.list.delete(username);
        }
    }
}

export interface PlayerTickData extends EntityTickData {
    readonly username: string
    readonly color: string
    readonly contactEdges: {
        left: boolean
        right: boolean
        top: boolean
        bottom: boolean
    }
}