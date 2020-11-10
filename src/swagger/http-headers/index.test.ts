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

    it("errors if resource defines request headers for an operation it does not support", () => {
        resource.operations = []

        expect(() => {
            addHeaderParams(
                resource,
                path,
                reslangDefinitions,
                reslangIdOperationsToSwaggerPathKeys
            )
        }).toThrow()
    })

    it("errors if request header references an undefined http-header", () => {
        expect(() => {
            addHeaderParams(
                resource,
                path,
                reslangDefinitions,
                reslangIdOperationsToSwaggerPathKeys
            )
        }).toThrow()
    })

    it("adds headers to all defined operations if '*' wildcard is provided as an operation", () => {
        expect(() => {
            addHeaderParams(
                resource,
                path,
                reslangDefinitions,
                reslangIdOperationsToSwaggerPathKeys
            )
        }).toThrow()
    })

    it("adds headers to the correct operations", () => {
        expect(() => {
            addHeaderParams(
                resource,
                path,
                reslangDefinitions,
                reslangIdOperationsToSwaggerPathKeys
            )
        }).not.toThrow()
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

    it("creates the correctly nested 'parameters' object if it did not exist", () => {
        expect(() => {
            addHeaderParams(
                resource,
                path,
                reslangDefinitions,
                reslangIdOperationsToSwaggerPathKeys
            )
        }).not.toThrow()
    })

    it("does not overwrite the 'parameters' object if it did exist", () => {
        expect(() => {
            addHeaderParams(
                resource,
                path,
                reslangDefinitions,
                reslangIdOperationsToSwaggerPathKeys
            )
        }).not.toThrow()
    })
})
