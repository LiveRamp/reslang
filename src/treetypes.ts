import { StringifyOptions } from "querystring"

/**
 * types for the parse tree
 */

export interface IVersion {
    description: string
    version: string
}

export interface IImport {
    import: string
    file: string
}

export interface IDefinition {
    name: string
    type: string
    comment: string
    attributes?: IAttribute[]
    operations?: IOperation[]
    literals?: string[]
    parent?: string
    singleton?: boolean
}

export interface IAttribute {
    name: string
    type: string
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
