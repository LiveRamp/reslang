export type PaginationOption = {
    name: string
    value: any
}

export function isValidPaginationOption(str: string): boolean {
    switch (str as validOptionName) {
        case "strategy":
        case "maxLimit":
        case "defaultLimit":
        case queryParam.After:
        case queryParam.Before:
        case responseField.After:
        case responseField.Before:
        case responseField.Total:
        case responseField.Next:
        case responseField.Previous:
            return true
    }
    console.error("unrecognized pagination option:", str)
    return false
}

/**
 * This module is meant to make adding pagination to Swagger specs as easy
 * as possible.
 */

/**
 * swaggerProps is how Swagger structures `properties` fields, where the key
 * of the object is the property name, and it maps to an object
 * with `type` and `description` fields.
 */
type swaggerProps = {
    [name: string]: { type: string; description: string }
}

/**
 * paginationResponse is the RFC-3 compliant structure for cursor-based
 * pagination responses.
 */
type paginationResponse = {
    _pagination: {
        type: "object"
        properties: swaggerProps
    }
}

/**
 * wrappedResponse uses Swagger's recommended means of inheritance to
 * "infuse" a normal "#/components" response with pagination info.
 * The "allOf" style is what Swagger recommends for implementing inheritance.
 */
type wrappedResponse = {
    allOf: [{}, { type: "object"; properties: paginationResponse }]
}

/**
 * swaggerParam is how Swagger structures request parameters.
 */
export type swaggerParam = {
    in: string
    name: string
    description: string
    schema: {}
}

/**
 strategy represents one of the officially sanctioned pagination strategies.
 For now, it is "cursor" "offset", and "none".
*/
export enum strategy {
    /**
     * Officially supported pagination strategy. Send a cursor when a search
     * overflows so that subsequent searches use a stable search window.
     */
    Cursor = "cursor",
    /**
     * Offset pagination is deprecated. Please consider switching to Cursor.
     */
    Offset = "offset",
    None = "none"
}

/**
 queryParam enumerates the sanctioned user-defined pagination query parameters.
 This only deals with cursor pagination, since that is officially supported.
 For APIs that still to use offset+limit pagination, those query params
 are hardcoded in the Offset class.

 This enum does not include "limit", since that is not user-defined.
 It will always be included in API specs by necessity, and the only configs
 that users can specify are in this module's `limitOption` enum.
*/
export enum queryParam {
    After = "after",
    Before = "before"
}

export type limitOption = "maxLimit" | "defaultLimit"

/**
 responseField enumerates the sanctioned pagination response fields.
 This only deals with cursor pagination, since that is officially supported.
 */
export enum responseField {
    After = "after",
    Before = "before",
    Total = "total",
    Next = "next",
    Previous = "previous"
}

type validOptionName = "strategy" | limitOption | queryParam | responseField

/**
  Pagination is the common behavior between all pagination strategies
  (cursor and offset).
*/
export abstract class Pagination {
    readonly queryOpts: PaginationOption[]
    readonly responseOpts: PaginationOption[]

    /**
     *
     * @param resourceName
     * @param opts
     *
     * On construction, a Pagination class will categorize its `opts` into
     * either query options or response options. Query options are those
     * to be included as query params, and response options are returned
     * to consumers via the '_pagination' field.
     *
     * Some options are neither response- nor query-options, such as
     * "strategy" or "maxLimit". These behind-the-scenes options can always
     * be accessed with #opts, while #queryOpts and #responseOpts
     * are guaranteed to be valid members of their corresponding enums.
     */
    constructor(
        readonly resourceName: string,
        readonly opts: PaginationOption[]
    ) {
        this.resourceName = resourceName
        this.queryOpts = opts.filter((o) =>
            Object.values(queryParam).includes(o.name as queryParam)
        )
        this.responseOpts = opts.filter((o) =>
            Object.values(responseField).includes(o.name as responseField)
        )
        this.opts = opts.filter((o) => isValidPaginationOption(o.name))
    }
    abstract queryParams(): swaggerParam[]
    abstract strategy(): strategy

