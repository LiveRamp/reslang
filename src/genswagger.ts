import {
    snakeCase,
    pluralizeName,
    getVersion,
    camelCase,
    lowercaseFirst
} from "./names"
import {
    IResourceLike,
    IAttribute,
    IOperation,
    isResourceLike,
    isStructure,
    isUnion,
    isEnum,
    isAction,
    getAllAttributes,
    getKeyAttributes
} from "./treetypes"
import { BaseGen, Verbs } from "./genbase"

/**
 * generate swagger from the parsed representation
 */

export default class SwagGen extends BaseGen {
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
                description: this.translateDoc(this.namespace.comment),
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
        this.formTags(tags, tagKeys)

        // form the paths
        for (const el of this.defs) {
            // don't generate for any imported def
            if (el.secondary) {
                continue
            }
            if (isResourceLike(el)) {
                if (el.future) {
                    continue
                }
                const action = isAction(el)
                let parents = ""
                let params: any[] = []
                let pname = el.parentName
                let major = getVersion(el.short)
                let first = true
                while (pname) {
                    const actual = this.extractDefinition(
                        pname
                    ) as IResourceLike
                    if (!actual.parentName) {
                        major = getVersion(actual.short)
                    }
                    const maybe = getVersion(actual.short)
                    if (maybe) {
                        major = maybe
                    }
                    const singular = lowercaseFirst(camelCase(actual.short))
                    let full = snakeCase(actual.short)
                    if (
                        isResourceLike(actual) &&
                        !actual.singleton &&
                        actual.type !== "action"
                    ) {
                        full = pluralizeName(full)
                    }
                    pname = actual.parentName
                    if (action && el.bulk && first) {
                        parents = `/${full}` + parents
                    } else {
                        parents = `/${full}/\{${singular}Id\}` + parents
                        this.addParentPathParam(params, actual, singular + "Id")
                    }
                    first = false
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

    private formNonIdOperations(
        el: IResourceLike,
        path: any,
        params: any[],
        tagKeys: { [key: string]: string },
        post: IOperation | null,
        multiget: IOperation | null
    ) {
        const plural = pluralizeName(el.short)
        const unique = this.formSingleUniqueName(el)
        const camel = camelCase(unique)

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
            path.post = {
                tags: [tagKeys[unique]],
                operationId: this.formOperationId(el, Verbs.POST),
                description: this.translateDoc(post.comment),
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                $ref: `#/components/schemas/${camel}Input`
                            }
                        }
                    }
                },
                responses
            }
            if (this.empty.has(camel + "Input")) {
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
                if (
                    attr.modifiers.query ||
                    attr.modifiers.queryonly ||
                    attr.modifiers.representation
                ) {
                    gparams.push(
                        this.addType(attr, {
                            in: "query",
                            name: attr.name,
                            description: this.translateDoc(attr.comment),
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
                                $ref: `#/components/schemas/${camel}MultiResponse`
                            }
                        }
                    }
                }
            }
            this.formErrors(multiget, responses)
            const rname = this.formSingleUniqueName(el)
            path.get = {
                tags: [tagKeys[rname]],
                operationId: this.formOperationId(el, Verbs.MULTIGET),
                description: this.translateDoc(multiget.comment),
                responses
            }
            if (gparams.length) {
                path.get.parameters = gparams
            }
        }
    }

    private addParentPathParam(
        paths: any[],
        parent: IResourceLike,
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
        el: IResourceLike,
        path: any,
        params: any[],
        singleton: boolean,
        tagKeys: { [key: string]: string },
        get?: IOperation | null,
        put?: IOperation | null,
        patch?: IOperation | null,
        del?: IOperation | null
    ) {
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
        const sane = camelCase(this.formSingleUniqueName(el))
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
            const rname = this.formSingleUniqueName(el)
            path.get = {
                tags: [tagKeys[rname]],
                operationId: this.formOperationId(el, Verbs.GET),
                description: this.translateDoc(get.comment),
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
            for (const attr of el.attributes as IAttribute[]) {
                if (attr.modifiers.representation) {
                    path.get.parameters = path.get.parameters.concat([
                        this.addType(attr, {
                            in: "query",
                            name: attr.name,
                            description: this.translateDoc(attr.comment),
                            required: false
                        })
                    ])
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
            const rname = this.formSingleUniqueName(el)
            path.put = {
                tags: [tagKeys[rname]],
                operationId: this.formOperationId(el, Verbs.PUT),
                description: this.translateDoc(put.comment),
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
            const rname = this.formSingleUniqueName(el)
            path.patch = {
                tags: [tagKeys[rname]],
                operationId: this.formOperationId(el, Verbs.PATCH),
                description: this.translateDoc(patch.comment),
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
            const rname = this.formSingleUniqueName(el)
            path.delete = {
                tags: [tagKeys[rname]],
                operationId: this.formOperationId(el, Verbs.DELETE),
                description: this.translateDoc(del.comment),
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
                    description: this.translateDoc(code.comment),
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

    private formTags(tags: any[], tagKeys: { [key: string]: string }) {
        for (const el of this.defs) {
            // don't generate for any imported def
            if (el.secondary || !isResourceLike(el) || el.future) {
                continue
            }
            const comment = this.translateDoc(el.comment)
            let prefix = null
            if ("configuration-resource" === el.type) {
                prefix = "(configuration) "
            }
            if ("asset-resource" === el.type || "resource" === el.type) {
                prefix = "(resource) "
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
                    (el.bulk ? "bulk " : "") +
                    (el.async ? "async " : "sync ") +
                    "action) "
            }
            if (prefix) {
                const name = this.formSingleUniqueName(el)
                const tag = {
                    name,
                    description: `${prefix} ${comment}`
                }
                tags.push(tag)
                tagKeys[name] = tag.name
            }
        }
    }

    private formDefinitions(definitions: any) {
        for (const def of this.defs) {
            const sane = camelCase(def.name)
            if (isResourceLike(def) && !def.secondary) {
                if (def.generateInput) {
                    this.addResourceDefinition(
                        definitions,
                        def,
                        Verbs.POST,
                        "Input"
                    )
                }
                if (def.generateOutput) {
                    this.addResourceDefinition(
                        definitions,
                        def,
                        Verbs.GET,
                        "Output"
                    )
                }
                if (def.generatePuttable) {
                    this.addResourceDefinition(
                        definitions,
                        def,
                        Verbs.PUT,
                        "Puttable"
                    )
                }
                if (def.generatePatchable) {
                    this.addResourceDefinition(
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
            if (isStructure(def) && def.generateInput) {
                this.addStructureDefinition(
                    definitions,
                    def,
                    "",
                    getKeyAttributes(def)
                )
            }
            if (isUnion(def) && def.generateInput) {
                this.addUnionDefinition(definitions, def, "")
            }
            if (isEnum(def) && def.generateInput) {
                this.addEnumDefinition(definitions, def, "")
            }
        }
    }

    /** determine if we should generate input or output definitions for each entity */
    private markGenerate(includeErrors: boolean) {
        // handle each primary structure and work out if we should generate structures for it
        for (const el of this.defs) {
            // don't generate for any imported def
            if (el.secondary) {
                continue
            }

            if (isResourceLike(el)) {
                if (el.future) {
                    continue
                }
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

            // now work out if attributes reference any structures or other resources
            for (const attr of getAllAttributes(el) || []) {
                const def = this.extractDefinitionGently(attr.type.name)
                if (def && !attr.inline && !attr.linked) {
                    def.generateInput = true
                }
            }
        }
        // mark the standarderror as included - it is referenced implicitly by some operations
        this.extractDefinition("StandardError").generateInput = true
    }
}
