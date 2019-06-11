import { IDefinition, IAttribute, IVersion, IImport } from "./treetypes"
import { parseFile } from "./parse"
import { importDeclaration } from "@babel/types"

export abstract class BaseGen {
    protected tree!: any[]
    protected defs: IDefinition[] = []
    protected title!: string
    protected version!: IVersion
    protected imported: { [key: string]: IDefinition } = {}

    public constructor(private files: string[]) {
        this.processDefinitions()
    }

    public processDefinitions() {
        let single = this.files.length == 1
        let first = true

        // parse the files
        const infos: { path: string; tree: any[] }[] = []
        for (const fname of this.files) {
            const match = fname.match(/(?<path>.*\/)?(?<file>.*).reslang/)
            if (!match) {
                console.error(`Filename ${fname} must have .reslang extension`)
                process.exit(-1)
            }
            const path = match!.groups!.path ? match!.groups!.path : "./"
            this.tree = parseFile(fname)
            infos.push({ path, tree: this.tree })
            if (!this.title) {
                this.title = match!.groups!.file
                this.version = this.tree[0] as IVersion
            }
        }

        // process normal defs first, then imports if not in the namespace
        for (let lp = 0; lp < 2; lp++) {
            for (const info of infos) {
                const mydefs = info.tree[2] as IDefinition[]
                if (lp == 0) {
                    for (const mydef of mydefs) {
                        this.defs.push(mydef)
                    }
                } else {
                    // handle imports
                    const imports = info.tree[1] as IImport[]
                    for (const imp of imports) {
                        const itree = parseFile(
                            info.path + imp.file + ".reslang"
                        )
                        const idef = this.extractDefinition(
                            imp.import,
                            itree[2]
                        )
                        const exist = this.extractDefinitionGently(
                            idef.name,
                            this.defs
                        )

                        if (exist && single) {
                            console.log(exist)
                            throw new Error(
                                `Cannot import ${idef.name} from namespace ${
                                    imp.file
                                } as it already exists in ${this.title}`
                            )
                        }
                        if (!exist) {
                            this.imported[idef.name] = idef
                            this.defs.push(idef)
                        }
                    }
                }
            }
        }
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

    protected extractDefinitionId(definitionName: string, defs: IDefinition[]) {
        for (const def of defs) {
            if (def.name === definitionName) {
                return this.extractId(def)
            }
        }
        throw new Error("Cannot find definition for " + definitionName)
    }

    protected extractId(node: IDefinition): IAttribute {
        if (node.attributes) {
            for (const attr of node.attributes) {
                if (attr.name === "id") {
                    return attr
                }
            }
        }
        // ask base if this doesn't have one
        if (node.extends) {
            return this.extractDefinitionId(node.extends, this.defs)
        }

        throw new Error("Cannot find id attribute for " + node.name)
    }
}
