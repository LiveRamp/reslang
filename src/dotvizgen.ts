import { IDefinition } from "./treetypes"

export class DotvizGen {
    private defs: IDefinition[]

    public constructor(private tree: any) {
        this.defs = tree[2]
    }
}
