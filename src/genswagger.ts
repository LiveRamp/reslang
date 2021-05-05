import { BaseGen } from "./genbase"
import { addHeaderParams } from "./swagger/http-headers"
import {
    camelCase,
    getVersion,
    lowercaseFirst,
    pluralizeName,
    kebabCase
} from "./names"
import { isPrimitiveType } from "./parse"
import {
    AnyKind,
    getAllAttributes,
    getKeyAttributes,
    IAttribute,
    IOperation,
    IResourceLike,
    IRequestHeader,
    IHTTPHeader,
    isAction,
    isEnum,
    isResourceLike,
    isStructure,
    isUnion
} from "./treetypes"
import { Operations, Verbs } from "./operations"
import {
    Pagination,
    Cursor,
    Offset,
    strategy,
    PaginationOption,
    isValidPaginationOption,
    queryParam,
    validOptionName
} from "./swagger/pagination/index"

/**
 * generate swagger from the parsed representation
 */

export default class SwagGen extends BaseGen {
    // Reslang "operations" are uppercase string constants (DELETE, GET, etc.).
    // swagger path objects have keys for each operation, but the keys are
    // not the same as the Reslang operation. these Records maps Reslang ID
    // operations to their swagger counterparts.
    //
    // ID and non-ID operations use the same keys on the swagger path objects. For
    // example, GET and MULTIGET both use 'get'. However, Reslang will always use
    // different paths for GET and MULTIGET (the latter path will not include a
    // resource ID as a path parameter).
    //
    // Reslang avoids conflicts relating to the path key re-use by generating
    // the swagger path objects for ID operations (e.g. GET) and non-ID
    // operations (e.g.  MULTIGET) separately. See the `formIdOperations` and
    // `formNonIdOperations` functions. We keep separate swagger path key
    // mappings for ID and non-ID operations so that `addHeaderParams` does not
    // consider headers for the wrong path.
    private reslangIdOperationsToSwaggerPathKeys: Record<string, string> = {
        DELETE: "delete",
        GET: "get",
        PATCH: "patch",
        PUT: "put"
    }

    private reslangNonIdOperationsToSwaggerPathKeys: Record<string, string> = {
        MULTIDELETE: "delete",
        MULTIGET: "get",
        MULTIPATCH: "patch",
        MULTIPOST: "post",
        MULTIPUT: "put",
        POST: "post"
    }

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

