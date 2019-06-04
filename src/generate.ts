import { fixName, pluralizeName, getVersion } from "./names"
import { any } from "prop-types"

/**
 * generate swagger from the parsed representation
 */

interface IAttribute {
    name: string
    type: string
    output: boolean
    multiple: boolean
    linked: boolean
    comment: string
}

interface IOperation {
    operation: string
    comment: string
    ids?: string[]
}

interface IDefinition {
    input?: boolean
    output?: boolean
    multi?: boolean
}

export default function generateSwagger(title: string, tree: any[]) {
    const tags: any[] = []
    const paths: any = {}
    const shouldDef: { [key: string]: IDefinition } = {}
    const definitions: any = {}
    const swag: object = {
        swagger: "2.0",
        info: {
            title: "Simple API overview",
            description: tree[0].description,
            version: tree[0].version
        },
        host: "liveramp.net",
        basePath: "/" + title,
        schemes: ["http", "https"],
        tags,
        paths,
        definitions
    }

    // tags
    const defs = tree[2]
    const tagKeys = {}
    formTags(defs, tags, tagKeys)

    // form the paths
    for (const el of defs) {
        shouldDef[el.name] = {}
        if (["resource", "subresource", "request", "verb"].includes(el.type)) {
            const parent = el.parent ? el.parent : null
            const parentName = parent ? pluralizeName(fixName(parent)) : null
            const sname = fixName(el.name)
            const name = pluralizeName(sname)
            const version = parent ? getVersion(el.parent) : getVersion(el.name)
            const singleton = el.singleton

            let path: any = {}

            /**
             * non-id definitions
             */
            const post = extractOp(el, "POST")
            const multiget = extractOp(el, "MULTIGET")

            if (singleton && (post || multiget)) {
                throw new Error(
                    `${el.name} is a singleton - cannot have POST or MULTIGET`
                )
            }

            if (!singleton && (post || multiget)) {
                if (parent) {
                    paths[`/${version}/${parentName}/{parentId}/${name}`] = path
                } else {
                    paths[`/${version}/${name}`] = path
                }

                if (post) {
                    shouldDef[el.name].input = true
                }
                if (multiget) {
                    shouldDef[el.name].multi = true
                    shouldDef[el.name].output = true
                }
                formNonIdOperations(el, path, defs, tagKeys, post, multiget)
            }

            /**
             * id definitions
             */
            const get = extractOp(el, "GET")
            const put = extractOp(el, "PUT")
            const del = extractOp(el, "DELETE")

            path = {}
            if (get || put || del) {
                if (singleton) {
                    if (parent) {
                        paths[
                            `/${version}/${parentName}/{parentId}/${sname}`
                        ] = path
                    } else {
                        paths[`/${version}/${sname}`] = path
                    }
                } else {
                    if (parent) {
                        paths[
                            `/${version}/${parentName}/{parentId}/${name}/{id}`
                        ] = path
                    } else {
                        paths[`/${version}/${name}/{id}`] = path
                    }
                }
            }

            if (put) {
                shouldDef[el.name].input = true
            }
            if (get) {
                shouldDef[el.name].output = true
            }
            formIdOperations(el, path, singleton, defs, tagKeys, get, put, del)
        }
    }

    // model definitions
    formDefinitions(defs, shouldDef, definitions)

    return swag
}

function formNonIdOperations(
    el: any,
    path: any,
    defs: any[],
    tagKeys: { [key: string]: string },
    post: IOperation | null,
    multiget: IOperation | null
) {
    if (post) {
        path.post = {
            tags: [tagKeys[el.name]],
            operationId: "create" + el.name,
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
                    description: el.name + " created successfully"
                },
                default: {
                    description: "Error creating " + el.name,
                    schema: {
                        $ref: "#/definitions/ErrorBody"
                    }
                }
            }
        }
        addParentPathId(el, path.post, defs)
    }
    if (multiget) {
        if (el.attributes && multiget.ids) {
            const params: any[] = []

            for (const attr of el.attributes as IAttribute[]) {
                if (multiget.ids.includes(attr.name)) {
                    params.push(
                        addType(attr, {
                            in: "query",
                            name: attr.name,
                            description: attr.comment,
                            required: false
                        })
                    )
                }
            }

            path.get = {
                tags: [tagKeys[el.name]],
                operationId: "multiget" + el.name,
                description: multiget.comment,
                parameters: params,
                responses: {
                    200: {
                        description:
                            pluralizeName(el.name) + " retrieved successfully",
                        schema: {
                            $ref: "#/definitions/" + el.name + "MultiResponse"
                        }
                    },
                    default: {
                        description:
                            "Error retrieving " + pluralizeName(el.name),
                        schema: {
                            $ref: "#/definitions/ErrorBody"
                        }
                    }
                }
            }
            addParentPathId(el, path.get, defs)
        }
    }
}

