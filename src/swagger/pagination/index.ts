import { IOption } from "../../treetypes"

type paginationProps = {
    [name: string]: { type: string; description: string }
}
type paginationResponse = {
    _pagination: {
        type: string
        properties: paginationProps
    }
}

export type swaggerParam = {
    in: string
    name: string
    description: string
    schema: {}
}

export enum strategy {
    Cursor = "cursor",
    Offset = "offset"
}

export enum queryParam {
    After = "after",
    Before = "before"
}

export enum responseField {
    After = "after",
    Before = "before",
    Total = "total",
    Next = "next",
    Previous = "previous"
}

export function defaultPaginationParams(): IOption[] {
    return [
        {
            name: "after",
            value: "string"
        }
    ]
}

/*
  Pagination is the common behavior between all pagination strategies
  (cursor and offset).
*/
export abstract class Pagination {
    constructor(
        readonly resourceName: string,
        readonly defaultLimit: number,
        readonly maxLimit: number,
        readonly opts: IOption[] = defaultPaginationParams()
    ) {}
    abstract queryParams(): swaggerParam[]
    abstract strategy(): strategy

    // qLimit returns a Swagger query param for "limit"
    qLimit(): swaggerParam {
        return {
            in: "query",
            name: "limit",
            description: `Number of ${this.resourceName} to return`,
            schema: {
                type: "integer",
                format: "int32",
                default: this.defaultLimit,
                minimum: 1,
                maximum: this.maxLimit
            }
        }
    }

    // withStrategy returns the proper constructor for the given pagination
    // strategy.
    public static withStrategy(strat: strategy): any {
        switch (strat) {
            case strategy.Cursor:
                return Cursor
            case strategy.Offset:
                return Offset
        }

        return assertUnreachable(strat)
    }
}

export class Offset extends Pagination {
    queryParams(): swaggerParam[] {
        return [this.offsetParam(), this.qLimit()]
    }

    offsetParam(): swaggerParam {
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

    strategy(): strategy {
        return strategy.Offset
    }
}

export class Cursor extends Pagination {
    queryParams = (): swaggerParam[] => {
        return [
            this.qLimit(),
            ...this.opts
                .map((o) => o.name as queryParam)
                .filter(this.isValidQueryParam)
                .map(this.queryToSwagger)
        ]
    }

    qAfter(): swaggerParam {
        return {
            in: "query",
            name: "after",
            description: `The value returned as "_pagination.after" in the previous query. Starts from the beginning if not specified`,
            schema: {
                type: "string"
            }
        }
    }

    qBefore(): swaggerParam {
        return {
            in: "query",
            name: "before",
            description: `The value returned as "_pagination.before" in the previous query.`,
            schema: {
                type: "string"
            }
        }
    }

    queryToSwagger = (param: queryParam): swaggerParam => {
        switch (param) {
            case queryParam.After:
                return this.qAfter()
            case queryParam.Before:
                return this.qBefore()
        }
        return assertUnreachable(param)
    }

    // describeResponseField returns the Swagger description of a given
    // pagination parameter.
    describeResponseField = (param: responseField): string => {
        switch (param) {
            case responseField.After:
                return `This field is a cursor to be passed as a query parameter in subsequent, paginated searches.
It allows the next request to begin from where the current search left off.
When "after" is  null, there are no more records to fetch for this search.`
            case responseField.Before:
                return `This field is a cursor to be passed as a query parameter in subsequent, paginated searches.
It allows the next request to query previous results.
When "before" is null, there are no previous records to fetch for this search.`
            case responseField.Next:
                return `The hyperlink to fetch the next set of results.`
            case responseField.Previous:
                return `The hyperlink to fetch the previous set of results.`
            case responseField.Total:
                return `The total number of results.`
        }

        return assertUnreachable(param)
    }

    // addSwaggerProp merges an option into the given object.
    // It turns the option's name into a top-level key, whose value
    // is an object with "type" and "description".
    addSwaggerProp = (obj: paginationProps, opt: IOption): paginationProps => {
        return {
            ...obj,
            [opt.name]: {
                type: opt.value,
                description: this.describeResponseField(
                    opt.name as responseField
                )
            }
        }
    }

    // isValidResponseField returns true if the input is the name of a valid
    // cursor-based pagination response field. See enum responseField for valid
    // values.
    isValidResponseField(name: string) {
        return Object.values(responseField).includes(name as responseField)
    }

    // isValidQueryParam returns true if the input is the name of a valid
    // cursor-based pagination response field. See enum responseField for valid
    // values.
    isValidQueryParam = (name: string) => {
        return Object.values(queryParam).includes(name as queryParam)
    }

    // getPaginationResponse turns the user-defined pagination
    // options into a form that Swagger understands, which
    // complies with RFC-3 (hence the "_pagination" key).
    getPaginationResponse = (): paginationResponse => {
        let validOpts = this.opts.filter((opt) =>
            this.isValidResponseField(opt.name)
        )
        return {
            _pagination: {
                type: "object",
                properties: validOpts.reduce(this.addSwaggerProp, {})
            }
        }
    }

    // wrapResponse uses the standard Swagger way of implementing inheritance
    // ("allOf"). to add pagination to an existing "multi" response.
    // Since the #ref for the queried resource should have already
    // been built by Reslang, this method can wrap that #ref with pagination
    // info, instead of re-defining the entire response body.
    // ref: https://swagger.io/docs/specification/data-models/inheritance-and-polymorphism/
    wrapResponse = (ref: string) => {
        return {
            allOf: [
                { $ref: ref },
                {
                    type: "object",
                    properties: {
                        ...this.getPaginationResponse()
                    }
                }
            ]
        }
    }

    strategy(): strategy {
        return strategy.Cursor
    }
}

// Utility function for testing whether a switch block is exhaustive.
// Typescript won't warn you out of the box if a switch() doesn't
// cover all of an Enum's types, so adding a call to this function
// at the end of a switch will allow the compiler to warn in such situations.
// ref: https://stackoverflow.com/a/39419171
function assertUnreachable(x: never): never {
    throw new Error("invariant: didn't expect to get here")
}
