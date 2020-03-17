import {
    snakeCase,
    pluralizeName,
    getVersion,
    camelCase,
    capitalizeFirst,
    lowercaseFirst
} from "./names"
import { IDefinition, IAttribute, IOperation, ResourceType } from "./treetypes"
import { BaseGen } from "./genbase"
import { isPrimitiveType } from "./parse"
enum Verbs {
    POST,
    PUT,
    PATCH,
    GET
}

/**
 * generate swagger from the parsed representation
 */

export default class SwagGen extends BaseGen {
    private static readonly COMMENT_REGEX = /See docs:\s*(?<doc>\w+)\.(?<entry>\w+)/
    private empty = new Set<string>()

    public generate() {
        this.markGenerate(true)
        const tags: any[] = []
        const paths: any = {}
        const schemas: any = {}
        const parameters: any = {}
        const swag: object = {
            openapi: "3.0.1",
            info: {
                title: this.namespace.title,
                description: this.translate(this.namespace.comment),
                version: this.namespace.version
            },
            servers: [
                {
                    url: `https://api.liveramp.com/${this.mainNamespace}`
                }
            ],
            tags,
            paths,
            components: {
                parameters,
                schemas
            }
        }

        // model definitions
        this.formDefinitions(schemas)

        // tags
        const tagKeys = {}
        this.formTags(this.defs, tags, tagKeys)

        // form the paths
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
                const action = el.type === "action"
                let parents = ""
                let params: any[] = []
                let pname = el.parentName
                let major = getVersion(el.short)
                while (pname) {
                    const actual = this.extractDefinition(pname)
                    if (!actual.parentName) {
                        major = getVersion(actual.short)
                    }
                    const maybe = getVersion(actual.short)
                    if (maybe) {
                        major = maybe
                    }
                    const singular = lowercaseFirst(camelCase(actual.short))
                    let full = snakeCase(actual.short)
                    if (!actual.singleton && actual.type !== "action") {
                        full = pluralizeName(full)
                    }
                    pname = actual.parentName
                    if (action && el.resourceLevel) {
                        parents = `/${full}` + parents
                    } else {
                        parents = `/${full}/\{${singular}Id\}` + parents
                    }
                    if (action && el.resourceLevel && !params.length) {
                        // skip first parent parameter for resource level actions
                    } else {
                        this.addParentPathParam(params, actual, singular + "Id")
                    }
                }
                // reverse the order so it looks more natural
                params = params.reverse()

                const singleton = el.singleton
                let path: any = {}

                // name of resource
                let name = snakeCase(el.short)
                const actionPath = action ? "actions/" : ""

                if (!el.singleton && !action) {
                    name = pluralizeName(name)
                }

                /**
                 * non-id definitions
                 */
                const post = this.extractOp(el, "POST")
                const multiget = this.extractOp(el, "MULTIGET")

                if (singleton && (post || multiget)) {
                    throw new Error(
                        `${el.short} is a singleton - cannot have POST or MULTIGET`
                    )
                }

                if (!singleton && (post || multiget)) {
                    paths[`/${major}${parents}/${actionPath}${name}`] = path
                    this.formNonIdOperations(
                        el,
                        path,
                        params,
                        tagKeys,
                        post,
                        multiget
                    )
                }

                /**
                 * id definitions
                 */
                const get = this.extractOp(el, "GET")
                const put = this.extractOp(el, "PUT")
                const patch = this.extractOp(el, "PATCH")
                const del = this.extractOp(el, "DELETE")

                path = {}
                if (get || put || patch || del) {
                    if (singleton) {
                        paths[`/${major}${parents}/${actionPath}${name}`] = path
                    } else {
                        paths[
                            `/${major}${parents}/${actionPath}${name}/{id}`
                        ] = path
                    }
                }
                this.formIdOperations(
                    el,
                    path,
                    params,
                    !!singleton,
                    tagKeys,
                    get,
                    put,
                    patch,
                    del
                )
            }
        }

        return swag
    }

    private translate(comment?: string) {
        if (!comment) {
            return ""
        }
        const match = comment.match(SwagGen.COMMENT_REGEX)
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

    private formNonIdOperations(
        el: IDefinition,
        path: any,
        params: any[],
        tagKeys: { [key: string]: string },
        post: IOperation | null,
        multiget: IOperation | null
    ) {
        const sane = camelCase(this.formTagName(el))
        const plural = pluralizeName(el.short)

        if (post) {
            const short = el.short
            const idtype = this.extractId(el)
            let responses: { [code: number]: any } = {
                201: {
                    description: short + " created successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    id: this.addType(idtype, {}, false)
                                }
                            }
                        }
                    }
                }
            }

            if (el.type === "action" && post) {
                if (!el.async) {
                    responses = {
                        200: {
                            description: short + " action completed",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            id: this.addType(idtype, {}, false)
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    responses = {
                        200: {
                            description: short + " action completed",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            id: this.addType(idtype, {}, false)
                                        }
                                    }
                                }
                            }
                        },
                        202: {
                            description:
                                short +
                                " action has been accepted, but is not yet complete",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            id: this.addType(idtype, {}, false)
                                        }
                                    }
                                }
                            }
                        },
                        204: {
                            description:
                                short +
                                " action has already been submitted and we are currently doing it"
                        }
                    }
                    if (!post.errors) {
                        post.errors = []
                    }
                    post.errors.push({
                        codes: [
                            {
                                code: "409",
                                comment:
                                    short +
                                    " action has been accepted but cannot be processed due to current state"
                            }
                        ],
                        struct: {
                            name: "StandardError",
                            short: "StandardError",
                            parents: [],
                            module: "",
                            parentName: "",
                            parentShort: ""
                        }
                    })
                }
            }
            this.formErrors(post, responses)
            const rname = this.formTagName(el)
            path.post = {
                tags: [tagKeys[rname]],
                operationId: "Create " + rname,
                description: this.translate(post.comment),
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                $ref: `#/components/schemas/${sane}Input`
                            }
                        }
                    }
                },
                responses
            }
            if (this.empty.has(sane + "Input")) {
                delete path.post.requestBody
            }
            if (params.length) {
                path.post.parameters = params
            }
        }
        const gparams = params.slice()
        if (multiget) {
            gparams.push({
                in: "query",
                name: "offset",
                description: `Offset of the ${plural} (starting from 0) to include in the response.`,
                schema: {
                    type: "integer",
                    format: "int32",
                    default: 0
                }
            })
            gparams.push({
                in: "query",
                name: "limit",
                description: `Number of ${plural} to return. If unspecified, 10 max will be returned.\
 Maximum value for limit can be 100`,
                schema: {
                    type: "integer",
                    format: "int32",
                    default: 10,
                    maximum: 100
                }
            })

            for (const attr of el.attributes as IAttribute[]) {
                if (attr.modifiers.query || attr.modifiers.queryonly) {
                    gparams.push(
                        this.addType(attr, {
                            in: "query",
                            name: attr.name,
                            description: this.translate(attr.comment),
                            required: false
                        })
                    )
                }
            }
            const responses = {
                200: {
                    description: plural + " retrieved successfully",
                    headers: {
                        "X-Total-Count": {
                            description: `Total number of ${plural} returned by the query`,
                            schema: { type: "integer", format: "int32" }
                        }
                    },
                    content: {
                        "application/json": {
                            schema: {
                                $ref:
                                    "#/components/schemas/" +
                                    sane +
                                    "MultiResponse"
                            }
                        }
                    }
                }
            }
            this.formErrors(multiget, responses)
            const rname = this.formTagName(el)
            path.get = {
                tags: [tagKeys[rname]],
                operationId: "List " + pluralizeName(rname),
                description: this.translate(multiget.comment),
                responses
            }
            if (gparams.length) {
                path.get.parameters = gparams
            }
        }
    }

    /**
     * make a parameter
     */
    private makeProperty(attr: IAttribute): { name: string; prop: any } {
        const def = this.extractDefinitionGently(attr.type.name)
        let name = attr.name
        if (def && ResourceType.includes(def.type)) {
            if (attr.array && !name.endsWith("s")) {
                name = name + "s"
            }
        }
        const prop = {
            description: this.translate(attr.comment)
        }
        this.addType(attr, prop, false)
        return { name, prop }
    }

    private addParentPathParam(
        paths: any[],
        parent: IDefinition,
        name: string
    ) {
        if (!parent.singleton) {
            const param = this.addType(this.extractDefinitionId(parent.name), {
                in: "path",
                name,
                description: "Id of parent " + parent.short,
                required: true
            })
            paths.push(param)
        }
    }

    private formIdOperations(
        el: IDefinition,
        path: any,
        params: any[],
        singleton: boolean,
        tagKeys: { [key: string]: string },
        get?: IOperation | null,
        put?: IOperation | null,
        patch?: IOperation | null,
        del?: IOperation | null
    ) {
        const sane = camelCase(this.formTagName(el))
        const short = el.short
        const notFound = {
            description: short + " not found",
            content: {
                "application/json": {
                    schema: {
                        $ref: "#/components/schemas/StandardError"
                    }
                }
            }
        }
        if (get) {
            const responses = {
                200: {
                    description: short + " retrieved successfully",
                    content: this.empty.has(sane + "Output")
                        ? {}
                        : {
                              "application/json": {
                                  schema: {
                                      $ref:
                                          "#/components/schemas/" +
                                          sane +
                                          "Output"
                                  }
                              }
                          }
                },
                404: notFound
            }
            if (this.empty.has(sane + "Output")) {
                delete responses[200].content
            }
            this.formErrors(get, responses)
            const rname = this.formTagName(el)
            path.get = {
                tags: [tagKeys[rname]],
                operationId: "Get 1 " + rname,
                description: this.translate(get.comment),
                responses
            }
            if (!singleton) {
                const idtype = this.extractId(el)
                path.get.parameters = params.concat([
                    this.addType(idtype, {
                        in: "path",
                        name: "id",
                        required: true
                    })
                ])
            } else {
                if (params.length) {
                    path.get.parameters = params
                }
            }
        }
        if (put) {
            const responses = {
                200: {
                    description: short + " modified successfully"
                },
                404: notFound
            }
            this.formErrors(put, responses)
            const rname = this.formTagName(el)
            path.put = {
                tags: [tagKeys[rname]],
                operationId: "Modify a " + rname,
                description: this.translate(put.comment),
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                $ref:
                                    "#/components/schemas/" + sane + "Puttable"
                            }
                        }
                    }
                },
                responses
            }
            if (this.empty.has(sane + "Puttable")) {
                delete path.put.requestBody
            }
            if (!singleton) {
                const idtype = this.extractId(el)
                path.put.parameters = params.concat([
                    this.addType(idtype, {
                        in: "path",
                        name: "id",
                        required: true
                    })
                ])
            } else {
                if (params.length) {
                    path.put.parameters = params
                }
            }
        }
        if (patch) {
            const responses = {
                200: {
                    description: short + " patched successfully"
                },
                404: notFound
            }
            this.formErrors(patch, responses)
            const rname = this.formTagName(el)
            path.patch = {
                tags: [tagKeys[rname]],
                operationId: "Patch a " + rname,
                description: this.translate(patch.comment),
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                $ref:
                                    "#/components/schemas/" + sane + "Patchable"
                            }
                        }
                    }
                },
                responses
            }
            if (this.empty.has(sane + "Patchable")) {
                delete path.patch.requestBody
            }
            if (!singleton) {
                const idtype = this.extractId(el)
                path.patch.parameters = params.concat([
                    this.addType(idtype, {
                        in: "path",
                        name: "id",
                        required: true
                    })
                ])
            } else {
                if (params.length) {
                    path.patch.parameters = params
                }
            }
        }
        if (del) {
            const responses = {
                200: {
                    description: short + " deleted successfully"
                },
                404: notFound
            }
            this.formErrors(del, responses)
            const rname = this.formTagName(el)
            path.delete = {
                tags: [tagKeys[rname]],
                operationId: "Delete a " + rname,
                description: this.translate(del.comment),
                responses
            }
            if (!singleton) {
                const idtype = this.extractId(el)
                path.delete.parameters = params.concat([
                    this.addType(idtype, {
                        in: "path",
                        name: "id",
                        required: true
                    })
                ])
            } else {
                if (params.length) {
                    path.delete.parameters = params
                }
            }
        }
    }

    private formErrors(op: IOperation, responses: any) {
        for (const err of op.errors || []) {
            for (const code of err.codes) {
                responses[code.code] = {
                    description: this.translate(code.comment),
                    content: {
                        "application/json": {
                            schema: {
                                $ref: `#/components/schemas/${err.struct.name}`
                            }
                        }
                    }
                }
            }
        }
    }

    private translatePrimitive(
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

    private addType(
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
            obj.description = this.translate(attr.comment)
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
            const def = this.extractDefinition(name)
            switch (def.type) {
                case "structure":
                    schema.$ref = `#/components/schemas/${sane}`
                    break
                case "union":
                    schema.$ref = `#/components/schemas/${sane}`
                    break
                case "request-resource":
                case "asset-resource":
                case "configuration-resource":
                case "subresource":
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
                case "enum":
                    schema.type = "string"
                    // collect any inherited literals
                    schema.enum = def.literals
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

    // add resource level suffix if needed
    private formTagName(def: IDefinition) {
        return def.name + (def.resourceLevel ? "_R" : "")
    }

    private formTags(
        defs: IDefinition[],
        tags: any[],
        tagKeys: { [key: string]: string }
    ) {
        for (const el of defs) {
            // don't generate for any imported def
            if (el.secondary || el.future) {
                continue
            }
            const name = this.formTagName(el)
            const comment = this.translate(el.comment)
            let prefix = null
            if ("configuration-resource" === el.type) {
                prefix = "(configuration) "
            }
            if ("asset-resource" === el.type) {
                prefix = "(asset) "
            }
            if ("request-resource" === el.type) {
                prefix = "(request) "
            }
            if ("subresource" === el.type) {
                prefix = "(subresource) "
            }
            if ("action" === el.type) {
                prefix =
                    "(" +
                    (el.resourceLevel ? "resource level " : "") +
                    (el.async ? "async " : "sync ") +
                    "action) "
            }
            if (prefix) {
                const tag = {
                    name,
                    description: `${prefix} ${comment}`
                }
                tags.push(tag)
                tagKeys[name] = tag.name
            }
        }
    }

    private addDefinition(
        definitions: any,
        def: IDefinition,
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
        const sane = camelCase(this.formTagName(def))

        for (const attr of attrs as IAttribute[]) {
            if (attr.modifiers.queryonly) {
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

            if (!optional) {
                required.push(attr.name)
            }
            if (attr.inline) {
                const indef = this.extractDefinition(attr.type.name)
                if (indef.type !== "structure") {
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
                }
            } else {
                const prop = this.makeProperty(attr)
                properties[prop.name] = prop.prop
            }
        }

        if (request.required.length === 0) {
            delete request.required
        }

        if (Object.keys(properties).length !== 0) {
            definitions[sane + suffix] = request
        } else {
            this.empty.add(sane + suffix)
        }
    }

    private addUnionDefinition(
        definitions: any,
        def: IDefinition,
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
                const indef = this.extractDefinition(attr.type.name)
                if (indef.type !== "structure") {
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

    private formDefinitions(definitions: any) {
        for (const def of this.defs) {
            const sane = camelCase(def.name)
            if (
                [
                    "asset-resource",
                    "configuration-resource",
                    "subresource",
                    "request-resource",
                    "action"
                ].includes(def.type) &&
                !def.secondary
            ) {
                if (def.generateInput) {
                    this.addDefinition(definitions, def, Verbs.POST, "Input")
                }
                if (def.generateOutput) {
                    this.addDefinition(definitions, def, Verbs.GET, "Output")
                }
                if (def.generatePuttable) {
                    this.addDefinition(definitions, def, Verbs.PUT, "Puttable")
                }
                if (def.generatePatchable) {
                    this.addDefinition(
                        definitions,
                        def,
                        Verbs.PATCH,
                        "Patchable"
                    )
                }

                // handle multiget
                if (def.generateMulti) {
                    const elements = {
                        description:
                            "Array of retrieved " + pluralizeName(def.name),
                        type: "array",
                        items: {
                            $ref: "#/components/schemas/" + sane + "Output"
                        }
                    }
                    const props: { [name: string]: any } = {}
                    const full = {
                        type: "object",
                        properties: props
                    }
                    const plural = lowercaseFirst(pluralizeName(def.short))
                    props[plural] = elements
                    definitions[sane + "MultiResponse"] = full
                }
            }
            if ("structure" === def.type && def.generateInput) {
                this.addDefinition(definitions, def, Verbs.POST, "")
            }
            if ("union" === def.type && def.generateInput) {
                this.addUnionDefinition(definitions, def, "")
            }
        }
    }
}