    /**
     qLimit returns a Swagger query param for "limit".
     This param is the same in both offset and cursor pagination.
    */
    qLimit(): swaggerParam {
        let defaultLimit =
            this.opts.find((o) => o.name === "defaultLimit")?.value || 10
        let maxLimit =
            this.opts.find((o) => o.name === "maxLimit")?.value || 100
        return {
            in: "query",
            name: "limit",
            description: `Number of ${this.resourceName} to return`,
            schema: {
                type: "integer",
                format: "int32",
                default: Number(defaultLimit),
                minimum: 1,
                maximum: Number(maxLimit)
            }
        }
    }

    /**
      use returns the proper constructor for the given pagination
      strategy.
    */
    public static use(strat: strategy): any {
        switch (strat) {
            case strategy.Cursor:
                return Cursor
            case strategy.Offset:
                return Offset
            case strategy.None:
                return NoOp
        }

        assertUnreachable(strat)
        throw new Error(
            unexpectedEnumMsg(
                "pagination strategy",
                Object.values(strategy),
                strat
            )
        )
    }
}

export class NoOp extends Pagination {
    strategy(): strategy {
        return strategy.None
    }

    queryParams(): swaggerParam[] {
        return []
    }
}

/**
 * Offset pagination is deprecated. Params are hardcoded, and Reslang
 * wll eventually cease to support it.
 */
export class Offset extends Pagination {
    /**
     * queryParams returns an array of swagger query params: offset and limit
     */
    queryParams(): swaggerParam[] {
        return [this.qOffset(), this.qLimit()]
    }

    /**
     * qOffset ("query Offset") returns a query param for offset pagination
     * that Swagger understands.
     */
    qOffset(): swaggerParam {
        return {
            in: "query",
            name: "offset",
            description: `Offset of the ${this.resourceName} (starting from 0) to include in the response.`,
            schema: {
                type: "integer",
                format: "int32",
                default: 0,
                minimum: 0
            }
        }
    }

    /**
     * xTotalCountHeader returns the X-Total-Count swagger object returned
     * as a header in paginated queries.
     */
    xTotalCountHeader = () => {
        return {
            "X-Total-Count": {
                description: `Total number of ${this.resourceName} returned by the query`,
                schema: { type: "integer", format: "int32" }
            }
        }
    }

    /**
     * return the Offset strategy
     */
    strategy(): strategy {
        return strategy.Offset
    }
}

/**
 * For more info on Cursor pagination techniques, see the API Squad's doc:
 * TODO -- post doc with explanations and best practices. Jira: API-410
 */
export class Cursor extends Pagination {
    /**
     * queryParams returns an array of swagger-compliant query params
     * as specified by the instance's pagination options.
     *
     * The array will always include a "limit" param.
     *
     * Any options with a value of `false` will not be returned. This supports
     * the use-case of explicitly marking an option as `false` in the reslang
     * spec, maybe as a form of "TODO". Code that consumes this module
     * is free to either filter out the false values itself, or rely on this
     * method to filter them out.
     */
    queryParams = (): swaggerParam[] => {
        return [
            this.qLimit(),
            ...this.queryOpts
                .filter((o) => o.value !== false)
                .map(this.optToQueryParam)
        ]
    }

    /**
     Convert a queryParam name to a standardized Swagger query parameter object
     */
    optToQueryParam = (opt: PaginationOption): swaggerParam => {
        switch (opt.name as queryParam) {
            case queryParam.After:
                return this.qAfter()
            case queryParam.Before:
                return this.qBefore()
        }
        assertUnreachable(name)
        throw new Error(
            unexpectedEnumMsg(
                "pagination query param",
                Object.values(queryParam),
                name
            )
        )
    }
    /**
     * qAfter returns a standard param that should be the same
     * across all LiveRamp APIs. If the need for customizing these descriptions
     * presents itself, that should be a pretty simple change.
     */
    qAfter(): swaggerParam {
        return {
            in: "query",
            name: "after",
            description: `This value is a cursor that enables continued paginated searches. Its value can be found under "_pagination.after" in the previous response from this endpoint.`,
            schema: {
                type: "string"
            }
        }
    }
    /**
     * qBefore returns a standard param that should be the same
     * across all LiveRamp APIs. If the need for customizing these descriptions
     * presents itself, that should be a pretty simple change.
     */
    qBefore(): swaggerParam {
        return {
            in: "query",
            name: "before",
            description: `This value is a cursor that enables backward-paginated searches. Its value can be found under "_pagination.before" in the previous response from this endpoint.`,
            schema: {
                type: "string"
            }
        }
    }

