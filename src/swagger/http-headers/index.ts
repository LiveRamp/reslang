import {
    IResourceLike,
    IRequestHeader,
    IHTTPHeader,
    AnyKind
} from "../../treetypes"

export function addHeaderParams(
    el: IResourceLike,
    path: any,
    reslangDefinitions: AnyKind[],
    allowedReslangOperationsSwaggerPathKeys: Record<string, string>
) {
    if (!el.requestHeaders) {
        return
    }
    if (!el.operations) {
        throw new Error(
            `resource "${el.name}" defines request headers, but does not define any operations`
        )
    }

    for (const header of el.requestHeaders) {
        const headerDef = reslangDefinitions.find((d) => {
            return (
                d.kind === "http-header" && d.name === header.httpHeaderDefName
            )
        }) as IHTTPHeader

        if (!headerDef) {
            throw new Error(
                `no http-header definition found with name "${header.httpHeaderDefName}"`
            )
        }

        // if wildcard, add header to all ops in el.operations
        if (header.opOrWildcard === "*") {
            el.operations.forEach((op) => {
                addHeaderParamToSwaggerPath(
                    path,
                    headerDef,
                    op.operation,
                    allowedReslangOperationsSwaggerPathKeys
                )
            })
        } else if (
            !el.operations.find((op) => op.operation === header.opOrWildcard)
        ) {
            throw new Error(
                `request headers defined for "${header.opOrWildcard}" requests, but ${el.name} does not define ${header.opOrWildcard} as a allowed operation`
            )
        } else {
            addHeaderParamToSwaggerPath(
                path,
                headerDef,
                header.opOrWildcard,
                allowedReslangOperationsSwaggerPathKeys
            )
        }
    }
}

function addHeaderParamToSwaggerPath(
    path: any,
    headerDef: IHTTPHeader,
    operation: string,
    allowedReslangOperationsSwaggerPathKeys: Record<string, string>
) {
    const pathKey = allowedReslangOperationsSwaggerPathKeys[operation]
    if (!pathKey) {
        // non-id operation but addHeaderParams was called for an ID path, or vice versa
        return
    }

    createParametersArrayIfNotExists(path, pathKey)

    const headerParameterSwagger = {
        description: headerDef.comment,
        in: "header",
        name: headerDef.headerName,
        required: true,
        schema: {
            type: "string"
        }
    }

    // don't add duplicate header params
    if (
        path[pathKey].parameters.some(
            (p: any) =>
                p.in === "header" && p.name === headerParameterSwagger.name
        )
    ) {
        return
    }

    path[pathKey].parameters.push(headerParameterSwagger)
}

// createParametersArrayIfNotExists sets path[pathKey].parameters to an empty
// array iff the parameters key does not exist
function createParametersArrayIfNotExists(path: any, pathKey: string) {
    if (!(pathKey in path)) {
        path[pathKey] = { parameters: [] }
    } else if (!("parameters" in path[pathKey])) {
        path[pathKey].parameters = []
    }
}
