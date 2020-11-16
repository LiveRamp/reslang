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
        PUT: "put"
    }
    beforeEach(() => {
        swaggerPath = {}
        resource = { ...sampleResource }
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

    it("ignores request headers for valid operations that are not in the 'allowed' record", () => {
        resource.requestHeaders = [
            {
                opOrWildcard: "MULTIPUT",
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
        expect(swaggerPath.put).toEqual(undefined)
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
        expect(swaggerPath.get.parameters).toEqual(
            expect.arrayContaining([
                expect.objectContaining(myCoolHeaderExpectedSwagger)
            ])
        )
        expect(swaggerPath.patch.parameters).toEqual(
            expect.arrayContaining([
                expect.objectContaining(myCoolHeaderExpectedSwagger)
            ])
        )
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

        expect(swaggerPath.get.parameters).toEqual(
            expect.arrayContaining([
                expect.objectContaining(myCoolHeaderExpectedSwagger)
            ])
        )
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

    it("does not add duplicate header parameters", () => {
        swaggerPath.get = {}
        swaggerPath.get.parameters = [myCoolHeaderExpectedSwagger]

        expect(() => {
            addHeaderParams(
                resource,
                swaggerPath,
                reslangDefinitions,
                reslangIdOperationsToSwaggerPathKeys
            )
        }).not.toThrow()

        const coolHeaderCount = swaggerPath.get.parameters.filter(
            (e: any) => e.name === "MyCoolHeader"
        ).length
        expect(coolHeaderCount).toEqual(1)
    })
})

const sampleResource = {
    name: "MyCoolResource",
    operations: [
        {
            operation: "GET"
        },
        {
            operation: "PATCH"
        },
        {
            operation: "MULTIPUT"
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
