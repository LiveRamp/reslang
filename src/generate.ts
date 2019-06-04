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
}

interface IDefinition {
    input: boolean
    output: boolean
    multi: boolean
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
    formTags(tree, tags)

    // form the paths
    for (const el of tree[2]) {
        if ("resource" === el.type) {
            const name = pluralizeName(fixName(el.name))
            const version = getVersion(el.name)
            const singleton = el.singleton
            if (!singleton) {
                const get = extractOp(el, "GET")
                const put = extractOp(el, "PUT")
                const del = extractOp(el, "DELETE")

                const path: any = {}
                if (get || put || del) {
                    paths[`/${version}/${name}/{id}`] = path
                }
                shouldDef[el.name] = {
                    input: !!put,
                    output: !!get,
                    multi: false
                }
                if (get) {
                    const idtype = extractId(el)
                    path.get = {
                        tags: [el.name],
                        operationId: "retrieve" + el.name,
                        description: get.comment,
                        parameters: [
                            addType(idtype, {
                                in: "path",
                                name: "id",
                                required: true
                            })
                        ],
                        responses: {
                            200: {
                                description:
                                    el.name + " retrieved successfully",
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
                }
                if (put) {
                    const idtype = extractId(el)
                    path.put = {
                        tags: [el.name],
                        operationId: "modify" + el.name,
                        description: put.comment,
                        parameters: [
                            addType(idtype, {
                                in: "path",
                                name: "id",
                                required: true
                            })
                        ],
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
                }
                if (del) {
                    const idtype = extractId(el)
                    path.delete = {
                        tags: [el.name],
                        operationId: "delete" + el.name,
                        description: del.comment,
                        parameters: [
                            addType(idtype, {
                                in: "path",
                                name: "id",
                                required: true
                            })
                        ],
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
                }
            }
        }
    }

    // model definitions
    formDefinitions(tree, shouldDef, definitions)

    return swag
}

function addType(attr: IAttribute, obj: any) {
    const type = attr.type
    obj.description = attr.comment
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

function formTags(tree: any[], tags: any[]) {
    const defs: Array<{
        type: string
        name: string
        parent?: string
        comment: string
    }> = tree[2]
    for (const el of defs) {
        if ("resource" === el.type) {
            tags.push({
                name: el.name,
                description: el.comment
            })
        }
        if ("request" === el.type) {
            tags.push({
                name: el.name,
                description: `(request) ${el.comment}`
            })
        }
        if ("subresource" === el.type) {
            tags.push({
                name: `${el.parent} / ${el.name}`,
                description: el.comment
            })
        }
        if (["verb"].includes(el.type)) {
            tags.push({
                name: `${el.parent} / ${el.name}`,
                description: el.comment
            })
        }
    }
}

function addDefinition(definitions: any, def: any, out: boolean) {
    if (def.attributes) {
        const properties: any = {}
        const request = { type: "object", properties }
        for (const attr of def.attributes as IAttribute[]) {
            if (out || attr.name !== "id") {
                properties[attr.name] = addType(attr, {
                    description: attr.comment
                })
            }
        }
        definitions[def.name + (out ? "Output" : "Input")] = request
    }
}

function formDefinitions(
    tree: any,
    shouldDef: { [key: string]: IDefinition },
    definitions: any
) {
    for (const def of tree[2]) {
        if (def.type === "resource") {
            if (shouldDef[def.name].input) {
                addDefinition(definitions, def, false)
            }
            if (shouldDef[def.name].output) {
                addDefinition(definitions, def, true)
            }
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
