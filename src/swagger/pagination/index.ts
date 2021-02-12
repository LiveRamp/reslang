type _option<T> = { name: T; value: any }

/**
 * PaginationOption represents any option (`name` and `value` fields) whose
 * name is a valid pagination option string (see `validOptionName`).
 */
export type PaginationOption = _option<validOptionName>

type QueryOption = _option<queryParam>
type ResponseOption = _option<responseField>

/**
 * isValidPaginationOption returns true if the string is a
 * validPatinationOption.
 *
 * Use this function to ensure that data provided from other sources
 * is compatible with the pagination module, and to filter out any
 * invalid options.
 */
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
 * swaggerProps is how Swagger structures `properties` fields, where the key
 * of the object is the property name, and it maps to an object
 * with `type` and `description` fields.
 */
type swaggerProps = {
    [name: string]: { type: string; description: string; nullable: boolean }
}

/**
 * paginationResponseBody is the RFC API-3 compliant structure for cursor-based
 * pagination responses. It should be included in MULTIGET responses under the
 * `_pagination` field
 */
type paginationResponseBody = {
    type: "object"
    properties: swaggerProps
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

/**
 * validOptionName is the union of every valid string to set as the `name`
 * of a pagination option.
 */
export type validOptionName =
    | "strategy"
    | limitOption
    | queryParam
    | responseField

/**
  Pagination is the common behavior between all pagination strategies
  (cursor and offset).
*/
export abstract class Pagination {
    readonly queryOpts: QueryOption[]
    readonly responseOpts: ResponseOption[]

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
     *
     * #opts is de-duped by name, so that only one of each valid option will
     * be in the final array.
     */
    constructor(
        readonly resourceName: string,
        readonly opts: PaginationOption[]
    ) {
        opts = uniqueBy(opts, (o) => o.name)
        this.resourceName = resourceName
        this.opts = opts.filter((o) => isValidPaginationOption(o.name))

        this.queryOpts = opts
            .filter((o) => this.isValidQueryParam(o.name))
            .map((o) => o as QueryOption)
            .filter((o) => o.value !== false)

        this.responseOpts = opts
            .filter((o) => this.isValidResponseField(o.name))
            .map((o) => o as ResponseOption)
            .filter((o) => o.value !== false)
    }

    abstract queryParams(): swaggerParam[]
    abstract strategy(): strategy

    isValidQueryParam(str: string): boolean {
        return Object.values(queryParam).includes(str as queryParam)
    }

    isValidResponseField(str: string): boolean {
        return Object.values(responseField).includes(str as responseField)
    }

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
                return None
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

export class None extends Pagination {
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
 * Cursor pagination is the officially supported LiveRamp pagination strategy.
 * It allows for stable search windows by indexing to specific records,
 * as opposed to relying on offsets and limits.
 */
export class Cursor extends Pagination {
    /**
     * queryParams returns an array of swagger-compliant query params
     * as specified by the instance's pagination options.
     *
     * The array will always include a "limit" param.
     */
    queryParams = (): swaggerParam[] => {
        return [this.qLimit(), ...this.queryOpts.map(this.optToQueryParam)]
    }

    /**
     Convert a queryParam name to a standardized Swagger query parameter object
     */
    optToQueryParam = (opt: QueryOption): swaggerParam => {
        switch (opt.name) {
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

    /**
     * swaggerType returns the Swagger-supported type for a give response field.
     */
    swaggerType = (field: responseField): {type: string, nullable: boolean} => {
        switch (field) {
            case responseField.After:
                return { type: "string", nullable: true }
            case responseField.Before:
                return { type: "string", nullable: true }
            case responseField.Total:
                return { type: "integer", nullable: false }
            case responseField.Next:
                return { type: "string", nullable: true }
            case responseField.Previous:
                return { type: "string", nullable: true }
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
     * toResponseProp translates an option into a Swagger response property.
     */
    toResponseProp = (opt: ResponseOption): swaggerProps => {
        let { name } = opt
        let description = this.describeResponseField(name)

        return { [name]: { ...this.swaggerType(name), description } }
    }

    /**
     * toResponseProps turns a list of ResponseOptions into an object
     * that Swagger recognizes as an object of "properties".
     *
     * This is the structure returned in Swagger responses.
     */
    toResponseProps = (opts: ResponseOption[]): swaggerProps => {
        return opts.map(this.toResponseProp).reduce(merge, {})
    }

    /**
      getPaginationResponseBody turns the user-defined pagination
      options into a form that Swagger understands, which
      complies with RFC API-3 (hence the "_pagination" key).
    */
    getPaginationResponseBody = (): paginationResponseBody => {
        return {
            type: "object",
            properties: this.toResponseProps(this.responseOpts)
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

type Unary<T> = (_a: T) => any
/**
 * uniqueBy takes a list and a unary accessor, and returns a new
 * list with members de-duped
 */
function uniqueBy<T>(arr: T[], f: Unary<T>): T[] {
    let seen = new Set()
    let ret = []
    for (let obj of arr) {
        let key = f(obj)
        if (seen.has(key)) continue

        ret.push(obj)
        seen.add(key)
    }
    return ret
}
