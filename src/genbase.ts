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
    isStructure,
    isEvent,
    IServers,
    isProduces,
    isConsumes,
    isAction,
    isUnion,
    ITag
} from "./treetypes"
import { parseFile, isPrimitiveType, IParseTree } from "./parse"
import { readdirSync, statSync } from "fs"
import { join } from "path"
import lpath from "path"
import { IRules } from "./rules"
import {
    camelCase,
    capitalizeFirst,
    pluralizeName,
    lowercaseFirst
} from "./names"
import { Verbs, Operations } from "./operations"

const LOCAL = "local.reslang"
const LOCAL_INCLUDE = lpath.join(__dirname, "library", LOCAL)
const LOCAL_SERVERS = "servers.reslang"
const LOCAL_SERVERS_INCLUDE = lpath.join(__dirname, "library", LOCAL_SERVERS)

interface IFileDetails {
    file: string
    full: string
    namespace: string
}

// replace any vars in the urls with defaults or values supplied by the users
export function replaceServerVars(variables: string, servers: IServers) {
    // parse out the vars into a map
    const vars = makeVars(variables)

    // iterate over all urls and replace with defaults or variables. complain if var not present
    for (const rest of servers.rest || []) {
        rest.url = replaceVars(vars, rest.url)
    }
    for (const events of servers.events || []) {
        events.url = replaceVars(vars, events.url)
    }
}

export function makeVars(variables: string) {
    const vars = new Map<string, string>()
    for (const pair of variables.split(",")) {
        const inside = pair.split("=")
        vars.set(inside[0], inside[1])
    }
    return vars
}

export function replaceVars(vars: Map<string, string>, url: string) {
    // break up into strings
    let variable = false
    const all = new Array<string>()
    let current = ""
    for (const ch of url) {
        if (ch === "{") {
            variable = true
            all.push(current)
            current = "$"
        } else if (ch === "}") {
            variable = false
            all.push(current)
            current = ""
        } else {
            current = current + ch
        }
    }
    if (current) {
        all.push(current)
    }

    // replace the string with vars or defaults
    const replaced = all.map((value, index) => {
        if (!value.startsWith("$")) {
            return value
        }

        value = value.substring(1)
        const pos = value.indexOf(":")
        if (pos !== -1) {
            const varName = value.substring(0, pos)
            const def = value.substring(pos + 1)
            if (vars.has(varName)) {
                return vars.get(varName)
            } else {
                return def
            }
        } else {
            if (vars.has(value)) {
                return vars.get(value)
            }
            throw new Error(
                "Cannot find value or default for variable: " + value
            )
        }
    })
    return replaced.join("")
}

export abstract class BaseGen {
    public static readonly COMMENT_REGEX = /See docs:\s*(?<doc>\w+)\.(?<entry>\w+)/

    protected namespace!: INamespace
    protected servers!: IServers
    protected mainNamespace?: string
    // the user defined space, if there is one, in the namespace definition
    protected space?: string
    protected defs: AnyKind[] = []
    protected tags: ITag[] = []
    protected diagrams: IDiagram[] = []
    protected documentation: { [name: string]: IDocEntry[] } = {}
    protected empty = new Set<string>()
    protected loaded = new Set<string>()
    protected parsed = new Array<IParseTree>()

    public constructor(
        private dirs: string[],
        protected rules: IRules,
        protected environment: string = "PROD",
        protected vars: string = "",
        expandInlines = false,
        protected omitNamespace = false,
        protected generateAllOf = true
    ) {
        this.processDefinitions()
        this.checkMandatoryRules()
        this.checkOperationOptions()
        this.checkConfigurableRules()
        if (expandInlines) {
            this.expandInlines()
        }
    }

    public processDefinitions() {
        let main = true
        for (const dirname of this.dirs) {
            this.processDefinition(dirname, main)
            main = false
        }
    }

    public expandInlines() {
        // bring up all the inlines
        for (const def of this.defs) {
            if (isStructure(def) || isResourceLike(def) || isUnion(def)) {
                def.attributes = this.expandAttributes(def.attributes || [])
            }
            if (isEvent(def)) {
                def.header = this.expandAttributes(def.header || [])
                def.payload = this.expandAttributes(def.payload || [])
            }
        }
    }

