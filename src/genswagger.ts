import { fixName, pluralizeName, getVersion, sanitize } from "./names"
import {
    IDefinition,
    IAttribute,
    IOperation,
    PrimitiveType,
    ResourceType
} from "./treetypes"
import { BaseGen } from "./genbase"
import { isPrimitiveType } from "./parse"

/**
 * generate swagger from the parsed representation
 */

export default class SwagGen extends BaseGen {
    public generate() {
        const tags: any[] = []
        const paths: any = {}
        const definitions: any = {}
        const swag: object = {
            swagger: "2.0",
            info: {
                title: this.namespace.title,
                description: this.namespace.comment,
                version: this.namespace.version
            },
            host: "liveramp.net",
            basePath: "/" + this.namespace.title,
            schemes: ["http", "https"],
            tags,
            paths,
            definitions
        }

        // tags
        const tagKeys = {}
        this.formTags(this.defs, tags, tagKeys)

        // form the paths
        for (const el of this.defs) {
            // don't generate for any imported def
            if (el.secondary) {
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
        this.formDefinitions(definitions)

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
            path.post = {
                tags: [tagKeys[short]],
                operationId: "create" + short,
                description: post.comment,
                parameters: [
                    {
                        in: "body",
                        name: el.name + "Input",
                        required: true,
                        schema: {
                            $ref: "#/definitions/" + el.name + "Input"
                        }
                    }
                ],
                responses: {
                    200: {
                        description: short + " created successfully"
                    },
                    default: {
                        description: "Error creating " + short,
                        schema: {
                            $ref: "#/definitions/ErrorBody"
                        }
                    }
                }
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

                const short = el.short
                path.get = {
                    tags: [tagKeys[short]],
                    operationId: "multiget" + el.name,
                    description: multiget.comment,
                    parameters: params,
                    responses: {
                        200: {
                            description:
                                pluralizeName(short) +
                                " retrieved successfully",
                            schema: {
                                $ref:
                                    "#/definitions/" + el.name + "MultiResponse"
                            }
                        },
                        default: {
                            description:
                                "Error retrieving " + pluralizeName(short),
                            schema: {
                                $ref: "#/definitions/ErrorBody"
                            }
                        }
                    }
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
            name = attr.name + "-" + fixName(attr.type.short) + "-id"
            if (attr.multiple) {
                name = name + "s"
            }
        }
        const prop = {
            description: attr.comment
        }
        this.addType(attr, prop)
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
            path.get = {
                tags: [tagKeys[short]],
                operationId: "retrieve" + el.name,
                description: get.comment,
                responses: {
                    200: {
                        description: short + " retrieved successfully",
                        schema: {
                            $ref: "#/definitions/" + el.name + "Output"
                        }
                    },
                    default: {
                        description: "Error retrieving " + el.name,
                        schema: {
                            $ref: "#/definitions/ErrorBody"
                        }
                    }
                }
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
            path.put = {
                tags: [tagKeys[short]],
                operationId: "modify" + el.name,
                description: put.comment,
                responses: {
                    200: {
                        description: short + " modified successfully",
                        schema: {
                            $ref: "#/definitions/" + el.name + "Input"
                        }
                    },
                    default: {
                        description: "Error modifying " + short,
                        schema: {
                            $ref: "#/definitions/ErrorBody"
                        }
                    }
                }
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
            path.delete = {
                tags: [tagKeys[short]],
                operationId: "delete" + el.name,
                description: del.comment,
                responses: {
                    200: {
                        description: short + " deleted successfully"
                    },
                    default: {
                        description: "Error deleting " + short,
                        schema: {
                            $ref: "#/definitions/ErrorBody"
                        }
                    }
                }
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

    private addType(attr: IAttribute, obj: any) {
        const type = attr.type
        // allow description overrides by caller
        if (!obj.description) {
            obj.description = attr.comment
        }
        const name = type.name
        const prim = isPrimitiveType(name)
        if (prim) {
            switch (name) {
                case "string":
                    obj.type = "string"
                    break
                case "int":
                    obj.type = "integer"
                    obj.format = "int32"
                    break
                case "boolean":
                    obj.type = "boolean"
                    break
                case "double":
                    obj.type = "number"
                    break
                case "date":
                    obj.type = "string"
                    obj.example = "2019-04-13 (date)"
                    break
                case "time":
                    obj.type = "string"
                    obj.example = "22:00:01 (time)"
                    break
                case "datetime":
                    obj.type = "string"
                    obj.example = "2019-04-13T03:35:34Z (datetime)"
                    break
            }
        } else {
            // is this a structure, an enum or a linked resource
            const def = this.extractDefinition(attr.type.name)
            switch (def.type) {
                case "structure":
                    obj.$ref = `#/definitions/${attr.type.name}Structure`
                    break
                case "request-resource":
                case "asset-resource":
                case "configuration-resource":
                    // must have a linked annotation
                    if (!attr.linked) {
                        throw new Error(
                            `Attribute ${attr.name} references resource ${
                                attr.type
                            } but doesn't use linked`
                        )
                    }
                    obj.type = "string"
                    obj.example = "Link to garage via id(s)"
                    break
                case "enum":
                    obj.type = "string"
                    // collect any inherited literals
                    obj.enum = this.collectInheritedLiterals(def)
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
            obj.items = {
                type: obj.type,
                example: obj.example,
                $ref: obj.$ref
            }
            delete obj.type
            delete obj.example
            delete obj.$ref
            obj.type = "array"
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
            if (el.secondary) {
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
            request.allOf = [{ $ref: `#/definitions/${def.extends}${suffix}` }]
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
                            page: {
                                description: "Page offset, starting from 1",
                                type: "integer",
                                format: "int32"
                            },
                            "page-size": {
                                description: "Size of returned page",
                                type: "integer",
                                format: "int32"
                            },
                            elements: {
                                description:
                                    "Array of retrieved " +
                                    pluralizeName(def.name),
                                type: "array",
                                items: {
                                    $ref: "#/definitions/" + def.name + "Output"
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

        definitions.ErrorBody = {
            type: "object",
            properties: {
                "http-status": {
                    type: "number",
                    description:
                        "The integer HTTP error status code for this problem"
                },
                "error-code": {
                    type: "string",
                    description: "Service specific error code, more granular"
                },
                message: {
                    type: "string",
                    description: "General, human readable error message"
                },
                detail: {
                    type: "string",
                    description:
                        "Human readable message specific to this occurrence"
                },
                path: {
                    type: "string",
                    description: "The request field that the error is about"
                }
            }
        }
    }
}
