import { BaseGen } from "./genbase"

/**
 * expose the parse tree
 */

export default class ParseGen extends BaseGen {
    public generate() {
        return JSON.stringify(
            { namespace: this.namespace, defs: this.defs },
            null,
            2
        )
    }
}
