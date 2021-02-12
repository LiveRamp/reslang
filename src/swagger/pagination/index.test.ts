import {
    Pagination,
    Offset,
    Cursor,
    None,
    strategy,
    queryParam,
    responseField
} from "./index"

describe("Pagination", () => {
    describe(".use", () => {
        it("Returns the correct class", () => {
            expect(Pagination.use(strategy.Cursor)).toEqual(Cursor)
            expect(Pagination.use(strategy.Offset)).toEqual(Offset)
            expect(Pagination.use(strategy.None)).toEqual(None)
        })
    })
})

describe("None", () => {
    let instance = new None("foo", [])
    describe("#strategy", () => {
        it("returns the correct strategy", () => {
            expect(instance.strategy()).toEqual(strategy.None)
        })
    })
    describe("#queryParams", () => {
        it("returns no query params", () => {
            expect(instance.queryParams().length).toBe(0)
        })
    })
})

describe("Offset", () => {
    let instance = new Offset("foo", [])
    describe("#strategy", () => {
        it("returns the correct strategy", () => {
            expect(instance.strategy()).toEqual(strategy.Offset)
        })
    })
    describe("#queryParams", () => {
        it("returns offset and limit query params", () => {
            let params = instance.queryParams()
            expect(params.length).toBe(2)
            expect(params).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: "offset", in: "query" }),
                    expect.objectContaining({ name: "limit", in: "query" })
                ])
            )
        })
    })
    describe("#xTotalCountHeader", () => {
        it("returns the X-Total-Count swagger header", () => {
            expect(instance.xTotalCountHeader()).toEqual(
                expect.objectContaining({
                    "X-Total-Count": {
                        description: expect.stringContaining("Total number of"),
                        schema: {
                            type: "integer",
                            format: "int32"
                        }
                    }
                })
            )
        })
    })
})

describe("Cursor", () => {
    describe("constructor", () => {
        it("de-dups options by name", () => {
            let instance = new Cursor("", [
                { name: responseField.Total, value: true },
                { name: responseField.Total, value: true },
                { name: responseField.Total, value: true }
            ])
            expect(instance.opts.length).toBe(1)
            expect(instance.opts[0].name).toBe(responseField.Total)
        })
    })

    describe("#queryParams", () => {
        it("supports 'before', 'after', and 'limit' (by default) params", () => {
            let params = new Cursor("", [
                { name: queryParam.After, value: true },
                { name: queryParam.Before, value: true }
            ]).queryParams()
            expect(params.length).toBe(3)
            expect(params).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ in: "query", name: "limit" }), // limit is always included, by default
                    expect.objectContaining({ in: "query", name: "after" }),
                    expect.objectContaining({ in: "query", name: "before" })
                ])
            )
        })
    })

    describe("#optToQueryParam", () => {
        let instance = new Cursor("", [])
        it("builds an 'after' param", () => {
            expect(
                instance.optToQueryParam({
                    name: queryParam.After,
                    value: true
                })
            ).toEqual(
                expect.objectContaining({
                    in: "query",
                    name: "after",
                    description: expect.stringContaining("_pagination.after")
                })
            )
        })
        it("builds a 'before' param", () => {
            expect(
                instance.optToQueryParam({
                    name: queryParam.Before,
                    value: true
                })
            ).toEqual(
                expect.objectContaining({
                    in: "query",
                    name: "before",
                    description: expect.stringContaining("_pagination.before")
                })
            )
        })
    })

    describe("#getPaginationResponseBody", () => {
        it("returns an RFC-3 compliant pagination response body", () => {
            let opt = { name: queryParam.After, value: true }
            let instance = new Cursor("", [opt])
            expect(instance.getPaginationResponseBody()).toEqual(
                expect.objectContaining({
                    type: "object",
                    properties: {
                        after: {
                            type: "string",
                            nullable: true,
                            description: expect.stringContaining("cursor")
                        }
                    }
                })
            )
        })
    })
})
