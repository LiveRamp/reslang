import {
    IDefinition,
    IAttribute,
    IImport,
    INamespace,
    IOperation,
    IDiagram,
    IDocumentation,
    IDocEntry,
    ResourceType,
    IReference
} from "./treetypes"
import { parseFile } from "./parse"
import { readdirSync } from "fs"
import lpath from "path"
import { IRules, RULES } from "./rules"
const LOCAL = "local.reslang"
const LOCAL_INCLUDE = lpath.join(__dirname, "library", LOCAL)

export abstract class BaseGen {
    protected namespace!: INamespace
    protected mainNamespace?: string
    protected defs: IDefinition[] = []
    protected diagrams: IDiagram[] = []
    protected documentation: { [name: string]: IDocEntry[] } = {}
    private loaded = new Set<string>()

    public constructor(private dirs: string[], private rules: IRules) {
        this.processDefinitions()
        this.checkRules()
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
        const match = dirname.match(/(?<path>.*\/)?(?<last>[^/]+)/)
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
        if (main) {
            this.mainNamespace = nspace
        }

        // process all files in this directory
        const files = readdirSync(dirname).map(fname => {
            return { file: fname, full: path + nspace + "/" + fname }
        })
        files.push({ file: LOCAL, full: LOCAL_INCLUDE })
        for (const lst of files) {
            const fname = lst.full
            const reallyMain = main
            if (fname.endsWith(".reslang")) {
                const local = parseFile(fname, nspace, this.mainNamespace!)
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

                // handle any imports
                for (const imp of local[1] as IImport[]) {
                    this.processDefinition(path + imp.import, false)
                }
                // copy over all the defs
                for (const def of local[2] as IDefinition[]) {
                    def.secondary = !reallyMain
                    def.file = lst.file
                    this.defs.push(def)
                }
                // copy over all the diagrams
                for (const diag of local[3] as IDiagram[]) {
                    this.diagrams.push(diag)
                }

                // copy over all the documentation
                for (const doc of local[4] as IDocumentation[]) {
                    this.documentation[doc.name] = doc.entries
                }
            }
        }
        // must have a namespace
        if (!this.namespace) {
            throw new Error(`No namespace present in ${dirname}`)
        }
    }

    // check all the rules for this api
    public checkRules() {
        if (this.rules.ignoreRules) {
            return
        }

        // check depth of each structure & other rules
        const maxResource = this.rules.maxResourceDepth
        const maxAction = this.rules.maxActionDepth

        for (const def of this.defs) {
            // is the resource too deep?
            if (
                maxResource &&
                ResourceType.includes(def.type) &&
                def.parents.length >= maxResource
            ) {
                throw new Error(
                    `RULE maxResourceDepth(${maxResource}) violated: ${
                        def.name
                    }\n
The maximum depth a resource can be nested is ${maxResource} levels. Your level is ${def
                        .parents.length + 1}`
                )
            }
            // if the action too deep?
            if (
                maxAction &&
                def.type === "action" &&
                def.parents.length >= maxAction
            ) {
                throw new Error(
                    `RULE maxActionDepth(${maxAction}) violated: ${def.name}\n
The maximum resource depth an action can be is ${maxAction} levels. Your level is ${def.parents.length}`
                )
            }
            // is the action only supposed to be on requests?
            if (def.type === "action" && this.rules.actionsOnRequestsOnly) {
                const parent = this.extractDefinition(def.parentName)
                if (parent.type !== "request-resource") {
                    throw new Error(
                        `RULE actionsOnRequestsOnly violated: ${def.name}
You can only add actions to request resources`
                    )
                }
            }

            // if a config resource, check outgoing links only to other configs or subresources of configs
            if (
                this.rules.checkRules &&
                this.rules.checkRules.includes(RULES.ONLY_CONFIG_TO_CONFIG)
            ) {
                const myType = this.getTopLevelType(def)
                if (myType.type === "configuration-resource") {
                    for (const attr of def.attributes || []) {
                        if (attr.linked) {
                            const linkType = this.getTopLevelType(attr.type)
                            if (linkType.type !== "configuration-resource") {
                                throw new Error(
                                    `RULE ONLY_CONFIG_TO_CONFIG violated: ${def.name}\n
Configuration resources can only link to other configuration resources`
                                )
                            }
                        }
                    }
                }
            }

            // if parent is an action, we have an issue
            if (
                this.rules.checkRules &&
                this.rules.checkRules.includes(RULES.NO_ACTION_SUBRESOURCES) &&
                def.parentName
            ) {
                const parent = this.extractDefinition(def.parentName)
                if (parent.type === "action") {
                    throw new Error(
                        `RULE NO_ACTION_SUBRESOURCE violated: ${def.name}
Actions cannot have subresources`
                    )
                }
            }
        }
    }

    // find the top level type
    protected getTopLevelType(ref: IReference) {
        const def = this.extractDefinition(ref.name)
        let current = def
        while (true) {
            if (!current.parentName) {
                return current
            }
            current = this.extractDefinition(current.parentName)
        }
    }

    protected extractDefinition(definitionName: string) {
        const def = this.extractDefinitionGently(definitionName)
        if (def) {
            return def
        }
        throw new Error("Cannot find definition for " + definitionName)
    }

    protected extractDefinitionGently(definitionName: string) {
        for (const def of this.defs) {
            if (def.name === definitionName) {
                return def
            }
        }
        return null
    }

    protected extractDefinitionId(definitionName: string) {
        for (const def of this.defs) {
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

        throw new Error("Cannot find id attribute for " + node.name)
    }

    /** determine if we should generate input or output definitions for each entity */
    protected markGenerate(includeErrors: boolean) {
        // handle each primary structure and work out if we should generate structures for it
        for (const el of this.defs) {
            // don't generate for any imported def
            if (el.secondary || el.future) {
                continue
            }

            if (
                [
                    "asset-resource",
                    "configuration-resource",
                    "subresource",
                    "request-resource",
                    "action"
                ].includes(el.type)
            ) {
                const post = this.extractOp(el, "POST")
                const multiget = this.extractOp(el, "MULTIGET")

                if (!el.singleton && (post || multiget)) {
                    if (post) {
                        el.generateInput = true
                    }
                    if (multiget) {
                        el.generateMulti = true
                        el.generateOutput = true
                    }
                }

                const get = this.extractOp(el, "GET")
                const put = this.extractOp(el, "PUT")
                const patch = this.extractOp(el, "PATCH")

                if (put) {
                    el.generatePuttable = true
                }
                if (patch) {
                    el.generatePatchable = true
                }
                if (get) {
                    el.generateOutput = true
                }
            }

            // now work out if attributes reference any structures or other resources
            for (const attr of el.attributes || []) {
                const def = this.extractDefinitionGently(attr.type.name)
                if (def && !attr.inline && !attr.linked) {
                    def.generateInput = true
                }
            }

            // now process errors
            if (includeErrors) {
                for (const op of el.operations || []) {
                    for (const err of op.errors || []) {
                        // locate the error type and mark it for generation
                        this.extractDefinition(
                            err.struct.name
                        ).generateInput = true
                    }
                }
            }
        }
        // mark the standarderror as included - it is referenced implicitly by some operations
        this.extractDefinition("StandardError").generateInput = true
    }

    protected extractOp(el: any, op: string): IOperation | null {
        if (el.operations) {
            for (const oper of el.operations) {
                if (oper.operation === op) {
                    return oper
                }
            }
        }
        return null
    }
}
