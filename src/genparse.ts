import { BaseGen } from "./genbase"

/**
 * expose the parse tree
 */

export default class ParseGen extends BaseGen {
    public generate() {
        return JSON.stringify(this.parsed, null, 2)
    }
}
