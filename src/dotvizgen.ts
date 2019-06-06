import { IDefinition } from "./treetypes"

/**
 * generate .viz output for a graphical view of the resources
 */

export class DotvizGen {
    private defs: IDefinition[]

    public constructor(
        private path: string,
        private title: string,
        private tree: any
    ) {
        this.defs = tree[2]
    }

    public generate() {
        return `digraph G {
            graph [charset=latin1]
            node [fontsize=10]
            a [label = "hello"];
            }`
    }
}
