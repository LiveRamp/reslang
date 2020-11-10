import {
    IResourceLike,
    IRequestHeader,
    IOperation,
    IHTTPHeader,
    AnyKind
} from "../../treetypes"
import { addHeaderParams } from "./index"

describe("addHeaderParams", () => {
    let path = {} as any
    let resource = {} as IResourceLike
    let reslangDefinitions = [] as AnyKind[]
    const reslangIdOperationsToSwaggerPathKeys: Record<string, string> = {
        DELETE: "delete",
        GET: "get",
        PATCH: "patch",
        PUT: "put",
        // }
        // TODO do we need to go back to two maps?
        // const reslangNonIdOperationsToSwaggerPathKeys: Record<string, string> = {
        MULTIDELETE: "delete",
        MULTIGET: "get",
        MULTIPATCH: "patch",
        MULTIPOST: "post",
        MULTIPUT: "put",
        POST: "post"
    }
    beforeEach(() => {
        path = {}
        resource = {
            name: "MyCoolResource",
            operations: [
                {
                    operation: "GET"
                }
            ] as IOperation[],
            requestHeaders: [
                {
                    opOrWildcard: "GET",
                    httpHeaderDefName: "MyCoolHeaderDef"
                }
            ] as IRequestHeader[]
        } as IResourceLike
        reslangDefinitions = [
            {
                kind: "http-header",
                name: "MyCoolHeaderDef",
                headerName: "MyCoolHeader",
                comment: "This is the header you use for cool things"
            } as IHTTPHeader
        ] as AnyKind[]
    })
    // reslangDefinitions: AnyKind[],
    // supportedReslangOperationsSwaggerPathKeys: Record<string, string>
    it("Returns the correct class", () => {})

    // it("errors if resource defines request headers for an operation it does not support", () => {
    //     expect(
    //         addHeaderParams(
    //             resource,
    //             path,
    //             reslangDefinitions,
    //             reslangIdOperationsToSwaggerPathKeys
    //         )
    //     ).toThrow()
    // })
    it("errors if request header references an undefined http-header", () => {})
    it("adds headers to all defined operations if '*' wildcard is provided as an operation", () => {})
    it("adds headers to the correct operations", () => {
        addHeaderParams(
            resource,
            path,
            reslangDefinitions,
            reslangIdOperationsToSwaggerPathKeys
        )
        expect(path.get.parameters).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    description: "This is the header you use for cool things",
                    in: "header",
                    name: "MyCoolHeader",
                    required: true,
                    schema: {
                        type: "string"
                    }
                })
            ])
        )
    })

    it("creates the correctly nested 'parameters' object if it did not exist", () => {})
    it("does not overwrite the 'parameters' object if it did exist", () => {})
})

// describe("Offset", () => {
//     let instance = new Offset("foo", [])
//     describe("#strategy", () => {
//         it("returns the correct strategy", () => {
//             expect(instance.strategy()).toEqual(strategy.Offset)
//         })
//     })
//     describe("#queryParams", () => {
//         let offset = "offset" as queryParam
//         let limit = "limit" as queryParam
//         it("returns offset and limit query params", () => {
//             let params = instance.queryParams()
//             expect(params.length).toBe(2)
//             expect(params).toEqual(
//                 expect.arrayContaining([
//                     expect.objectContaining({ name: offset, in: "query" }),
//                     expect.objectContaining({ name: limit, in: "query" })
//                 ])
//             )
//         })
//     })
//     describe("#xTotalCountHeader", () => {
//         it("returns the X-Total-Count swagger header", () => {
//             expect(instance.xTotalCountHeader()).toEqual(
//                 expect.objectContaining({
//                     "X-Total-Count": {
//                         description: expect.stringContaining("Total number of"),
//                         schema: {
//                             type: "integer",
//                             format: "int32"
//                         }
//                     }
//                 })
//             )
//         })
//     })
// })
