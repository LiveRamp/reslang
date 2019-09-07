/**
 * types for the parse tree
 */

export interface INamespace {
    comment: string
    title: string
    version: string
}

export interface IImport {
    import: string
}

export interface IReference {
    name: string
    short: string
    parent?: string
    toplevel?: string
}

export interface IDefinition {
    file: string
    name: string
    short: string
    parent?: string
    parentShort?: string
    type: DefinitionType
    comment: string
    attributes?: IAttribute[]
    operations?: IOperation[]
    literals?: string[]
    singleton?: boolean
    future?: boolean

    // used to see if we generate definitions or not
    secondary?: boolean
    generateOutput: boolean
    generateInput: boolean
    generateMulti: boolean
}

export type DefinitionType =
    | "request-resource"
    | "asset-resource"
    | "configuration-resource"
    | "subresource"
    | "enum"
    | "action"
    | "structure"
    | "union"

export let ResourceType = [
    "request-resource",
    "asset-resource",
    "configuration-resource",
    "subresource"
]

export let PrimitiveType = [
    "int",
    "string",
    "boolean",
    "double",
    "date",
    "time",
    "datetime",
    "url"
]

export interface IAttribute {
    name: string
    type: IReference
    output: boolean
    query: boolean
    queryOnly: boolean
    inline: boolean
    multiple: boolean
    stringMap: boolean
    linked: boolean
    comment: string
}

export interface IDiagram {
    diagram: string
    layout: string
    includeAll: string
    include: IReference[]
    import: IReference[]
    exclude: IReference[]
    fold: { attr: string; of: IReference }[]
    groups: IGroup[]
}

export interface IGroup {
    comment: string
    include: IReference[]
}

export interface IOperation {
    operation: string
    comment: string
    errors: IError[]
}

export interface IError {
    codes: { code: string; comment: string }[]
    struct: IReference
}
