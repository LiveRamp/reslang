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
    supportedReslangOperationsSwaggerPathKeys: Record<string, string>
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
        const headerObjDef = reslangDefinitions.find((d) => {
            return (
                d.kind === "http-header" && d.name === header.httpHeaderDefName
            )
        }) as IHTTPHeader

        if (!headerObjDef) {
            throw new Error(
                `no http-header definition found with name "${header.httpHeaderDefName}"`
            )
        }

        // if wildcard, add header to all ops in el.operations
        if (header.opOrWildcard === "*") {
            el.operations.forEach((op) => {
                addHeaderParamToSwaggerPath(
                    path,
                    headerObjDef,
                    op.operation,
                    supportedReslangOperationsSwaggerPathKeys
                )
            })
        } else if (
            !el.operations.find((op) => op.operation === header.opOrWildcard)
        ) {
            throw new Error(
                `request headers defined for "${header.opOrWildcard}" requests, but ${el.name} does not define ${header.opOrWildcard} as a supported operation`
            )
        } else {
            addHeaderParamToSwaggerPath(
                path,
                headerObjDef,
                header.opOrWildcard,
                supportedReslangOperationsSwaggerPathKeys
            )
        }
    }
}

function addHeaderParamToSwaggerPath(
    path: any,
    // TODO rename headerObjDef
    headerObjDef: IHTTPHeader,
    operation: string,
    supportedReslangOperationsSwaggerPathKeys: Record<string, string>
) {
    const pathKey = supportedReslangOperationsSwaggerPathKeys[operation]
    if (!pathKey) {
        return
    }
    // create path[pathKey].parameters if it does not exist
    if (!(pathKey in path)) {
        path[pathKey] = { parameters: [] }
    } else if (!("parameters" in path[pathKey])) {
        path[pathKey].parameters = []
    }

    const headerParameterSwagger = {
        description: headerObjDef.comment,
        in: "header",
        name: headerObjDef.headerName,
        required: true,
        schema: {
            type: "string"
        }
    }

    path[pathKey].parameters.push(headerParameterSwagger)
}
