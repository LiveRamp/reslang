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
    short: string
    parents: string[]
    module: string // not set for definitions

    // generated from the above info
    name: string
    parentName: string
    parentShort: string
}

export interface IDefinition extends IReference {
    file: string
    type: DefinitionType
    comment: string
    attributes?: IAttribute[]
    operations?: IOperation[]
    literals?: string[]
    singleton?: boolean
    future?: boolean
    async?: boolean
    resourceLevel?: boolean // only for actions, indicates it's on the entire resource, not a single resource

    // used to see if we generate definitions or not
    secondary?: boolean
    generateOutput: boolean
    generateInput: boolean
    generatePuttable: boolean
    generatePatchable: boolean
    generateMulti: boolean
}

export type DefinitionType =
    | "request-resource"
    | "asset-resource"
    | "resource"
    | "configuration-resource"
    | "subresource"
    | "enum"
    | "action"
    | "structure"
    | "union"

export let ResourceType = [
    "request-resource",
    "asset-resource",
    "resource",
    "configuration-resource",
    "subresource"
]

export let PrimitiveType = [
    "int",
    "long",
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
    inline: boolean
    array: IArray
    stringMap: boolean
    linked: boolean
    comment: string
    modifiers: IModifiers
    constraints: IConstraints
}

export interface IArray {
    type: number
    min: number
    max: number
}

export interface IModifiers {
    mutable: boolean
    output: boolean
    optional: boolean
    optionalPost: boolean
    optionalPut: boolean
    optionalGet: boolean
    query: boolean
    queryonly: boolean
}

export interface IConstraints {
    minLength: number
    maxLength: number
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

export interface IDocumentation {
    name: string
    entries: IDocEntry[]
}

export interface IDocEntry {
    name: string
    documentation: string
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
