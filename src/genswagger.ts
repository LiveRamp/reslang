import { BaseGen } from "./genbase"
import {
    camelCase,
    getVersion,
    lowercaseFirst,
    pluralizeName,
    snakeCase
} from "./names"
import { isPrimitiveType } from "./parse"
import {
    AnyKind,
    getAllAttributes,
    getKeyAttributes,
    IAttribute,
    IOperation,
    IResourceLike,
    isAction,
    isEnum,
    isResourceLike,
    isStructure,
    isUnion
} from "./treetypes"
import { Operations, Verbs } from "./operations"

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
        const servers: Array<any> = []
        const swag: object = {
            openapi: "3.0.1",
            info: {
                title: this.namespace.title,
                description: this.translateDoc(this.namespace.comment),
                version: this.namespace.version
            },
            servers,
            tags,
            paths,
            components: {
                parameters,
                schemas
            }
        }

        // extract the server defs
        for (const rest of this.servers.rest) {
            if (rest.environment === this.environment) {
                servers.push({
                    description: this.translateDoc(rest.comment),
                    url:
                        rest.url +
                        (this.omitNamespace ? "" : "/" + this.getSpace())
                })
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
                        if (!actual.singleton) {
                            parents = `/${full}/\{${singular}Id\}` + parents
                            this.addParentPathParam(
                                params,
                                actual,
                                singular + "Id"
                            )
                        } else {
                            parents = `/${full}` + parents
                        }
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
                const ops = new Operations(el)

                if (singleton && (ops.post || ops.isMulti())) {
                    throw new Error(
                        `${el.short} is a singleton - cannot have POST, MULTIPOST or MULTIGET`
                    )
                }

                // use the namespace override if needed
                const top = this.getTopLevelType(el) as IResourceLike
                const nspace = top.namespace ? "/" + top.namespace : ""

                if (!singleton && (ops.post || ops.isMulti())) {
                    paths[
                        `${nspace}/${major}${parents}/${actionPath}${name}`
                    ] = path
                    this.formNonIdOperations(el, path, params, tagKeys, ops)
                }

                /**
                 * id definitions
                 */

                path = {}
                if (ops.isIdOps()) {
                    if (singleton) {
                        paths[
                            `${nspace}/${major}${parents}/${actionPath}${name}`
                        ] = path
                    } else {
                        paths[
                            `${nspace}/${major}${parents}/${actionPath}${name}/{id}`
                        ] = path
                    }
                }
                this.formIdOperations(
                    el,
                    path,
                    params,
                    !!singleton,
                    tagKeys,
                    ops
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
        ops: Operations
    ) {
        const plural = pluralizeName(el.short)
        const unique = this.formSingleUniqueName(el)
        const camel = camelCase(unique)
        const notFound =
            el.parents.length === 0 || (el.parents.length === 1 && el.bulk)
                ? null
                : {
                      description: "Parent resource(s) not found",
                      content: {
                          "application/json": {
                              schema: {
                                  $ref: "#/components/schemas/StandardError"
                              }
                          }
                      }
                  }

        const short = el.short
        if (ops.post) {
            const idType = this.extractIdGently(el)
            // special case - if no id and only POST, then adjust accordingly to return nothing
            const special =
                !el.async &&
                el.operations &&
                el.operations.length === 1 &&
                !idType

            const content = special
                ? null
                : {
                      "application/json": {
                          schema: {
                              type: "object",
                              properties: {
                                  id: this.addType(
                                      this.extractId(el),
                                      {},
                                      false
                                  )
                              }
                          }
                      }
                  }
            let responses: { [code: number]: any } = {
                201: {
                    description: short + " created successfully",
                    content
                }
            }

            if (el.type === "action") {
                if (!el.async) {
                    responses = {
                        200: {
                            description: short + " action completed",
                            content
                        }
                    }
                } else {
                    responses = {
                        200: {
                            description: short + " action completed",
                            content
                        },
                        202: {
                            description:
                                short +
                                " action has been accepted, but is not yet complete",
                            content
                        },
                        204: {
                            description:
                                short +
                                " action has already been submitted and we are currently doing it"
                        }
                    }

                    if (!ops.post.errors) {
                        ops.post.errors = []
                    }
                    ops.post.errors.push({
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
            this.formErrors(ops.post, responses)
            path.post = {
                tags: [tagKeys[unique]],
                operationId: this.formOperationId(el, Verbs.POST),
                description: this.translateDoc(ops.post.comment),
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
            // possible to fail if parents not found
            if (notFound) {
                responses[404] = notFound
            }
        }
        if (ops.multipost) {
            const content = {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: this.addType(this.extractId(el), {}, false),
                                status: {
                                    $ref: "#/components/schemas/StandardError"
                                }
                            }
                        }
                    }
                }
            }
            const responses: { [code: number]: any } = {
                207: {
                    description:
                        short + " resources processed, statuses in body",
                    content
                }
            }

            this.formErrors(ops.multipost, responses)
            path.post = {
                tags: [tagKeys[unique]],
                operationId: this.formOperationId(el, Verbs.MULTIPOST),
                description: this.translateDoc(ops.multipost.comment),
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: "array",
                                items: {
                                    $ref: `#/components/schemas/${camel}Input`
                                }
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
            // possible to fail if parents not found
            if (notFound) {
                responses[404] = notFound
            }
        }
        if (ops.multiput) {
            const content = {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                status: {
                                    $ref: "#/components/schemas/StandardError"
                                }
                            }
                        }
                    }
                }
            }
            const responses: { [code: number]: any } = {
                207: {
                    description:
                        short + " modifications processed, statuses in body",
                    content
                }
            }

            this.formErrors(ops.multiput, responses)
            path.put = {
                tags: [tagKeys[unique]],
                operationId: this.formOperationId(el, Verbs.MULTIPUT),
                description: this.translateDoc(ops.multiput.comment),
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: "array",
                                items: {
                                    $ref: `#/components/schemas/${camel}MultiPuttable`
                                }
                            }
                        }
                    }
                },
                responses
            }
            if (this.empty.has(camel + "MultiPuttable")) {
                delete path.put.requestBody
            }
            if (params.length) {
                path.put.parameters = params
            }
            // possible to fail if parents not found
            if (notFound) {
                responses[404] = notFound
            }
        }
        if (ops.multipatch) {
            const content = {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                status: {
                                    $ref: "#/components/schemas/StandardError"
                                }
                            }
                        }
                    }
                }
            }
            const responses: { [code: number]: any } = {
                207: {
                    description: short + " patches processed, statuses in body",
                    content
                }
            }

            this.formErrors(ops.multipatch, responses)
            path.patch = {
                tags: [tagKeys[unique]],
                operationId: this.formOperationId(el, Verbs.MULTIPATCH),
                description: this.translateDoc(ops.multipatch.comment),
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: "array",
                                items: {
                                    $ref: `#/components/schemas/${camel}MultiPatchable`
                                }
                            }
                        }
                    }
                },
                responses
            }
            if (this.empty.has(camel + "MultiPatchable")) {
                delete path.patch.requestBody
            }
            if (params.length) {
                path.patch.parameters = params
            }
            // possible to fail if parents not found
            if (notFound) {
                responses[404] = notFound
            }
        }
        if (ops.multidelete) {
            const content = {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                status: {
                                    $ref: "#/components/schemas/StandardError"
                                }
                            }
                        }
                    }
                }
            }
            const responses: { [code: number]: any } = {
                207: {
                    description: short + " deletes processed, statuses in body",
                    content
                }
            }

            this.formErrors(ops.multidelete, responses)
            path.delete = {
                tags: [tagKeys[unique]],
                operationId: this.formOperationId(el, Verbs.MULTIDELETE),
                description: this.translateDoc(ops.multidelete.comment),
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: this.addType(
                                            this.extractId(el),
                                            {},
                                            false
                                        )
                                    }
                                }
                            }
                        }
                    }
                },
                responses
            }
            if (params.length) {
                path.delete.parameters = params
            }
            // possible to fail if parents not found
            if (notFound) {
                responses[404] = notFound
            }
        }
        const gparams = params.slice()
        if (ops.multiget) {
            const pagination = this.retrieveOption(ops.multiget, "pagination")
            // limit has already been checked to be a number
            const limit = Number(this.retrieveOption(ops.multiget, "limit"))
            const maxLimit = Number(
                this.retrieveOption(ops.multiget, "max-limit")
            )
            if (pagination === "offset") {
                gparams.push({
                    in: "query",
                    name: "offset",
                    description: `Offset of the ${plural} (starting from 0) to include in the response.`,
                    schema: {
                        type: "integer",
                        format: "int32",
                        default: 0,
                        minimum: 0
                    }
                })
            } else if (pagination === "after") {
                gparams.push({
                    in: "query",
                    name: "after",
                    description: `The value returned as X-Next-After in the previous query. Starts from beginning if not specified`,
                    schema: {
                        type: "string"
                    }
                })
            }
            if (pagination === "offset" || pagination === "after") {
                gparams.push({
                    in: "query",
                    name: "limit",
                    description: `Number of ${plural} to return`,
                    schema: {
                        type: "integer",
                        format: "int32",
                        default: limit,
                        minimum: 1,
                        maximum: maxLimit
                    }
                })
            }

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
            const responses: any = {
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
            if (pagination === "after") {
                responses["200"].headers["X-Next-After"] = {
                    description: `The opaque token to set as "after" in the next query, to continue getting results. If it isn't present, there is no more data`,
                    schema: { type: "string" }
                }
            }
            if (notFound) {
                responses[404] = notFound
            }

            this.formErrors(ops.multiget, responses)
            const rname = this.formSingleUniqueName(el)
            path.get = {
                tags: [tagKeys[rname]],
                operationId: this.formOperationId(el, Verbs.MULTIGET),
                description: this.translateDoc(ops.multiget.comment),
                responses
            }
            if (gparams.length) {
                path.get.parameters = gparams
            }
        }
    }

    private retrieveOption(multiget: IOperation, optionName: string) {
        // now see if we have set this value in the options
        for (const option of multiget.options) {
            if (option.name === optionName) {
                return option.value
            }
        }
        // see if we have something set in the global options
        switch (optionName) {
            case "pagination":
                return this.rules.pagination
            case "limit":
                return this.rules.limit
            case "max-limit":
                return this.rules.maxLimit
        }
        return null
    }

    private addParentPathParam(
        paths: any[],
        parent: IResourceLike,
        name: string
    ) {
        const param = this.addType(this.extractDefinitionId(parent.name), {
            in: "path",
            name,
            description: "Id of parent " + parent.short,
            required: true
        })
        paths.push(param)
    }

    private formIdOperations(
        el: IResourceLike,
        path: any,
        params: any[],
        singleton: boolean,
        tagKeys: { [key: string]: string },
        ops: Operations
    ) {
        const short = el.short
        const notFound = {
            description:
                short +
                (el.parents.length === 0 || (el.parents.length === 1 && el.bulk)
                    ? " not found"
                    : " or parent resource(s) not found"),
            content: {
                "application/json": {
                    schema: {
                        $ref: "#/components/schemas/StandardError"
                    }
                }
            }
        }
        const sane = camelCase(this.formSingleUniqueName(el))
        if (ops.get) {
            const responses: any = {
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
            this.formErrors(ops.get, responses)
            const rname = this.formSingleUniqueName(el)
            path.get = {
                tags: [tagKeys[rname]],
                operationId: this.formOperationId(el, Verbs.GET),
                description: this.translateDoc(ops.get.comment),
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
        if (ops.put) {
            const responses = {
                200: {
                    description: short + " modified successfully"
                },
                404: notFound
            }
            this.formErrors(ops.put, responses)
            const rname = this.formSingleUniqueName(el)
            path.put = {
                tags: [tagKeys[rname]],
                operationId: this.formOperationId(el, Verbs.PUT),
                description: this.translateDoc(ops.put.comment),
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
        if (ops.patch) {
            const responses = {
                200: {
                    description: short + " patched successfully"
                },
                404: notFound
            }
            this.formErrors(ops.patch, responses)
            const rname = this.formSingleUniqueName(el)
            path.patch = {
                tags: [tagKeys[rname]],
                operationId: this.formOperationId(el, Verbs.PATCH),
                description: this.translateDoc(ops.patch.comment),
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
        if (ops.delete) {
            const responses = {
                200: {
                    description: short + " deleted successfully"
                },
                404: notFound
            }
            this.formErrors(ops.delete, responses)
            const rname = this.formSingleUniqueName(el)
            path.delete = {
                tags: [tagKeys[rname]],
                operationId: this.formOperationId(el, Verbs.DELETE),
                description: this.translateDoc(ops.delete.comment),
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
                const def = this.extractDefinition(err.struct.name)
                const sane = camelCase(
                    this.formSingleUniqueName(def, false) +
                        (isResourceLike(def) ? "Output" : "")
                )

                responses[code.code] = {
                    description: this.translateDoc(code.comment),
                    content: {
                        "application/json": {
                            schema: {
                                $ref: `#/components/schemas/${sane}`
                            }
                        }
                    }
                }
            }
        }
    }

    private formTags(tags: any[], tagKeys: { [key: string]: string }) {
        // generate the explicit tags
        const map = new Map<string, string>() // defName to tag name
        for (const explicit of this.tags) {
            const name = explicit.name
            const tag = {
                name,
                description: this.translateDoc(explicit.comment)
            }
            tags.push(tag)

            // check all the included elements exist
            for (const include of explicit.include) {
                const el = this.extractDefinition(include.name)

                // must be a first class resource
                if (el.secondary || !isResourceLike(el) || el.future) {
                    throw new Error(
                        `Definition "${el.name}" cannot be included in tag "${explicit.name}".` +
                            ` Only top level, non-future resources can be included`
                    )
                }
                // cannot be included in another tag
                const defName = this.formSingleUniqueName(el)
                if (tagKeys[defName]) {
                    throw new Error(
                        `Definition "${defName}" cannot be included in two tags: "${name}"`
                    )
                }

                map.set(include.name, explicit.name)
                tagKeys[defName] = tag.name
            }
        }

        for (const el of this.defs) {
            // don't generate for any imported def
            if (
                el.secondary ||
                !isResourceLike(el) ||
                el.future ||
                map.has(el.name)
            ) {
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

    // tslint:disable-next-line: member-ordering
    protected formDefinitions(definitions: any) {
        for (const def of this.defs) {
            const sane = camelCase(this.formSingleUniqueName(def, false))
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
                if (def.generateMultiPuttable) {
                    this.addResourceDefinition(
                        definitions,
                        def,
                        Verbs.MULTIPUT,
                        "MultiPuttable"
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
                if (def.generateMultiPatchable) {
                    this.addResourceDefinition(
                        definitions,
                        def,
                        Verbs.MULTIPATCH,
                        "MultiPatchable"
                    )
                }

                // handle multiget
                if (def.generateMultiGettable) {
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
    // tslint:disable-next-line: member-ordering
    protected markGenerate(includeErrors: boolean) {
        // handle each primary structure and work out if we should generate structures for it
        const visited = new Set<string>()
        for (const el of this.defs) {
            if (isResourceLike(el)) {
                this.follow(el, visited, includeErrors, 0)
            }
        }
        // mark the standarderror as included - it is referenced implicitly by some operations
        this.extractDefinition("StandardError").generateInput = true
    }

    // tslint:disable-next-line: member-ordering
    protected follow(
        el: AnyKind,
        visited: Set<string>,
        includeErrors: boolean,
        level: number,
        fromUnion: boolean = false
    ) {
        // have we seen this before?
        const unique = this.formSingleUniqueName(el)
        if (visited.has(unique) && level !== 0) {
            return
        }
        visited.add(unique)

        if (isResourceLike(el)) {
            if (el.future) {
                return
            }
            // don't generate for any imported def
            if (el.secondary && level === 0) {
                // remove it from visited so we can come back again if it's referenced via an attribute
                visited.delete(unique)
                return
            }
            if (level !== 0) {
                // "full" attribute
                el.generateOutput = true
            } else {
                const ops = new Operations(el)

                if (!el.singleton) {
                    if (ops.post || ops.multipost) {
                        el.generateInput = true
                    }
                    if (ops.multiget) {
                        el.generateMultiGettable = true
                        el.generateOutput = true
                    }
                }

                if (ops.put) {
                    el.generatePuttable = true
                }
                if (ops.multiput) {
                    el.generateMultiPuttable = true
                }
                if (ops.patch) {
                    el.generatePatchable = true
                }
                if (ops.multipatch) {
                    el.generateMultiPatchable = true
                }
                if (ops.get) {
                    el.generateOutput = true
                }

                // now process errors
                if (includeErrors) {
                    for (const op of el.operations || []) {
                        for (const err of op.errors || []) {
                            // locate the error type and mark it for generation
                            const def = this.extractDefinition(err.struct.name)
                            if (isResourceLike(def)) {
                                def.generateOutput = true
                            }
                            this.follow(def, visited, includeErrors, level + 1)
                        }
                    }
                }
            }
        } else {
            // cover structures, unions etc
            if (fromUnion) {
                // remove from visited
                visited.delete(unique)
            } else {
                el.generateInput = true
            }
        }

        // now work out if attributes reference any structures or other resources
        for (const attr of getAllAttributes(el)) {
            if (!isPrimitiveType(attr.type.name)) {
                const def = this.extractDefinition(attr.type.name)
                if (def && !attr.inline && !attr.linked) {
                    this.follow(
                        def,
                        visited,
                        includeErrors,
                        level + 1,
                        isUnion(el)
                    )
                }
            }
        }
    }
}
