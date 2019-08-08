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
    extends?: IReference

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
    "datetime"
]

export interface IAttribute {
    name: string
    type: IReference
    output: boolean
    multiple: boolean
    linked: boolean
    comment: string
}

export interface IOperation {
    operation: string
    comment: string
    ids?: string[]
    errors: IError[]
}

export interface IError {
    codes: Array<{ code: string; comment: string }>
    struct: IReference
}
