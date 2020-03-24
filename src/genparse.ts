import { BaseGen } from "./genbase"

/**
 * expose the parse tree
 */

export default class ParseGen extends BaseGen {
    public generate() {
        return JSON.stringify(
            {
                namespace: this.namespace,
                definitions: this.defs,
                diagrams: this.diagrams
            },
            null,
            2
        )
    }
}
