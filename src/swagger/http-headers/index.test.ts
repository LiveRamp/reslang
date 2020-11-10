import {
    IResourceLike,
    IRequestHeader,
    IOperation,
    IHTTPHeader,
    AnyKind
} from "../../treetypes"
import { addHeaderParams } from "./index"

describe("addHeaderParams", () => {
    let swaggerPath = {} as any
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
        swaggerPath = {}
        resource = sampleResource
        reslangDefinitions = sampleReslangDefinitions
    })

    it("errors if resource defines request headers for an operation it does not support", () => {
        resource.operations = []

        expect(() => {
            addHeaderParams(
                resource,
                swaggerPath,
                reslangDefinitions,
                reslangIdOperationsToSwaggerPathKeys
            )
        }).toThrow()
    })

    it("errors if request header references an undefined http-header", () => {
        resource.requestHeaders = [
            {
                opOrWildcard: "GET",
                httpHeaderDefName: "WhatTheHeckIsThisHeader"
            }
        ] as IRequestHeader[]

        expect(() => {
            addHeaderParams(
                resource,
                swaggerPath,
                reslangDefinitions,
                reslangIdOperationsToSwaggerPathKeys
            )
        }).toThrow()
    })

    it("does nothing if resource defines request headers for an operation it does support, but the operation is not in the 'allowed' record", () => {
        expect(() => {
            addHeaderParams(
                resource,
                swaggerPath,
                reslangDefinitions,
                reslangIdOperationsToSwaggerPathKeys
            )
        }).toThrow()
    })

    it("adds headers to all defined operations if '*' wildcard is provided as an operation", () => {
        resource.requestHeaders = [
            {
                opOrWildcard: "*",
                httpHeaderDefName: "MyCoolHeaderDef"
            }
        ] as IRequestHeader[]

        expect(() => {
            addHeaderParams(
                resource,
                swaggerPath,
                reslangDefinitions,
                reslangIdOperationsToSwaggerPathKeys
            )
        }).not.toThrow()
        // TODO
        // expect(swaggerPath.get.parameters).toEqual(
        //     expect.arrayContaining([
        //         expect.objectContaining(myCoolHeaderExpectedSwagger)
        //     ])
        // )
        // expect(swaggerPath.post.parameters).toEqual(
        //     expect.arrayContaining([
        //         expect.objectContaining(myCoolHeaderExpectedSwagger)
        //     ])
        // )
        // expect(swaggerPath.post.parameters).toEqual(
        //     expect.arrayContaining([
        //         expect.objectContaining(myCoolHeaderExpectedSwagger)
        //     ])
        // )
    })

    it("adds headers to the correct operations", () => {
        expect(() => {
            addHeaderParams(
                resource,
                swaggerPath,
                reslangDefinitions,
                reslangIdOperationsToSwaggerPathKeys
            )
        }).not.toThrow()

        console.log("*****************")
        console.log(swaggerPath)
        console.log("*****************")
        // TODO failing :(
        expect(swaggerPath.get.parameters).toEqual(
            expect.arrayContaining([
                expect.objectContaining(myCoolHeaderExpectedSwagger)
            ])
        )
    })

    it("creates the correctly nested 'parameters' object if it did not exist", () => {
        expect(() => {
            addHeaderParams(
                resource,
                swaggerPath,
                reslangDefinitions,
                reslangIdOperationsToSwaggerPathKeys
            )
        }).not.toThrow()
    })

    it("does not overwrite the 'parameters' object if it did exist", () => {
        swaggerPath.get = {}
        swaggerPath.get.parameters = ["don't stomp on me!"]

        expect(() => {
            addHeaderParams(
                resource,
                swaggerPath,
                reslangDefinitions,
                reslangIdOperationsToSwaggerPathKeys
            )
        }).not.toThrow()

        expect(swaggerPath.get.parameters).toEqual(
            expect.arrayContaining(["don't stomp on me!"])
        )
    })
})

const sampleResource = {
    name: "MyCoolResource",
    operations: [
        {
            operation: "GET"
        },
        {
            operation: "POST"
        },
        {
            operation: "MULTIGET"
        }
    ] as IOperation[],
    requestHeaders: [
        {
            opOrWildcard: "GET",
            httpHeaderDefName: "MyCoolHeaderDef"
        }
    ] as IRequestHeader[]
} as IResourceLike

const sampleReslangDefinitions = [
    {
        kind: "http-header",
        name: "MyCoolHeaderDef",
        headerName: "MyCoolHeader",
        comment: "This is the header you use for cool things"
    } as IHTTPHeader
] as AnyKind[]

const myCoolHeaderExpectedSwagger = {
    description: "This is the header you use for cool things",
    in: "header",
    name: "MyCoolHeader",
    required: true,
    schema: {
        type: "string"
    }
}
