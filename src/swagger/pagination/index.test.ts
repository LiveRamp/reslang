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
    let instance = new NoOp("foo", 0, 0, [])
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
    let instance = new Offset("foo", 0, 0, [])
    describe("#strategy", () => {
        it("returns the correct strategy", () => {
            expect(instance.strategy()).toEqual(strategy.Offset)
        })
    })
    describe("#queryParams", () => {
        /* Tested thoroughly in the fixtures */
        let params = instance.queryParams()
        let offset = "offset" as queryParam
        let limit = "limit" as queryParam
        it("returns offset and limit query params", () => {
            expect(params.length).toBe(2)
            expect(params).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: offset, in: "query" }),
                    expect.objectContaining({ name: limit, in: "query" })
                ])
            )
        })
    })
    describe("#xTotalCountHeader", () => {
        it("returns the X-Total-Count swagger header", () => {
            expect(instance.xTotalCountHeader()).toHaveProperty("X-Total-Count")
        })
    })
})
