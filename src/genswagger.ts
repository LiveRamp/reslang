import {
    fixName,
    pluralizeName,
    getVersion,
    sanitize,
    fixNameCamel
} from "./names"
import { IDefinition, IAttribute, IOperation, ResourceType } from "./treetypes"
import { BaseGen } from "./genbase"
import { isPrimitiveType } from "./parse"

/**
 * generate swagger from the parsed representation
 */

export default class SwagGen extends BaseGen {
    public generate() {
        const tags: any[] = []
        const paths: any = {}
        const schemas: any = {}
        const parameters: any = {}
        const swag: object = {
            openapi: "3.0.1",
            info: {
                title: this.namespace.title,
                description: this.namespace.comment,
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
                let parentName = null
                if (el.parent) {
                    const parent = this.extractDefinition(el.parent)
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

                let path: any = {}

                /**
                 * non-id definitions
                 */
                const post = this.extractOp(el, "POST")
                const multiget = this.extractOp(el, "MULTIGET")

                if (singleton && (post || multiget)) {
                    throw new Error(
                        `${
                            el.name
                        } is a singleton - cannot have POST or MULTIGET`
                    )
                }

                if (!singleton && (post || multiget)) {
                    if (parentName) {
                        paths[
                            `/${version}/${parentName}/{parentId}/${name}`
                        ] = path
                    } else {
                        paths[`/${version}/${name}`] = path
                    }

                    if (post) {
                        el.generateInput = true
                        if (el.extends) {
                            const ext = this.extractDefinition(el.extends.name)
                            ext.generateInput = true
                        }
                    }
                    if (multiget) {
                        el.generateMulti = true
                        el.generateOutput = true
                        if (el.extends) {
                            const ext = this.extractDefinition(el.extends.name)
                            ext.generateOutput = true
                        }
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
                                `/${version}/${parentName}/{parentId}/${sname}`
                            ] = path
                        } else {
                            paths[`/${version}/${sname}`] = path
                        }
                    } else {
                        if (parentName) {
                            paths[
                                `/${version}/${parentName}/{parentId}/${name}/{id}`
                            ] = path
                        } else {
                            paths[`/${version}/${name}/{id}`] = path
                        }
                    }
                }

                if (put) {
                    el.generateInput = true
                }
                if (get) {
                    el.generateOutput = true
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

        // model definitions
        this.formDefinitions(schemas)

        return swag
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
            const responses = {
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
            this.formErrors(post, responses)
            path.post = {
                tags: [tagKeys[short]],
                operationId: "create" + short,
                description: post.comment,
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
            this.addParentPathId(el, path.post)
        }
        if (multiget) {
            if (el.attributes && multiget.ids) {
                const params: any[] = []

                for (const attr of el.attributes as IAttribute[]) {
                    if (multiget.ids.includes(attr.name)) {
                        params.push(
                            this.addType(attr, {
                                in: "query",
                                name: attr.name,
                                description: attr.comment,
                                required: false
                            })
                        )
                    }
                }
                params.push({
                    in: "query",
                    name: "offset",
                    description:
                        "Offset of the record (starting from 0) to include in the response.",
                    schema: {
                        type: "integer",
                        format: "int32"
                    }
                })
                params.push({
                    in: "query",
                    name: "limit",
                    description: `Number of records to return. If unspecified, 10 records will be returned.\
 Maximum value for limit can be 100`,
                    schema: {
                        type: "integer",
                        format: "int32"
                    }
                })

                const short = el.short
                const responses = {
                    200: {
                        description:
                            pluralizeName(short) + " retrieved successfully",
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
                    tags: [tagKeys[short]],
                    operationId: "multiget" + el.name,
                    description: multiget.comment,
                    parameters: params,
                    responses
                }
                this.addParentPathId(el, path.get)
            }
        }
    }

    /**
     * make a parameter
     */
    private makeProperty(attr: IAttribute): { name: string; prop: any } {
        const def = this.extractDefinitionGently(attr.type.name)
        if (def) {
            def.generateInput = true
        }
        let name = attr.name
        if (def && ResourceType.includes(def.type)) {
            const fix = fixNameCamel(attr.type.short)
            if (attr.name.toLowerCase() === fix.toLowerCase()) {
                name = attr.name + "Id"
            } else {
                name = attr.name + fix + "Id"
            }
            if (attr.multiple) {
                name = name + "s"
            }
        }
        const prop = {
            description: attr.comment
        }
        this.addType(attr, prop, false)
        return { name, prop }
    }

    private addParentPathId(el: any, path: any) {
        if (el.parent) {
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
            const idtype = this.extractId(el)
            const short = el.short
            const responses = {
                200: {
                    description: short + " retrieved successfully",
                    content: {
                        "application/json": {
                            schema: {
                                $ref:
                                    "#/components/schemas/" + el.name + "Output"
                            }
                        }
                    }
                }
            }
            this.formErrors(get, responses)
            path.get = {
                tags: [tagKeys[short]],
                operationId: "retrieve" + el.name,
                description: get.comment,
                responses
            }
            if (!singleton) {
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
            const idtype = this.extractId(el)
            const short = el.short
            const responses = {
                200: {
                    description: short + " modified successfully",
                    content: {
                        "application/json": {
                            schema: {
                                $ref:
                                    "#/components/schemas/" + el.name + "Input"
                            }
                        }
                    }
                }
            }
            this.formErrors(put, responses)
            path.put = {
                tags: [tagKeys[short]],
                operationId: "modify" + el.name,
                description: put.comment,
                responses
            }
            if (!singleton) {
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
            const idtype = this.extractId(el)
            const short = el.short
            const responses = {
                200: {
                    description: short + " deleted successfully"
                }
            }
            this.formErrors(del, responses)
            path.delete = {
                tags: [tagKeys[short]],
                operationId: "delete" + el.name,
                description: del.comment,
                responses
            }
            if (!singleton) {
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

    private formErrors(del: IOperation, responses: any) {
        for (const err of del.errors || []) {
            // locate the error type and mark it for generation
            if (err.struct.name !== "StandardError") {
                this.extractDefinition(err.struct.name).generateInput = true
            }
            for (const code of err.codes) {
                responses[code.code] = {
                    description: code.comment || " ",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: `#/components/schemas/${
                                    err.struct.name
                                }Structure`
                            }
                        }
                    }
                }
            }
        }
    }

    private translatePrimitive(prim: string, schema: any) {
        switch (prim) {
            case "string":
                schema.type = "string"
                break
            case "int":
                schema.type = "integer"
                schema.format = "int32"
                break
            case "boolean":
                schema.type = "boolean"
                break
            case "double":
                schema.type = "number"
                break
            case "date":
                schema.type = "string"
                schema.example = "2019-04-13 (date)"
                break
            case "time":
                schema.type = "string"
                schema.example = "22:00:01 (time)"
                break
            case "datetime":
                schema.type = "string"
                schema.example = "2019-04-13T03:35:34Z (datetime)"
                break
        }
    }

    private addType(attr: IAttribute, obj: any, schemaLevel = true) {
        const type = attr.type
        // allow description overrides by caller
        if (!obj.description) {
            obj.description = attr.comment
        }
        const name = type.name
        if (schemaLevel) {
            obj.schema = {}
        }
        const schema = schemaLevel ? obj.schema : obj
        const prim = isPrimitiveType(name)
        if (prim) {
            this.translatePrimitive(type.name, schema)
        } else {
            // is this a structure, an enum or a linked resource
            const def = this.extractDefinition(attr.type.name)
            switch (def.type) {
                case "structure":
                    schema.$ref = `#/components/schemas/${
                        attr.type.name
                    }Structure`
                    break
                case "request-resource":
                case "asset-resource":
                case "configuration-resource":
                case "subresource":
                    // must have a linked annotation
                    if (!attr.linked) {
                        throw new Error(
                            `Attribute ${attr.name} references resource ${
                                attr.type
                            } but doesn't use linked`
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
                    schema.enum = this.collectInheritedLiterals(def)
                    break
                default:
                    throw Error(
                        `Cannot resolve attribute type ${obj.type} of name ${
                            obj.name
                        }`
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

    private collectInheritedLiterals(def: IDefinition): string[] {
        if (def && def.literals) {
            const plits = def.extends
                ? this.collectInheritedLiterals(
                      this.extractDefinition(def.extends.name)
                  )
                : []
            return plits.concat(def.literals)
        }
        return []
    }

    private extractOp(el: any, op: string): IOperation | null {
        if (el.operations) {
            for (const oper of el.operations) {
                if (oper.operation === op) {
                    return oper
                }
            }
        }
        return null
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
            const short = el.short
            if (
                ["asset-resource", "configuration-resource"].includes(el.type)
            ) {
                const tag = {
                    name: short,
                    description: el.comment
                }
                tags.push(tag)
                tagKeys[short] = tag.name
            }
            if ("request-resource" === el.type) {
                const tag = {
                    name: short,
                    description: `(request) ${el.comment}`
                }
                tags.push(tag)
                tagKeys[short] = tag.name
            }
            if ("subresource" === el.type) {
                const tag = {
                    name: `${el.parentShort} / ${short}`,
                    description: el.comment
                }
                tags.push(tag)
                tagKeys[short] = tag.name
            }
            if ("action" === el.type) {
                const tag = {
                    name: `${el.parent} / ${short}`,
                    description: el.comment
                }
                tags.push(tag)
                tagKeys[short] = tag.name
            }
        }
    }

    private addDefinition(
        definitions: any,
        def: IDefinition,
        out: boolean,
        suffix: string
    ) {
        const attrs = def.attributes || []
        const properties: any = {}
        const request = { type: "object", properties } as {
            type: string
            properties: any
            allOf: {}
        }
        for (const attr of attrs as IAttribute[]) {
            if ((attr.name === "id" && !out) || (attr.output && !out)) {
                // omit
            } else {
                const prop = this.makeProperty(attr)
                properties[prop.name] = prop.prop
            }
        }
        // a base definition?
        if (def.extends) {
            request.allOf = [
                { $ref: `#/components/schemas/${def.extends}${suffix}` }
            ]
        }

        definitions[def.name + suffix] = request
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
                    this.addDefinition(definitions, def, false, "Input")
                }
                if (def.generateOutput) {
                    this.addDefinition(definitions, def, true, "Output")
                }

                // handle multiget
                if (def.generateMulti) {
                    definitions[def.name + "MultiResponse"] = {
                        type: "object",
                        properties: {
                            elements: {
                                description:
                                    "Array of retrieved " +
                                    pluralizeName(def.name),
                                type: "array",
                                items: {
                                    $ref:
                                        "#/components/schemas/" +
                                        def.name +
                                        "Output"
                                }
                            }
                        }
                    }
                }
            }
            if ("structure" === def.type && def.generateInput) {
                this.addDefinition(definitions, def, false, "Structure")
            }
        }

        definitions.StandardErrorStructure = {
            description:
                "Error details, only available if there was an issue in processing",
            type: "object",
            properties: {
                httpStatusCode: {
                    type: "number",
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
