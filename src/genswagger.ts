import {
    fixName,
    pluralizeName,
    getVersion,
    sanitize,
    capitalizeFirst,
    lowercaseFirst
} from "./names"
import { IDefinition, IAttribute, IOperation, ResourceType } from "./treetypes"
import { BaseGen } from "./genbase"
import { isPrimitiveType } from "./parse"

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
                // locate the parent
                let parent = null
                let parentName = null
                let parentSubPath = null
                if (el.parent) {
                    parent = this.extractDefinition(el.parent)
                    parentName = sanitize(parent.name)
                    if (!parent.singleton) {
                        parentName = pluralizeName(parentName)
                    }
                }
                const sname = fixName(el.short)
                const name = pluralizeName(sname)
                const version = parentName
                    ? getVersion(parentName!)
                    : getVersion(el.name)
                const singleton = el.singleton
                // now we can remove the version
                if (parentName) {
                    parentName = fixName(parentName)
                }
                if (parent) {
                    parentSubPath = parent.singleton
                        ? `${parentName}`
                        : `${parentName}/{parentId}`
                }

                let path: any = {}

                /**
                 * non-id definitions
                 */
                const post = this.extractOp(el, "POST")
                const multiget = this.extractOp(el, "MULTIGET")

                if (singleton && (post || multiget)) {
                    throw new Error(
                        `${el.name} is a singleton - cannot have POST or MULTIGET`
                    )
                }

                if (!singleton && (post || multiget)) {
                    if (parent) {
                        paths[`/${version}/${parentSubPath}/${name}`] = path
                    } else {
                        paths[`/${version}/${name}`] = path
                    }
                    this.formNonIdOperations(el, path, tagKeys, post, multiget)
                }

                /**
                 * id definitions
                 */
                const get = this.extractOp(el, "GET")
                const put = this.extractOp(el, "PUT")
                const del = this.extractOp(el, "DELETE")

                path = {}
                if (get || put || del) {
                    if (singleton) {
                        if (parentName) {
                            paths[
                                `/${version}/${parentSubPath}/${sname}`
                            ] = path
                        } else {
                            paths[`/${version}/${sname}`] = path
                        }
                    } else {
                        if (parentName) {
                            paths[
                                `/${version}/${parentSubPath}/${name}/{id}`
                            ] = path
                        } else {
                            paths[`/${version}/${name}/{id}`] = path
                        }
                    }
                }
                this.formIdOperations(
                    el,
                    path,
                    !!singleton,
                    tagKeys,
                    get,
                    put,
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
        tagKeys: { [key: string]: string },
        post: IOperation | null,
        multiget: IOperation | null
    ) {
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
                        201: {
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
                            name: "Error",
                            short: "Error"
                        }
                    })
                }
            }
            this.formErrors(post, responses)
            path.post = {
                tags: [tagKeys[el.name]],
                operationId: "Create " + short,
                description: this.translate(post.comment),
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                $ref: `#/components/schemas/${el.name}Input`
                            }
                        }
                    }
                },
                responses
            }
            if (this.empty.has(el.name + "Input")) {
                delete path.post.requestBody
            }
            this.addParentPathId(el, path.post)
        }
        if (multiget) {
            const params: any[] = []

            params.push({
                in: "query",
                name: "offset",
                description:
                    "Offset of the record (starting from 0) to include in the response.",
                schema: {
                    type: "integer",
                    default: 0
                }
            })
            params.push({
                in: "query",
                name: "limit",
                description: `Number of records to return. If unspecified, 10 records will be returned.\
 Maximum value for limit can be 100`,
                schema: {
                    type: "integer",
                    default: 10,
                    maximum: 100
                }
            })

            for (const attr of el.attributes as IAttribute[]) {
                if (attr.modifiers.query || attr.modifiers.queryonly) {
                    params.push(
                        this.addType(attr, {
                            in: "query",
                            name: attr.name,
                            description: this.translate(attr.comment),
                            required: false
                        })
                    )
                }
            }
            const short = el.short
            const responses = {
                200: {
                    description:
                        pluralizeName(short) + " retrieved successfully",
                    headers: {
                        "X-Total-Count": {
                            description:
                                "Total number of records in the data set.",
                            schema: { type: "integer" }
                        }
                    },
                    content: {
                        "application/json": {
                            schema: {
                                $ref:
                                    "#/components/schemas/" +
                                    el.name +
                                    "MultiResponse"
                            }
                        }
                    }
                }
            }
            this.formErrors(multiget, responses)
            path.get = {
                tags: [tagKeys[el.name]],
                operationId: "List " + pluralizeName(el.name),
                description: this.translate(multiget.comment),
                parameters: params,
                responses
            }
            this.addParentPathId(el, path.get)
        }
    }

    /**
     * make a parameter
     */
    private makeProperty(attr: IAttribute): { name: string; prop: any } {
        const def = this.extractDefinitionGently(attr.type.name)
        let name = attr.name
        if (def && ResourceType.includes(def.type)) {
            if (
                (attr.multiple && !name.endsWith("Ids")) ||
                (!attr.multiple && !name.endsWith("Id"))
            ) {
                throw new Error(
                    `Link to resource must end in Id or Ids - ${attr.name}`
                )
            }
            if (attr.multiple && !name.endsWith("s")) {
                name = name + "s"
            }
        }
        const prop = {
            description:
                (attr.modifiers.synthetic ? "(synthetic) " : "") +
                this.translate(attr.comment)
        }
        this.addType(attr, prop, false)
        return { name, prop }
    }

    private addParentPathId(el: any, path: any) {
        if (el.parent && !this.extractDefinition(el.parent).singleton) {
            const param = this.addType(this.extractDefinitionId(el.parent), {
                in: "path",
                name: "parentId",
                description: "Id of parent " + el.parent,
                required: true
            })
            if (path.parameters) {
                path.parameters.push(param)
            } else {
                path.parameters = [param]
            }
        }
    }

    private formIdOperations(
        el: IDefinition,
        path: any,
        singleton: boolean,
        tagKeys: { [key: string]: string },
        get?: IOperation | null,
        put?: IOperation | null,
        del?: IOperation | null
    ) {
        if (get) {
            const short = el.short
            const responses = {
                200: {
                    description: short + " retrieved successfully",
                    content: this.empty.has(el.name + "Output")
                        ? {}
                        : {
                              "application/json": {
                                  schema: {
                                      $ref:
                                          "#/components/schemas/" +
                                          el.name +
                                          "Output"
                                  }
                              }
                          }
                }
            }
            if (this.empty.has(el.name + "Output")) {
                delete responses[200].content
            }
            this.formErrors(get, responses)
            path.get = {
                tags: [tagKeys[el.name]],
                operationId: "Get 1 " + el.name,
                description: this.translate(get.comment),
                responses
            }
            if (!singleton) {
                const idtype = this.extractId(el)
                path.get.parameters = [
                    this.addType(idtype, {
                        in: "path",
                        name: "id",
                        required: true
                    })
                ]
            }
            this.addParentPathId(el, path.get)
        }
        if (put) {
            const short = el.short
            const responses = {
                200: {
                    description: short + " modified successfully"
                }
            }
            this.formErrors(put, responses)
            path.put = {
                tags: [tagKeys[el.name]],
                operationId: "Modify a " + el.name,
                description: this.translate(put.comment),
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                $ref:
                                    "#/components/schemas/" +
                                    el.name +
                                    "Mutable"
                            }
                        }
                    }
                },
                responses
            }
            if (this.empty.has(el.name + "Mutable")) {
                delete path.put.requestBody
            }
            if (!singleton) {
                const idtype = this.extractId(el)
                path.put.parameters = [
                    this.addType(idtype, {
                        in: "path",
                        name: "id",
                        required: true
                    })
                ]
            }
            this.addParentPathId(el, path.put)
        }
        if (del) {
            const short = el.short
            const responses = {
                200: {
                    description: short + " deleted successfully"
                }
            }
            this.formErrors(del, responses)
            path.delete = {
                tags: [tagKeys[el.name]],
                operationId: "Delete a " + el.name,
                description: this.translate(del.comment),
                responses
            }
            if (!singleton) {
                const idtype = this.extractId(el)
                path.delete.parameters = [
                    this.addType(idtype, {
                        in: "path",
                        name: "id",
                        required: true
                    })
                ]
            }
            this.addParentPathId(el, path.delete)
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
        prim: string,
        schema: any,
        example: boolean = true
    ) {
        switch (prim) {
            case "string":
                schema.type = "string"
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
                type.name,
                schema,
                !attr.modifiers.queryonly
            )
        } else {
            // is this a structure, an enum or a linked resource
            const def = this.extractDefinition(name)
            switch (def.type) {
                case "structure":
                    schema.$ref = `#/components/schemas/${name}`
                    break
                case "union":
                    schema.$ref = `#/components/schemas/${name}`
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
                        this.extractId(def).type.name,
                        schema
                    )
                    if (attr.multiple) {
                        schema.example = `Link to ${attr.type.name} ${
                            def.future ? "(to be defined in the future)" : ""
                        } resource(s) via id(s)`
                    } else {
                        schema.example = `Link to a ${attr.type.name} ${
                            def.future ? "(to be defined in the future)" : ""
                        } resource via its id`
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
        if (attr.multiple) {
            schema.items = {
                type: obj.type,
                example: obj.example,
                $ref: obj.$ref
            }
            delete schema.type
            delete schema.example
            delete schema.$ref
            schema.type = "array"
        }

        return obj
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
            const name = el.name
            const short = el.short
            const comment = this.translate(el.comment)
            if ("configuration-resource" === el.type) {
                const tag = {
                    name: short,
                    description: `(configuration) ${comment}`
                }
                tags.push(tag)
                tagKeys[name] = tag.name
            }
            if ("asset-resource" === el.type) {
                const tag = {
                    name: short,
                    description: `(asset) ${comment}`
                }
                tags.push(tag)
                tagKeys[name] = tag.name
            }
            if ("request-resource" === el.type) {
                const tag = {
                    name: short,
                    description: `(request) ${comment}`
                }
                tags.push(tag)
                tagKeys[name] = tag.name
            }
            if ("subresource" === el.type) {
                const tag = {
                    name: `${el.parentShort} / ${short}`,
                    description: `(subresource) ${comment}`
                }
                tags.push(tag)
                tagKeys[name] = tag.name
            }
            if ("action" === el.type) {
                const tag = {
                    name: `${el.parent} / ${short}`,
                    description: `(${
                        el.async ? "async" : "sync"
                    } action) ${comment}`
                }
                tags.push(tag)
                tagKeys[name] = tag.name
            }
        }
    }

    private addDefinition(
        definitions: any,
        def: IDefinition,
        out: boolean,
        mutable: boolean,
        suffix: string
    ) {
        const attrs = def.attributes || []
        const properties: any = {}
        const required: string[] = []
        const request = { type: "object", properties, required } as {
            type: string
            properties: any
            required: string[]
            allOf: {}
        }
        for (const attr of attrs as IAttribute[]) {
            if (attr.modifiers.queryonly) {
                continue
            }
            // no id types unless they we are an output struct
            if (
                (attr.name === "id" && !out) ||
                ((attr.modifiers.output || attr.modifiers.synthetic) && !out)
            ) {
                continue
            }
            // if we are mutable only take mutable attributes
            if (mutable && !attr.modifiers.mutable) {
                continue
            }

            if (!attr.modifiers.optional && !mutable) {
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
            definitions[def.name + suffix] = request
        } else {
            this.empty.add(def.name + suffix)
        }
    }

    private addUnionDefinition(
        definitions: any,
        def: IDefinition,
        out: boolean,
        suffix: string
    ) {
        const attrs = def.attributes || []
        const mapping: { [key: string]: string } = {}

        const name = def.name + suffix
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
                    this.addDefinition(definitions, def, false, false, "Input")
                }
                if (def.generateOutput) {
                    this.addDefinition(definitions, def, true, false, "Output")
                }
                if (def.generateMutable) {
                    this.addDefinition(definitions, def, false, true, "Mutable")
                }

                // handle multiget
                if (def.generateMulti) {
                    const elements = {
                        description:
                            "Array of retrieved " + pluralizeName(def.name),
                        type: "array",
                        items: {
                            $ref: "#/components/schemas/" + def.name + "Output"
                        }
                    }
                    const props: { [name: string]: any } = {}
                    const full = {
                        type: "object",
                        properties: props
                    }
                    const plural = lowercaseFirst(pluralizeName(def.short))
                    props[plural] = elements
                    definitions[def.name + "MultiResponse"] = full
                }
            }
            if ("structure" === def.type && def.generateInput) {
                this.addDefinition(definitions, def, true, false, "")
            }
            if ("union" === def.type && def.generateInput) {
                this.addUnionDefinition(definitions, def, true, "")
            }
        }

        definitions.Error = {
            description:
                "Error details, only available if there was an issue in processing",
            type: "object",
            properties: {
                httpStatusCode: {
                    type: "integer",
                    description:
                        "The integer HTTP error status code for this problem"
                },
                errorCode: {
                    type: "string",
                    description:
                        " Optional, more granular error code for this problem"
                },
                message: {
                    type: "string",
                    description: "Human readable error message"
                }
            }
        }
    }
}
