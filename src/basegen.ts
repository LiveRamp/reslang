import { IDefinition, IAttribute } from "./treetypes"
import { parseFile } from "./parse"
import { importDeclaration } from "@babel/types"

export abstract class BaseGen {
    protected imports: any[]
    protected defs: IDefinition[]
    protected imported: { [key: string]: IDefinition } = {}

    public constructor(
        protected path: string,
        protected title: string,
        protected tree: any[]
    ) {
        this.imports = tree[1]
        this.defs = tree[2]
    }

    public processImports() {
        for (const imp of this.imports) {
            // process each file
            const timp = imp as { import: string; file: string }
            const itree = parseFile(this.path + timp.file + ".reslang")
            const idef = this.extractDefinition(imp.import, itree[2])

            if (this.extractDefinitionGently(idef.name, this.defs)) {
                throw new Error(
                    `Cannot import ${idef.name} from namespace ${
                        timp.file
                    } as it already exists in ${this.title}`
                )
            }
            this.imported[idef.name] = idef
            this.defs.push(idef)
        }
    }

    protected extractDefinitionId(definitionName: string, defs: any[]) {
        for (const def of defs) {
            if (def.name === definitionName) {
                return this.extractId(def)
            }
        }
        throw new Error("Cannot find definition for " + definitionName)
    }

    protected extractDefinition(definitionName: string, defs: IDefinition[]) {
        const def = this.extractDefinitionGently(definitionName, defs)
        if (def) {
            return def
        }
        throw new Error("Cannot find definition for " + definitionName)
    }

    protected extractDefinitionGently(
        definitionName: string,
        defs: IDefinition[]
    ) {
        for (const def of defs) {
            if (def.name === definitionName) {
                return def
            }
        }
        return null
    }

    protected extractId(node: any): IAttribute {
        if (node.attributes) {
            for (const attr of node.attributes) {
                if (attr.name === "id") {
                    return attr
                }
            }
        }
        throw new Error("Cannot find id attribute for " + node.name)
    }
}
