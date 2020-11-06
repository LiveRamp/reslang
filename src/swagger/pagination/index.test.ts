import { Pagination, Offset, Cursor, NoOp, strategy, queryParam } from "./index"

describe("Pagination", () => {
    describe(".use", () => {
        it("Returns the correct class", () => {
            expect(Pagination.use(strategy.Cursor)).toEqual(Cursor)
            expect(Pagination.use(strategy.Offset)).toEqual(Offset)
            expect(Pagination.use(strategy.None)).toEqual(NoOp)
        })
    })
})

describe("NoOp", () => {
    let instance = new NoOp("foo", [])
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
    describe("#queryParams", () => {
        it("supports 'limit', 'before' and 'after' params", () => {
            let params = new Cursor("", [
                { name: "defaultLimit", value: "int" },
                { name: "after", value: "string" },
                { name: "before", value: "string" }
            ]).queryParams()
            expect(params.length).toBe(3)
            expect(params).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ in: "query", name: "limit" }),
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
                instance.optToQueryParam({ name: "after", value: "string" })
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
                instance.optToQueryParam({ name: "before", value: "string" })
            ).toEqual(
                expect.objectContaining({
                    in: "query",
                    name: "before",
                    description: expect.stringContaining("_pagination.before")
                })
            )
        })
        it("builds a 'limit' param", () => {
            expect(
                instance.optToQueryParam({ name: "defaultLimit", value: "int" })
            ).toEqual(
                expect.objectContaining({
                    in: "query",
                    name: "limit",
                    description: expect.stringContaining("Number of ")
                })
            )
        })
    })

    describe("#getPaginationResponse", () => {
        it("returns an RFC-3 compliant pagination response", () => {
            let opt = { name: "after", value: "string" }
            let instance = new Cursor("", [opt])
            expect(instance.getPaginationResponse()).toEqual(
                expect.objectContaining({
                    _pagination: {
                        type: "object",
                        properties: {
                            after: {
                                type: "string",
                                description: expect.stringContaining("cursor")
                            }
                        }
                    }
                })
            )
        })
    })

    describe("#addPaginationToSchema", () => {
        let instance = new Cursor("", [])
        it("infuses a response schema with pagination info", () => {
            let schema = { $ref: "#/components/foo" }
            expect(instance.addPaginationToSchema(schema)).toEqual(
                expect.objectContaining({
                    allOf: expect.arrayContaining([
                        expect.objectContaining({ $ref: "#/components/foo" }),
                        expect.objectContaining({
                            type: "object",
                            properties: expect.objectContaining({
                                _pagination: expect.objectContaining({})
                            })
                        })
                    ])
                })
            )
        })
    })
})