    // expand out the attributes, taking into account how inlining works
    public expandAttributes(
        attrs: IAttribute[],
        visited = new Set<string>()
    ): IAttribute[] {
        // only have to dive into structures from this point on
        const all = new Array<IAttribute>()
        for (const attr of attrs) {
            if (!attr.inline) {
                all.push(attr)
            } else {
                // check we haven't been here before
                if (visited.has(attr.type.name)) {
                    throw new Error("Circular inlines: " + attr.type.name)
                }
                const def = this.extractDefinition(attr.type.name)
                if (!isStructure(def)) {
                    throw new Error(
                        "Can only inline a structure: " + attr.type.name
                    )
                }
                for (const other of this.expandAttributes(
                    def.attributes || [],
                    visited
                ) || []) {
                    all.push(other)
                }
            }
        }
        return all
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
        const files = this.findFiles([], join(path, nspace), "")
        files.push({ file: LOCAL, full: LOCAL_INCLUDE, namespace: "" })
        for (const lst of files) {
            this.parseFile(lst, main, nspace, path)
        }
        // must have a namespace
        if (!this.namespace) {
            throw new Error(`No namespace present in ${dirname}`)
        }
        // must have a server block - read in default one if we don't
        if (!this.servers) {
            this.parseFile(
                {
                    file: LOCAL_SERVERS,
                    full: LOCAL_SERVERS_INCLUDE,
                    namespace: ""
                },
                main,
                nspace,
                path
            )
        }
    }

    public parseFile(
        lst: IFileDetails,
        main: boolean,
        nspace: string,
        path: string
    ) {
        const fname = lst.full
        const reallyMain = main
        if (fname.endsWith(".reslang")) {
            const local = parseFile(
                fname,
                nspace,
                this.mainNamespace!,
                lst.namespace
            )
            this.parsed.push(local)
            if (main) {
                // set the namespace and complain if we have more than 1
                local.namespace.forEach((space) => {
                    if (!this.namespace) {
                        this.namespace = space
                    } else {
                        throw new Error(
                            "Cannot specify more than one namespace in a module: " +
                                space
                        )
                    }
                })

                // set the server block and complain if we have more than 1
                local.servers.forEach((servers) => {
                    if (!this.servers) {
                        this.servers = servers
                        // fix up server block vars
                        replaceServerVars(this.vars, this.servers)
                    } else {
                        throw new Error(
                            "Cannot specify more than one server block in a model: " +
                                local.servers
                        )
                    }
                })
            }

            // handle any imports
            for (const imp of local.imports as IImport[]) {
                this.processDefinition(path + imp.import, false)
            }

            // copy over the tags
            if (reallyMain) {
                for (const tag of local.tags as ITag[]) {
                    this.tags.push(tag)
                }
            }

            // copy over all the defs
            for (const def of local.definitions as AnyKind[]) {
                def.secondary = !reallyMain
                def.file = lst.file
                this.defs.push(def)
            }
            // copy over all the diagrams
            for (const diag of local.diagrams as IDiagram[]) {
                this.diagrams.push(diag)
            }

            // copy over all the documentation
            for (const doc of local.docs as IDocumentation[]) {
                this.documentation[doc.name] = doc.entries
            }
        }
    }

    // recursively find files
    public findFiles(
        files: IFileDetails[],
        dirname: string,
        namespace: string
    ) {
        readdirSync(join(dirname, namespace)).map((fname) => {
            const full = join(dirname, namespace, fname)
            if (statSync(full).isDirectory()) {
                this.findFiles(files, dirname, join(namespace, fname))
            } else {
                files.push({ file: fname, full, namespace })
            }
        })
        return files
    }

