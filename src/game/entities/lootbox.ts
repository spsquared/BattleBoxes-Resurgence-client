import { RectangleRenderable, TextRenderable } from "../renderer";
import Entity, { type EntityTickData } from "./entity";

export class LootBox extends Entity {
    static get tick(): number { return Entity.tick; }
    static readonly list: Map<number, LootBox> = new Map();

    readonly type: LootBoxType;

    constructor(data: LootBoxTickData) {
        super(data);
        this.type = data.type;
        this.components.push(new RectangleRenderable({ color: 'blue' }))
        this.components.push(new TextRenderable({ text: 'lootbox' + this.type, color: 'red' }))
        LootBox.list.set(this.id, this);
    }
}

/**
 * All data necessary to create one lootbox on the client, fetched each tick.
 */
export interface LootBoxTickData extends EntityTickData {
    readonly type: LootBoxType
}

export enum LootBoxType {
    RANDOM = '',
    POSITIVE = '+',
    NEGATIVE = '-'
}

export default LootBox;

if (import.meta.env.DEV) {
    if ((window as any).LootBox == undefined) (window as any).LootBox = LootBox;
}