        if (servers.length === 0) {
            throw new Error(
                `no server found with environment "${this.environment}" (are you passing the correct value to --env?)`
            )
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
                    let full = kebabCase(actual.short)
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

                // name of resource
                let name = kebabCase(el.short)
                const actionPath = action ? "actions/" : ""

                if (!el.singleton && !action) {
                    name = pluralizeName(name)
                }

                /**
                 * non-id definitions
                 */
                const ops = new Operations(el)

                if (singleton && ops.hasMultiOps()) {
                    throw new Error(
                        `${el.short} is a singleton - cannot have POST, or MULTI operations`
                    )
                }

                // use the namespace override if needed
                const top = this.getTopLevelType(el) as IResourceLike
                const nspace = top.namespace ? "/" + top.namespace : ""
                const basepath: string = `${nspace}/${major}${parents}/${actionPath}${name}`

                let nonIdOpNameToOperationObjectMap: any = {}
                if (ops.hasNonIdOps() || (singleton && ops.hasOps())) {
                    paths[basepath] = nonIdOpNameToOperationObjectMap
                }

                if (ops.hasNonIdOps()) {
                    this.formNonIdOperations(
                        el,
                        nonIdOpNameToOperationObjectMap,
                        params,
                        tagKeys,
                        ops,
                        schemas
                    )

                    // addHeaderParams will not over-write swagger parameters
                    // set by formNonIdOperations, but the opposite is not
                    // true. ideally, neither would over-write parameters set
                    // by the other but refactoring formNonIdOperations is
                    // somewhat risky considering its complexity and lack of
                    // test coverage. for now it is simpler and safer to just
                    // call addHeaderParams after formNonIdOperations
                    addHeaderParams(
                        el,
                        nonIdOpNameToOperationObjectMap,
                        this.defs,
                        this.reslangNonIdOperationsToSwaggerPathKeys
                    )
                }

                if (ops.hasIdOps()) {
                    let opNameToOperationObjectMap

                    if (singleton) {
                        opNameToOperationObjectMap = nonIdOpNameToOperationObjectMap
                    } else {
                        let idOpNameToOperationObjectMap: any = {}
                        paths[`${basepath}/{id}`] = idOpNameToOperationObjectMap
                        opNameToOperationObjectMap = idOpNameToOperationObjectMap
                    }

                    this.formIdOperations(
                        el,
                        opNameToOperationObjectMap,
                        params,
                        !!singleton,
                        tagKeys,
                        ops
                    )

                    // addHeaderParams will not over-write swagger parameters set
                    // by formIdOperations, but the opposite is not true. ideally,
                    // neither would over-write parameters set by the other but
                    // refactoring formIdOperations is somewhat risky considering
                    // its complexity and lack of test coverage. for now it is
                    // simpler and safer to just call addHeaderParams after
                    // formIdOperations
                    addHeaderParams(
                        el,
                        opNameToOperationObjectMap,
                        this.defs,
                        this.reslangIdOperationsToSwaggerPathKeys
                    )
                }
            }
        }

        return swag
    }

    private formNonIdOperations(
        el: IResourceLike,
        path: any,
        params: any[],
        tagKeys: { [key: string]: string },
        ops: Operations,
        schemas: { [$ref: string]: { type: string; properties: {} } }
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
            const postOnlyResourceWithoutId =
                !el.async &&
                el.operations &&
                el.operations.length === 1 &&
                !idType

            const postReturnsId = !(el.singleton || postOnlyResourceWithoutId)
            const content = postReturnsId
                ? {
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
                : null

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
        let gparams = params.slice()
        if (ops.multiget) {
            let paginator: Pagination = this.getPaginator(
                plural,
                ops.multiget.pagination
            )
            gparams = [...gparams, ...paginator.queryParams()]

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
            let ref = `${camel}MultiResponse`
            let paginationResponseRef = `${camel}MultiResponsePagination`
            let schema: any = { $ref: `#/components/schemas/${ref}` }
            let description = plural + " retrieved successfully"
            let headers =
                paginator.strategy() === strategy.Offset
                    ? (paginator as Offset).xTotalCountHeader()
                    : {}
            if (paginator.strategy() === strategy.Cursor) {
                schemas[ref].properties = {
                    ...schemas[ref].properties,
                    // `_pagination` is the RFC API-3 required response body
                    // field for the pagination information
                    _pagination: {
                        $ref: `#/components/schemas/${paginationResponseRef}`
                    }
                }
                schemas[paginationResponseRef] = {
                    ...(paginator as Cursor).getPaginationResponseBody()
                }
            }

            let responses: any = {
                200: {
                    description,
                    headers,
                    content: this.jsonContentSchema(schema)
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

    /**
     * getPaginator returns the correct pagination instance for a config.
     *
     * It defaults to a Cursor paginator if no strategy is specified,
     * and it defaults to the default pagination options if none are specified
     * (see #defaultPaginationOpts for more info).
     */
    private getPaginator(
        resourceName: string,
        config: { strategy: string; options: [] } | undefined
    ): Pagination {
        let opts = this.pegJsOptionsToPaginationOptions(
            config?.options || this.defaultPaginationOpts()
        )
        let strat = (config?.strategy as strategy) || strategy.Cursor
        let klass = Pagination.use(strat)

        return new klass(resourceName, opts)
    }

    private jsonContentSchema(schema: any) {
        return {
            "application/json": {
                schema
            }
        }
    }

    /* pegJsOptionsToPaginationOptions converts parsed pegjs options into
     * options that the Pagination module understands.
     *
     * In reslang, an "option" means specifically an object of { name, value }.
     * This function filters a list of options down to the valid pagination
     * options, and returns those with a non-false value.
     *
     * (The false value is supported in pegjs for apis which want to explicitly
     * mark a value as not included.)
     */
    private pegJsOptionsToPaginationOptions(
        opts: { name: string; value: any }[]
    ): PaginationOption[] {
        return opts
            .filter((o) => isValidPaginationOption(o.name))
            .filter((o) => o.value !== false)
            .map((o) => o as PaginationOption)
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

    /**
     defaultPaginationOpts returns the pagination options when none
     are specified by the user. Since cursor pagination is the default
     strategy, the only required pagination parameters are the "after" cursor
     and the limit configs.
    */
    private defaultPaginationOpts(): PaginationOption[] {
        return [
            {
                name: queryParam.After, // this could equivalently be `responseField.After`, since they are always the same strings under the hood
                value: true
            },
            {
                name: "defaultLimit",
                value: this.rules.limit || 10
            },
            {
                name: "maxLimit",
                value: this.rules.maxLimit || 100
            }
        ]
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
                    let refName = "#/components/schemas/" + sane + "Output"
                    const elements = {
                        description:
                            "Array of retrieved " + pluralizeName(def.name),
                        type: "array",
                        items: {
                            $ref: refName
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
                    if (ops.multipost) {
                        el.generateInput = true
                    }
                    if (ops.multiget) {
                        el.generateMultiGettable = true
                        el.generateOutput = true
                    }
                }

                if (ops.post) {
                    el.generateInput = true
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
