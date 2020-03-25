import {
    IDefinition,
    IAttribute,
    IImport,
    INamespace,
    IOperation,
    IDiagram,
    IDocumentation,
    IDocEntry,
    ResourceLike,
    IReference,
    isResourceLike,
    IResourceLike,
    AnyKind,
    IEnum,
    IStructure,
    IUnion,
    isStructure
} from "./treetypes"
import { parseFile, isPrimitiveType } from "./parse"
import { readdirSync } from "fs"
import lpath from "path"
import { IRules } from "./rules"
import { camelCase, capitalizeFirst, pluralizeName } from "./names"
const LOCAL = "local.reslang"
const LOCAL_INCLUDE = lpath.join(__dirname, "library", LOCAL)
export enum Verbs {
    POST,
    PUT,
    PATCH,
    GET,
    MULTIGET,
    DELETE
}

export abstract class BaseGen {
    public static readonly COMMENT_REGEX = /See docs:\s*(?<doc>\w+)\.(?<entry>\w+)/

    protected namespace!: INamespace
    protected mainNamespace?: string
    // the user defined space, if there is one, in the namespace definition
    protected space?: string
    protected defs: AnyKind[] = []
    protected diagrams: IDiagram[] = []
    protected documentation: { [name: string]: IDocEntry[] } = {}
    protected empty = new Set<string>()
    protected loaded = new Set<string>()

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
                for (const def of local[2] as AnyKind[]) {
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
                ResourceLike.includes(def.type) &&
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
            if (this.rules.onlyConfigToConfig && isResourceLike(def)) {
                const myType = this.getTopLevelType(def)
                if (
                    isResourceLike(myType) &&
                    myType.type === "configuration-resource"
                ) {
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
            if (this.rules.noSubresourcesOnActions && def.parentName) {
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

    protected getSpace() {
        return (this.namespace.space || this.mainNamespace || "").toLowerCase()
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

    protected extractDefinition(definitionName: string): AnyKind {
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
            if (isResourceLike(def) && def.name === definitionName) {
                return this.extractId(def)
            }
        }
        throw new Error("Cannot find definition for " + definitionName)
    }

    protected extractId(node: IResourceLike): IAttribute {
        if (node.attributes) {
            for (const attr of node.attributes) {
                if (attr.name === "id") {
                    return attr
                }
            }
        }

        throw new Error("Cannot find id attribute for " + node.name)
    }

    protected addResourceDefinition(
        definitions: any,
        def: IResourceLike,
        verb: Verbs,
        suffix: string
    ) {
        const attrs = def.attributes || []
        const properties: any = {}
        const required: string[] = []
        const request = {
            type: "object",
            properties,
            required,
            description: def.comment
        } as {
            type: string
            properties: any
            required: string[]
            description: string
            allOf: {}
        }
        for (const attr of attrs as IAttribute[]) {
            if (attr.modifiers.queryonly || attr.modifiers.representation) {
                continue
            }
            // no id types for input ever
            if (attr.name === "id" && verb !== Verbs.GET) {
                continue
            }
            // if we have a mutation operation and the attribute is not marked as mutable, skip it
            if (
                (verb === Verbs.PATCH || verb === Verbs.PUT) &&
                !attr.modifiers.mutable
            ) {
                continue
            }
            // if this is marked as output, suppress all other verbs
            if (attr.modifiers.output && verb !== Verbs.GET) {
                continue
            }

            // if this optional?
            let optional = attr.modifiers.optional || verb === Verbs.PATCH
            optional =
                optional ||
                (verb === Verbs.POST && attr.modifiers.optionalPost) ||
                (verb === Verbs.PUT && attr.modifiers.optionalPut) ||
                (verb === Verbs.GET && attr.modifiers.optionalGet)

            if (attr.inline) {
                this.unpackInlineAttributes(attr, def, properties, required)
            } else {
                const prop = this.makeProperty(attr)
                properties[prop.name] = prop.prop
                if (!optional) {
                    required.push(attr.name)
                }
            }
        }

        if (request.required.length === 0) {
            delete request.required
        }

        const unique = camelCase(this.formSingleUniqueName(def))
        if (Object.keys(properties).length !== 0) {
            definitions[unique + suffix] = request
        } else {
            this.empty.add(unique + suffix)
        }
    }

    protected formOperationId(def: IResourceLike, verb: Verbs) {
        const bulk = def.bulk ? "Bulk " : ""

        // handle action creation separately - make it sound like an action e.g. retry DeliveryRequest
        if (def.type === "action" && verb === Verbs.POST) {
            return (
                bulk +
                def.short +
                " " +
                this.removeLast(def.name) +
                (def.async ? " asynchronously" : "")
            )
        }

        switch (verb) {
            case Verbs.POST:
                return "Create " + bulk + def.name
            case Verbs.PUT:
                return "Modify " + bulk + def.name
            case Verbs.PATCH:
                return "Patch " + bulk + def.name
            case Verbs.GET:
                return "Get " + bulk + def.name
            case Verbs.MULTIGET:
                return "Get " + bulk + pluralizeName(def.name)
            case Verbs.DELETE:
                return "Delete " + bulk + def.name
        }
    }

    // add bulk modifier if needed
    protected formSingleUniqueName(def: AnyKind) {
        if (isResourceLike(def) && def.type === "action") {
            if (def.bulk) {
                return (
                    (def.bulk ? "Bulk " : "") +
                    def.short +
                    " " +
                    this.removeLast(def.name)
                )
            }
            return capitalizeFirst(def.short) + " " + this.removeLast(def.name)
        }
        return def.name
    }

    protected removeLast(name: string) {
        const pos = name.lastIndexOf("::")
        if (pos === -1) {
            return name
        }
        return name.slice(0, pos)
    }

    protected addEnumDefinition(definitions: any, def: IEnum, suffix: string) {
        const name = camelCase(def.name) + suffix
        const en = {
            type: "string",
            description: def.comment,
            enum: def.literals
        }
        definitions[name] = en
    }

    protected addStructureDefinition(
        definitions: any,
        def: AnyKind,
        suffix: string,
        attrs: IAttribute[]
    ) {
        const properties: any = {}
        const required: string[] = []
        const request = {
            type: "object",
            properties,
            required,
            description: def.comment
        } as {
            type: string
            properties: any
            required: string[]
            description: string
            allOf: {}
        }
        const sane = camelCase(def.name) + suffix

        for (const attr of attrs as IAttribute[]) {
            if (attr.modifiers.queryonly || attr.modifiers.representation) {
                continue
            }
            // if this optional?
            const optional = attr.modifiers.optional

            if (attr.inline) {
                this.unpackInlineAttributes(attr, def, properties, required)
            } else {
                const prop = this.makeProperty(attr)
                if (!optional) {
                    required.push(attr.name)
                }
                properties[prop.name] = prop.prop
            }
        }

        if (request.required.length === 0) {
            delete request.required
        }

        if (Object.keys(properties).length !== 0) {
            definitions[sane] = request
        } else {
            this.empty.add(sane)
        }
        return sane // return what we called this
    }

    protected addUnionDefinition(
        definitions: any,
        def: IUnion | IStructure,
        suffix: string
    ) {
        const attrs = def.attributes || []
        const mapping: { [key: string]: string } = {}

        const name = camelCase(def.name) + suffix
        for (const attr of attrs) {
            // cannot have a competing definition already
            const camel = capitalizeFirst(attr.name)
            const already = this.extractDefinitionGently(camel)
            if (already && already.generateInput /* struct */) {
                throw new Error(
                    "Cannot have union attribute called " +
                        camel +
                        " as definition already exists"
                )
            }
            mapping[attr.name] = "#/components/schemas/" + camel
        }
        const required: string[] = ["type"]
        const request = {
            type: "object",
            properties: { type: { type: "string" } },
            discriminator: {
                propertyName: "type",
                mapping
            },
            required
        }
        definitions[name] = request

        // now do the options
        for (const attr of attrs) {
            const properties: any = {}
            if (attr.inline) {
                this.unpackInlineAttributes(attr, def, properties, required)
            } else {
                properties[attr.name] = this.addType(attr, {}, false)
                if (!attr.modifiers.optional) {
                    required.push(attr.name)
                }
            }
            definitions[capitalizeFirst(attr.name)] = {
                allOf: [
                    { $ref: `#/components/schemas/${name}` },
                    {
                        type: "object",
                        properties
                    }
                ]
            }
        }
        if (request.required.length === 0) {
            delete request.required
        }
    }

    protected unpackInlineAttributes(
        attr: IAttribute,
        def: IDefinition,
        properties: any,
        required: string[]
    ) {
        const indef = this.extractDefinition(attr.type.name)
        if (!isStructure(indef)) {
            throw new Error(
                "Inline attribute " +
                    attr.name +
                    " of " +
                    def.short +
                    " has to be a structure"
            )
        }
        for (const att of indef.attributes || []) {
            const prop = this.makeProperty(att)
            properties[prop.name] = prop.prop
            if (!att.modifiers.optional) {
                required.push(att.name)
            }
        }
    }

    /**
     * make a parameter
     */
    protected makeProperty(attr: IAttribute): { name: string; prop: any } {
        const def = this.extractDefinitionGently(attr.type.name)
        let name = attr.name
        if (def && ResourceLike.includes(def.type)) {
            if (attr.array && !name.endsWith("s")) {
                name = name + "s"
            }
        }
        const prop = {
            description: this.translateDoc(attr.comment)
        }
        this.addType(attr, prop, false)
        return { name, prop }
    }

    protected translatePrimitive(
        attr: IAttribute | null,
        prim: string,
        schema: any,
        example: boolean = true
    ) {
        // check constraints
        if (attr && attr.constraints) {
            if (
                prim !== "string" &&
                (attr.constraints.maxLength || attr.constraints.minLength)
            ) {
                throw new Error(
                    `Cannot apply constraints ${JSON.stringify(
                        attr.constraints
                    )} to primitive type '${prim}'`
                )
            }
        }

        switch (prim) {
            case "string":
                schema.type = "string"
                if (attr && attr.constraints) {
                    const con = attr.constraints
                    if (con.minLength) {
                        schema.minLength = con.minLength
                    }
                    if (con.maxLength) {
                        schema.maxLength = con.maxLength
                    }
                }
                break
            case "url":
                schema.type = "string"
                schema.format = "url"
                if (example) {
                    schema.example = "https://www.domain.com (url)"
                }
                break
            case "int":
                schema.type = "integer"
                schema.format = "int32"
                break
            case "long":
                schema.type = "integer"
                schema.format = "int64"
                break
            case "boolean":
                schema.type = "boolean"
                break
            case "double":
                schema.type = "number"
                break
            case "date":
                schema.type = "string"
                schema.format = "ISO8601 UTC date"
                if (example) {
                    schema.example = "2019-04-13"
                }
                break
            case "time":
                schema.type = "string"
                schema.format = "time"
                if (example) {
                    schema.example = "22:00:01"
                }
                break
            case "datetime":
                schema.type = "string"
                schema.format = "ISO8601 UTC date-time"
                if (example) {
                    schema.example = "2019-04-13T03:35:34Z"
                }
                break
        }
    }

    protected addType(
        attr: IAttribute,
        obj: any,
        schemaLevel = true,
        suppressStringmap = false,
        suppressDescription = false
    ) {
        // if this is a stringmap then add it
        const type = attr.type
        const name = type.name
        const sane = camelCase(name)

        // allow description overrides by caller
        if (!obj.description && !suppressDescription) {
            obj.description = this.translateDoc(attr.comment)
        }
        if (schemaLevel) {
            obj.schema = {}
        }
        const schema = schemaLevel ? obj.schema : obj

        const prim = isPrimitiveType(name)
        if (attr.stringMap && !suppressStringmap) {
            schema.type = "object"
            schema.additionalProperties = this.addType(
                attr,
                {},
                false,
                true,
                true
            )
        } else if (prim) {
            this.translatePrimitive(
                attr,
                type.name,
                schema,
                !attr.modifiers.queryonly
            )
        } else {
            // is this a structure, an enum or a linked resource
            const def = this.extractDefinition(name) as AnyKind
            switch (def.kind) {
                case "structure":
                case "union":
                case "enum":
                    schema.$ref = `#/components/schemas/${sane}`
                    break
                case "resource-like":
                    // must have a linked annotation
                    if (!attr.linked) {
                        throw new Error(
                            `Attribute ${attr.name} references resource ${attr.type} but doesn't use linked`
                        )
                    }
                    this.translatePrimitive(
                        null,
                        this.extractId(def).type.name,
                        schema
                    )
                    if (attr.array) {
                        schema.example = `Link to ${attr.type.name} ${
                            def.future ? "(to be defined in the future) " : ""
                        }resource(s) via id(s)`
                    } else {
                        schema.example = `Link to a ${attr.type.name} ${
                            def.future ? "(to be defined in the future) " : ""
                        }resource via its id`
                    }
                    break
                default:
                    throw Error(
                        `Cannot resolve attribute type ${obj.type} of name ${obj.name}`
                    )
            }
        }

        // if multi, then push down to an array
        if (attr.array) {
            schema.items = {
                type: obj.type,
                example: obj.example,
                $ref: obj.$ref
            }
            if (attr.array.min) {
                schema.minItems = attr.array.min
            }
            if (attr.array.max) {
                schema.maxItems = attr.array.max
            }
            delete schema.type
            delete schema.example
            delete schema.$ref
            schema.type = "array"
        }

        return obj
    }

    protected translateDoc(comment?: string) {
        if (!comment) {
            return ""
        }
        const match = comment.match(BaseGen.COMMENT_REGEX)
        if (!match) {
            return comment
        }
        const [_, doc, entry] = match
        // search for the docs
        const docs = this.documentation[doc]
        for (const ent of docs || []) {
            if (ent.name === entry) {
                return ent.documentation
            }
        }
        throw new Error(
            "Cannot find documentation entry for " + doc + "." + entry
        )
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
