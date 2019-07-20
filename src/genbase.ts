import { IDefinition, IAttribute, IImport, INamespace } from "./treetypes"
import { parseFile } from "./parse"
import { readdirSync } from "fs"

export abstract class BaseGen {
    protected namespace!: INamespace
    protected defs: IDefinition[] = []
    private loaded = new Set<string>()

    public constructor(private dirs: string[]) {
        this.processDefinitions()
    }

    public processDefinitions() {
        let main = true
        for (const dirname of this.dirs) {
            this.processDefinition(dirname, main)
            main = false
        }
    }

    public processDefinition(dirname: string, main: boolean) {
        // parse the files in the directory
        const match = dirname.match(/(?<path>.*\/)?(?<last>.+)/)
        if (!match) {
            throw new Error(`Cannot locate directory: ${dirname}`)
        }

        const path = match!.groups!.path || "./"
        const nspace = match!.groups!.last || "??"

        // if we have loaded this namespace previously, don't do it again
        if (this.loaded.has(nspace)) {
            return
        }
        this.loaded.add(nspace)

        // process all files in this directory
        for (const fname of readdirSync(dirname)) {
            if (fname.endsWith(".reslang")) {
                const local = parseFile(path + nspace + "/" + fname, nspace)
                if (local[0] && main) {
                    if (!this.namespace) {
                        this.namespace = local[0]
                    } else {
                        throw new Error(
                            "Cannot specify more than one namespace in a directory: " +
                                local[0]
                        )
                    }
                }
                // copy over all the defs
                for (const def of local[2] as IDefinition[]) {
                    def.secondary = !main
                    this.defs.push(def)
                }

                // handle any imports
                for (const imp of local[1] as IImport[]) {
                    this.processDefinition(path + imp.import, false)
                }
            }
        }
        // must have a namespace
        if (!this.namespace) {
            throw new Error(`No namespace present in ${dirname}`)
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
            return this.extractDefinitionId(node.extends.name, this.defs)
        }

        throw new Error("Cannot find id attribute for " + node.name)
    }
}
