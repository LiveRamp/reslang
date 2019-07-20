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
    parent?: string
}

export interface IDefinition {
    name: string
    parent?: string
    type: ResourceType
    comment: string
    attributes?: IAttribute[]
    operations?: IOperation[]
    literals?: string[]
    singleton?: boolean
    extends?: IReference
    secondary?: boolean
}

export type ResourceType =
    | "resource"
    | "subresource"
    | "enum"
    | "action"
    | "structure"

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
}