    public checkMandatoryRules() {
        for (const def of this.defs) {
            if (isResourceLike(def)) {
                const ops = new Operations(def)

                // a resource cannot have both POST and MULTIPOST as they occupy the same URL
                if (ops.post && ops.multipost) {
                    throw new Error(
                        `Definition for ${def.short} has both POST and MULTIPOST. You can only have one because they occupy the same URL`
                    )
                }

                // cannot have an action with any multis apart from MULTIGET
                if (isAction(def) && ops.isMulti() && !ops.multiget) {
                    throw new Error(
                        "Actions cannot have MULTI-mutating operations: " +
                            def.short
                    )
                }
            }
        }
    }

    // check all the rules for this api
    public checkConfigurableRules() {
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
The maximum depth a resource can be nested is ${maxResource} levels. Your level is ${
                        def.parents.length + 1
                    }`
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

    public checkOperationOptions() {
        // check the options for operations are ok
        for (const def of this.defs) {
            // check that the operations have the correct options
            if (isResourceLike(def)) {
                for (const op of def.operations || []) {
                    if (op.operation === "MULTIGET") {
                        // only pagination and limit currently supported
                        for (const option of op.options) {
                            const name = option.name
                            const val = option.value
                            if (name === "pagination") {
                                if (!["offset", "cursor", "none"]) {
                                    throw new Error(
                                        "MULTIGET of resource " +
                                            def.name +
                                            " must have pagination value of offset, cursor or none"
                                    )
                                }
                            } else if (name === "limit") {
                                // must be numeric
                                if (isNaN(Number(val))) {
                                    throw new Error(
                                        "MULTIGET of resource " +
                                            def.name +
                                            " must have an integer limit value"
                                    )
                                }
                            } else {
                                throw new Error(
                                    "Operation " +
                                        op.operation +
                                        " of resource " +
                                        def.name +
                                        " cannot have option " +
                                        name
                                )
                            }
                        }
                    } else {
                        if (op.options.length !== 0) {
                            throw new Error(
                                "Operation " +
                                    op.operation +
                                    " of resource " +
                                    def.name +
                                    " cannot have options"
                            )
                        }
                    }
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

    protected extractId(node: IResourceLike) {
        const attr = this.extractIdGently(node)
        if (!attr) {
            throw new Error("Cannot find id attribute for " + node.name)
        }
        return attr
    }

    protected extractIdGently(node: IResourceLike) {
        if (node.attributes) {
            for (const attr of node.attributes) {
                if (attr.name === "id") {
                    return attr
                }
            }
        }
        return null
    }

    protected addResourceDefinition(
        definitions: any,
        def: IResourceLike,
        verb: Verbs,
        suffix: string
    ) {
        const attrs = def.attributes || []
        const properties: any = {}
        const required = new Set<string>()
        const request = {
            type: "object",
            properties
        } as {
            type: string
            properties: any
            required: string[]
            description: string
        }
        for (const attr of attrs as IAttribute[]) {
            if (attr.modifiers.queryonly || attr.modifiers.representation) {
                continue
            }
            // no id types for input ever
            if (
                attr.name === "id" &&
                verb !== Verbs.GET &&
                verb !== Verbs.MULTIPATCH &&
                verb !== Verbs.MULTIPUT
            ) {
                continue
            }
            // if this is a flag, only place on PUT, PATCH etc etc
            if (attr.modifiers.flag) {
                if (
                    ![
                        Verbs.PUT,
                        Verbs.MULTIPUT,
                        Verbs.PATCH,
                        Verbs.MULTIPATCH,
                        Verbs.GET,
                        Verbs.MULTIGET
                    ].includes(verb)
                ) {
                    continue
                }
            } else if (
                // if we have a mutation operation and the attribute is not marked as mutable, skip it
                (verb === Verbs.PATCH ||
                    verb === Verbs.PUT ||
                    verb === Verbs.MULTIPATCH ||
                    verb === Verbs.MULTIPUT) &&
                !attr.modifiers.mutable
            ) {
                if (attr.name !== "id") {
                    continue
                }
            }
            // if this is marked as output, suppress all other verbs
            if (attr.modifiers.output && verb !== Verbs.GET) {
                continue
            }

            // if this optional?
            let optional =
                attr.modifiers.optional ||
                verb === Verbs.PATCH ||
                verb === Verbs.MULTIPATCH
            optional =
                optional ||
                (verb === Verbs.POST && attr.modifiers.optionalPost) ||
                (verb === Verbs.PUT && attr.modifiers.optionalPut) ||
                (verb === Verbs.MULTIPUT && attr.modifiers.optionalPut) ||
                (verb === Verbs.GET && attr.modifiers.optionalGet)

            const prop = this.makeProperty(attr)
            properties[prop.name] = prop.prop
            if (!optional) {
                required.add(attr.name)
            }
        }
        // if this is a PATCH, remove any defaults
        for (const name in properties) {
            if (properties.hasOwnProperty(name)) {
                if (
                    verb === Verbs.PATCH ||
                    verb === Verbs.MULTIPATCH ||
                    verb === Verbs.GET ||
                    verb === Verbs.MULTIGET ||
                    required.has(name)
                ) {
                    delete properties[name].default
                }
            }
        }

        if (required.size !== 0) {
            request.required = Array.from(required.values())
        }
        // placed here to avoid perturbing the swagger too much, based on moving where required is set
        request.description = def.comment

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

        const plural = pluralizeName(def.name)
        switch (verb) {
            case Verbs.POST:
                return "Create " + bulk + def.name
            case Verbs.MULTIPOST:
                return "Create " + bulk + plural
            case Verbs.PUT:
                return "Modify " + bulk + def.name
            case Verbs.MULTIPUT:
                return "Modify " + bulk + plural
            case Verbs.PATCH:
                return "Patch " + bulk + def.name
            case Verbs.MULTIPATCH:
                return "Patch " + bulk + plural
            case Verbs.GET:
                return "Get " + bulk + def.name
            case Verbs.MULTIGET:
                return (
                    "Get " +
                    (plural === def.name ? "multiple " : "") +
                    bulk +
                    plural
                )
            case Verbs.DELETE:
                return "Delete " + bulk + def.name
            case Verbs.MULTIDELETE:
                return "Delete " + bulk + plural
        }
    }

    // add bulk modifier if needed
    protected formSingleUniqueName(def: AnyKind, addSpaces = true) {
        if (isProduces(def) || isConsumes(def)) {
            return def.event.name
        }
        if (isResourceLike(def) && def.type === "action") {
            const space = addSpaces ? " " : ""
            if (def.bulk) {
                return (
                    (def.bulk ? "Bulk" + space : "") +
                    def.short +
                    space +
                    this.removeLast(def.name)
                )
            }
            return (
                capitalizeFirst(def.short) + space + this.removeLast(def.name)
            )
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

        // check to see if we have duplicate literals
        const literals = new Set<string>(def.literals)
        if (def.literals && literals.size !== def.literals.length) {
            throw new Error(`Duplicate literals in ${def.name} enum`)
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
        const required = new Set<string>()
        const request = {
            type: "object",
            properties,
            required: new Array<string>(),
            description: def.comment
        } as {
            type: string
            properties: any
            required: string[]
            description: string
        }
        const sane = camelCase(def.name) + suffix

        for (const attr of attrs as IAttribute[]) {
            if (attr.modifiers.queryonly || attr.modifiers.representation) {
                continue
            }
            // if this optional?
            const optional = attr.modifiers.optional

            const prop = this.makeProperty(attr)
            if (!optional) {
                required.add(attr.name)
            }
            properties[prop.name] = prop.prop
        }

        if (required.size !== 0) {
            request.required = Array.from(required.values())
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
            const camel = capitalizeFirst(name) + capitalizeFirst(attr.name)
            const already = this.extractDefinitionGently(camel)
            if (already && already.generateInput /* struct */) {
                throw new Error(
                    "Cannot have union attribute called " +
                        camel +
                        " as a structure definition with the same name already exists. This should be extremely rare"
                )
            }
            mapping[attr.name] = "#/components/schemas/" + camel
        }
        const required = new Set<string>(["type"])
        const request = {
            type: "object",
            properties: { type: { type: "string" } },
            discriminator: {
                propertyName: "type",
                mapping
            },
            required: new Array<string>()
        }
        definitions[name] = request

        // now do the options
        for (const attr of attrs) {
            const properties: any = {}
            if (!isPrimitiveType(attr.type.name)) {
                this.pullUpUnionAttributes(attr, def, properties, required)
            } else {
                properties[attr.name] = this.addType(attr, {}, false)
                if (!attr.modifiers.optional) {
                    required.add(attr.name)
                }
            }
            if (this.generateAllOf) {
                definitions[
                    capitalizeFirst(name) + capitalizeFirst(attr.name)
                ] = {
                    allOf: [
                        { $ref: `#/components/schemas/${name}` },
                        {
                            type: "object",
                            properties
                        }
                    ]
                }
            } else {
                definitions[
                    capitalizeFirst(name) + capitalizeFirst(attr.name)
                ] = {
                    allOf: [
                        { $ref: `#/components/schemas/${name}` },
                        {
                            type: "object",
                            properties
                        }
                    ]
                }
            }
        }
        if (required.size !== 0) {
            request.required = Array.from(required.values())
        }
    }

    protected pullUpUnionAttributes(
        attr: IAttribute,
        def: IDefinition,
        properties: any,
        required: Set<string>
    ) {
        const indef = this.extractDefinition(attr.type.name)
        if (!isStructure(indef)) {
            throw new Error(
                "Union attribute " +
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
                required.add(att.name)
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
                this.addDefault(attr, schema, "string")
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
            case "uuid":
                this.addDefault(attr, schema, "string")
                schema.type = "string"
                schema.format = "uuid"
                if (example) {
                    schema.example = "123e4567-e89b-12d3-a456-426655440000"
                }
                break
            case "url":
                this.addDefault(attr, schema, "string")
                schema.type = "string"
                schema.format = "url"
                if (example) {
                    schema.example = "https://www.domain.com (url)"
                }
                break
            case "uri":
                this.addDefault(attr, schema, "string")
                schema.type = "string"
                schema.format = "uri"
                if (example) {
                    schema.example = "urn:isbn:0-486-27557-4"
                }
                break
            case "int":
                this.addDefault(attr, schema, "int")
                schema.type = "integer"
                schema.format = "int32"
                break
            case "long":
                this.addDefault(attr, schema, "int")
                schema.type = "integer"
                schema.format = "int64"
                break
            case "boolean":
                this.addDefault(attr, schema, "boolean")
                schema.type = "boolean"
                break
            case "double":
                this.addDefault(attr, schema, "double")
                schema.type = "number"
                break
            case "date":
                this.addDefault(attr, schema, "string")
                schema.type = "string"
                schema.format = "ISO8601 UTC date"
                if (example) {
                    schema.example = "2019-04-13"
                }
                break
            case "time":
                this.addDefault(attr, schema, "string")
                schema.type = "string"
                schema.format = "time"
                if (example) {
                    schema.example = "22:00:01"
                }
                break
            case "datetime":
                this.addDefault(attr, schema, "string")
                schema.type = "string"
                schema.format = "ISO8601 UTC date-time"
                if (example) {
                    schema.example = "2019-04-13T03:35:34Z"
                }
                break
            case "duration":
                this.addDefault(attr, schema, "string")
                schema.type = "string"
                schema.format = "ISO8601 duration"
                if (example) {
                    schema.example = "P3Y6M4DT12H30M5S"
                }
                break
        }
    }

    protected addDefault(attr: IAttribute | null, schema: any, type: string) {
        if (!attr || !attr.default) {
            return
        }
        switch (type) {
            case "boolean":
                if (attr.default.type !== "boolean") {
                    throw Error(
                        "Attribute " +
                            attr.name +
                            " can only have a boolean default value"
                    )
                }
                schema.default = attr.default.value === "true"
                break
            case "string":
                if (attr.default.type !== "string") {
                    throw Error(
                        "Attribute " +
                            attr.name +
                            " can only have a string default value"
                    )
                }
                schema.default = attr.default.value
                break
            case "int":
                if (
                    attr.default.type !== "numerical" ||
                    attr.default.type.includes(".")
                ) {
                    throw Error(
                        "Attribute " +
                            attr.name +
                            " can only have an integer default value"
                    )
                }
                schema.default = Number.parseInt(attr.default.value, 10)
                break
            case "double":
                if (attr.default.type !== "numerical") {
                    throw Error(
                        "Attribute " +
                            attr.name +
                            " can only have a numerical default value"
                    )
                }
                schema.default = Number.parseFloat(attr.default.value)
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
        const example = attr.example

        // if this is a stringmap then add it
        const type = attr.type
        const name = type.name
        const sane = camelCase(name)

        // allow description overrides by caller
        if (!obj.description) {
            delete obj.description
        }
        if (!obj.description && !suppressDescription && attr.comment) {
            const desc = this.translateDoc(attr.comment)
            obj.description = desc
        }
        if (schemaLevel) {
            obj.schema = {}
        }
        const schema = schemaLevel ? obj.schema : obj

        const prim = isPrimitiveType(name)

        // can only have a default if it is a primitive
        if (!prim && attr.default) {
            throw Error(
                "Can only have defaults on primitive attributes: " + attr.name
            )
        }

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
                    if (this.generateAllOf) {
                        schema.allOf = [
                            { $ref: `#/components/schemas/${sane}` }
                        ]
                    } else {
                        schema.$ref = `#/components/schemas/${sane}`
                    }
                    schema.type = def.kind === "enum" ? "string" : "object"
                    break
                case "resource-like":
                    // must have a linked annotation
                    if (attr.linked) {
                        this.addLinkedType(def, schema, attr)
                    } else if (attr.full) {
                        if (this.generateAllOf) {
                            schema.allOf = [
                                { $ref: `#/components/schemas/${sane}Output` }
                            ]
                        } else {
                            schema.$ref = `#/components/schemas/${sane}Output`
                        }
                        schema.type = "object"
                    } else {
                        throw new Error(
                            `Attribute ${attr.name} references resource ${attr.type} but doesn't use "linked" or "full"`
                        )
                    }
                    break
                default:
                    throw Error(
                        `Cannot resolve attribute type ${obj.type} of name ${obj.name}`
                    )
            }
        }

        // override the example
        if (example) {
            schema.example = example
        }

        // if multi, then push down to an array
        if (attr.array) {
            this.pushArrayDown(schema, attr.array.min, attr.array.max)
        }

        return obj
    }

    protected addLinkedType(def: IResourceLike, schema: any, attr: IAttribute) {
        const idTypeName = this.extractId(def).type.name

        // check all parents have the same id type
        let count = 0
        let ids = ""
        for (const parent of def.parents) {
            const parDef = this.extractDefinition(parent) as IResourceLike
            if (!parDef.singleton) {
                const typeName = this.extractId(parDef).type.name
                ids += lowercaseFirst(parDef.short) + "Id, " + ids
                if (typeName !== idTypeName) {
                    throw new Error(
                        "All parents of " + def.name + " must have same id type"
                    )
                }
                count++
            }
        }

        // add in the info now
        this.translatePrimitive(null, idTypeName, schema)

        // if this has parents, it needs to be an array
        if (count) {
            this.pushArrayDown(schema, count + 1, count + 1)
        }

        if (attr.array && !schema.description) {
            schema.description =
                `Link to ${attr.type.name} resources via ` +
                (count
                    ? "[" + ids + lowercaseFirst(def.short) + "Id]"
                    : "their ids")
        } else if (!schema.description) {
            schema.description =
                `Link to ${attr.type.name} resource via ` +
                (count
                    ? "[" + ids + lowercaseFirst(def.short) + "Id]"
                    : "its id")
        }
    }

    protected pushArrayDown(schema: any, min: number = 0, max: number = 0) {
        schema.items = {
            allOf: schema.allOf,
            items: schema.items,
            type: schema.type,
            format: schema.format,
            example: schema.example,
            $ref: schema.$ref,
            minItems: schema.minItems,
            maxItems: schema.maxItems
        }
        if (min) {
            schema.minItems = min
        } else {
            delete schema.minItems
        }
        if (max) {
            schema.maxItems = max
        } else {
            delete schema.maxItems
        }
        delete schema.type
        delete schema.format
        delete schema.example
        delete schema.$ref
        delete schema.allOf
        schema.type = "array"
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
}
