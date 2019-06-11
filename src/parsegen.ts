import { fixName, pluralizeName, getVersion } from "./names"
import { parseFile } from "./parse"
import { IImport, IDefinition, IAttribute, IOperation } from "./treetypes"
import { BaseGen } from "./basegen"

/**
 * expose the parse tree
 */

export default class ParseGen extends BaseGen {
    public generate() {
        return JSON.stringify(this.tree, null, 2)
    }
}