function addParentPathId(el: any, path: any, defs: any[]) {
    if (el.parent) {
        const param = addType(extractDefinitionId(el.parent, defs), {
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

function formIdOperations(
    el: any,
    path: any,
    singleton: boolean,
    defs: any[],
    tagKeys: { [key: string]: string },
    get: IOperation | null,
    put: IOperation | null,
    del: IOperation | null
) {
    if (get) {
        const idtype = extractId(el)
        path.get = {
            tags: [tagKeys[el.name]],
            operationId: "retrieve" + el.name,
            description: get.comment,
            responses: {
                200: {
                    description: el.name + " retrieved successfully",
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
                addType(idtype, {
                    in: "path",
                    name: "id",
                    required: true
                })
            ]
        }
        addParentPathId(el, path.get, defs)
    }
    if (put) {
        const idtype = extractId(el)
        path.put = {
            tags: [tagKeys[el.name]],
            operationId: "modify" + el.name,
            description: put.comment,
            responses: {
                200: {
                    description: el.name + " modified successfully",
                    schema: {
                        $ref: "#/definitions/" + el.name + "Input"
                    }
                },
                default: {
                    description: "Error modifying " + el.name,
                    schema: {
                        $ref: "#/definitions/ErrorBody"
                    }
                }
            }
        }
        if (!singleton) {
            path.put.parameters = [
                addType(idtype, {
                    in: "path",
                    name: "id",
                    required: true
                })
            ]
        }
        addParentPathId(el, path.put, defs)
    }
    if (del) {
        const idtype = extractId(el)
        path.delete = {
            tags: [tagKeys[el.name]],
            operationId: "delete" + el.name,
            description: del.comment,
            responses: {
                200: {
                    description: el.name + " deleted successfully"
                },
                default: {
                    description: "Error deleting " + el.name,
                    schema: {
                        $ref: "#/definitions/ErrorBody"
                    }
                }
            }
        }
        if (!singleton) {
            path.delete.parameters = [
                addType(idtype, {
                    in: "path",
                    name: "id",
                    required: true
                })
            ]
        }
        addParentPathId(el, path.delete, defs)
    }
}

function addType(attr: IAttribute, obj: any) {
    const type = attr.type
    // allow description overrides by caller
    if (!obj.description) {
        obj.description = attr.comment
    }
    switch (type) {
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
        default:
            obj.type = "unknown"
            break
    }
    return obj
}

function extractDefinitionId(definitionName: string, defs: any[]) {
    for (const def of defs) {
        if (def.name === definitionName) {
            return extractId(def)
        }
    }
    throw new Error("Cannot find definition for " + definitionName)
}

function extractId(node: any): IAttribute {
    if (node.attributes) {
        for (const attr of node.attributes) {
            if (attr.name === "id") {
                return attr
            }
        }
    }
    throw new Error("Cannot find id attribute for " + node.name)
}

function extractOp(el: any, op: string): IOperation | null {
    if (el.operations) {
        for (const oper of el.operations) {
            if (oper.operation === op) {
                return oper
            }
        }
    }
    return null
}

function formTags(
    defs: Array<{
        type: string
        name: string
        parent?: string
        comment: string
    }>,
    tags: any[],
    tagKeys: { [key: string]: string }
) {
    for (const el of defs) {
        if ("resource" === el.type) {
            const tag = {
                name: el.name,
                description: el.comment
            }
            tags.push(tag)
            tagKeys[el.name] = tag.name
        }
        if ("request" === el.type) {
            const tag = {
                name: el.name,
                description: `(request) ${el.comment}`
            }
            tags.push(tag)
            tagKeys[el.name] = tag.name
        }
        if ("subresource" === el.type) {
            const tag = {
                name: `${el.parent} / ${el.name}`,
                description: el.comment
            }
            tags.push(tag)
            tagKeys[el.name] = tag.name
        }
        if (["verb"].includes(el.type)) {
            const tag = {
                name: `${el.parent} / ${el.name}`,
                description: el.comment
            }
            tags.push(tag)
            tagKeys[el.name] = tag.name
        }
    }
}

function addDefinition(
    definitions: any,
    def: any,
    out: boolean,
    suffix: string
) {
    if (def.attributes) {
        const properties: any = {}
        const request = { type: "object", properties }
        for (const attr of def.attributes as IAttribute[]) {
            if ((attr.name === "id" && !out) || (attr.output && !out)) {
                // omit
            } else {
                properties[attr.name] = addType(attr, {
                    description: attr.comment
                })
            }
        }
        definitions[def.name + suffix] = request
    }
}

function formDefinitions(
    defs: any,
    shouldDef: { [key: string]: IDefinition },
    definitions: any
) {
    for (const def of defs) {
        if (["resource", "subresource", "request", "verb"].includes(def.type)) {
            const should = shouldDef[def.name]
            if (should.input) {
                addDefinition(definitions, def, false, "Input")
            }
            if (should.output) {
                addDefinition(definitions, def, true, "Output")
            }

            // handle multiget
            if (should.multi) {
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
                                "Array of retrieved " + pluralizeName(def.name),
                            type: "array",
                            items: {
                                $ref: "#/definitions/" + def.name + "Output"
                            }
                        }
                    }
                }
            }
        }
        if ("structure" == def.type) {
            addDefinition(definitions, def, true, "Structure")
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