    /**
      describeResponseField returns the standard  description
      of a given pagination response field.
    */
    describeResponseField = (param: responseField): string => {
        switch (param) {
            case responseField.After:
                return `This field is a cursor to be passed as a query parameter in subsequent, paginated searches.
It allows the next request to begin from where the current search left off.
When "after" is  null, there are no more records to fetch for this search.`
            case responseField.Before:
                return `This field is a cursor to be passed as a query parameter in subsequent, paginated searches.
It allows the next request to query the previous page of results.
When "before" is null, there are no previous records to fetch for this search.`
            case responseField.Next:
                return `The hyperlink to fetch the next set of results.`
            case responseField.Previous:
                return `The hyperlink to fetch the previous set of results.`
            case responseField.Total:
                return `The total number of results.`
        }

        assertUnreachable(param)
        throw new Error(
            unexpectedEnumMsg(
                "pagination field",
                Object.values(responseField),
                param
            )
        )
    }

    swaggerType = (field: responseField): string => {
        switch (field) {
            case responseField.After:
                return "string"
            case responseField.Before:
                return "string"
            case responseField.Total:
                return "integer"
            case responseField.Next:
                return "string"
            case responseField.Previous:
                return "string"
        }
        assertUnreachable(field)
        throw new Error(
            unexpectedEnumMsg(
                "pagination response field",
                Object.values(responseField),
                field
            )
        )
    }

    /**
     * toSwaggerProp translates a reslang option into a Swagger property.
     *
     * Note that some types need to be translated.
     * For example, in Reslang we have `int`, but in Swagger we have `integer`.
     *
     */
    toSwaggerProp = (opt: PaginationOption): swaggerProps => {
        let name = opt.name as responseField
        let description = this.describeResponseField(name)

        return { [opt.name]: { type: this.swaggerType(name), description } }
    }

    toSwaggerProps = (opts: PaginationOption[]): swaggerProps => {
        return opts.map(this.toSwaggerProp).reduce(merge, {})
    }

    /**
      getPaginationResponse turns the user-defined pagination
      options into a form that Swagger understands, which
      complies with RFC-3 (hence the "_pagination" key).
    */
    getPaginationResponse = (): paginationResponse => {
        return {
            _pagination: {
                type: "object",
                properties: this.toSwaggerProps(this.responseOpts)
            }
        }
    }

    /**
      addPaginationToSchema uses the standard Swagger way of implementing inheritance
      ("allOf"). to add pagination to an existing "multi" response.
      This method wraps the given schema with pagination info, instead of
      re-defining the entire response body.

      ref: https://swagger.io/docs/specification/data-models/inheritance-and-polymorphism/
    */
    addPaginationToSchema = (schema: {}): wrappedResponse => {
        return {
            allOf: [
                schema,
                {
                    type: "object",
                    properties: {
                        ...this.getPaginationResponse()
                    }
                }
            ]
        }
    }

    /**
     * return the Cursor strategy
     */
    strategy(): strategy {
        return strategy.Cursor
    }
}

/**
  Utility function for testing whether a switch block is exhaustive.
  Typescript won't warn you out of the box if a switch() doesn't
  cover all of an Enum's types, so adding a call to this function
  at the end of a switch will allow the compiler to warn in such situations.
  ref: https://stackoverflow.com/a/39419171
*/
function assertUnreachable(x: never) {
    /** no implementation */
}

function unexpectedEnumMsg(
    category: string,
    okValues: any[],
    got: any
): string {
    return `unexpected ${category}: expected one of [ ${okValues.join(
        " | "
    )} ], but got ${JSON.stringify(got)}`
}

/**
 * merge is a utility function for merging two objects
 */
function merge(first: {}, second: {}): {} {
    return {
        ...first,
        ...second
    }
}
