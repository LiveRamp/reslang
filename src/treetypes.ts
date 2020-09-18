/**
 * types for the parse tree
 */

export interface INamespace {
    comment: string
    space?: string
    title: string
    version: string
}

export interface IServers {
    rest: IServer[]
    events: IServer[]
}

export interface IServer {
    comment: string
    url: string
    environment: string
    protocol?: string
}

export interface ITag {
    comment: string
    name: string
    include: IReference[]
}

export interface IImport {
    import: string
}

export let PrimitiveType = [
    "int",
    "long",
    "string",
    "boolean",
    "double",
    "date",
    "time",
    "datetime",
    "duration",
    "url",
    "uri",
    "uuid"
]

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
    | "event"
    | "server-block"
    | "produces"
    | "consumes"

export let ResourceLike = [
    "request-resource",
    "asset-resource",
    "configuration-resource",
    "resource",
    "subresource"
]

export type Kind =
    | "resource-like"
    | "server-block"
    | "enum"
    | "structure"
    | "union"
    | "event"
    | "produces"
    | "consumes"

export type AnyKind =
    | IResourceLike
    | IEnum
    | IStructure
    | IUnion
    | IEvent
    | IProduces
    | IConsumes

// type guards
export function isResourceLike(def: IDefinition): def is IResourceLike {
    return def.kind === "resource-like"
}
export function isEnum(def: IDefinition): def is IEnum {
    return def.kind === "enum"
}
export function isStructure(def: IDefinition): def is IStructure {
    return def.kind === "structure"
}
export function isUnion(def: IDefinition): def is IUnion {
    return def.kind === "union"
}
export function isEvent(def: IDefinition): def is IEvent {
    return def.kind === "event"
}
export function isProduces(def: IDefinition): def is IProduces {
    return def.kind === "produces"
}
export function isConsumes(def: IDefinition): def is IConsumes {
    return def.kind === "consumes"
}
export function isAction(def: IDefinition): def is IResourceLike {
    return def.type === "action"
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
    kind: Kind
    type: DefinitionType
    file: string
    comment: string

    // do we need to generate this?
    secondary?: boolean
    generateInput: boolean
}

export interface IResourceLike extends IDefinition {
    kind: "resource-like"
    namespace?: string
    attributes?: IAttribute[]
    operations?: IOperation[]
    events?: IEventOperation[]
    singleton?: boolean
    future?: boolean
    async?: boolean
    bulk?: boolean // only for actions, indicates it's on the entire resource, not a single resource

    // used to see if we generate definitions or not
    generateOutput: boolean
    generatePuttable: boolean
    generatePatchable: boolean
    generateMultiGettable: boolean
    generateMultiPuttable: boolean
    generateMultiPatchable: boolean
}
export interface IEnum extends IDefinition {
    kind: "enum"
    literals?: string[]
}

export interface IStructure extends IDefinition {
    kind: "structure"
    attributes?: IAttribute[]
}

export interface IUnion extends IDefinition {
    kind: "union"
    attributes?: IAttribute[]
}

export interface IEvent extends IDefinition {
    kind: "event"
    header?: IAttribute[]
    payload?: IAttribute[]
}

export interface IProduces extends IDefinition {
    kind: "produces"
    event: IReference
}

export interface IConsumes extends IDefinition {
    kind: "consumes"
    event: IReference
}

export interface IAttribute {
    name: string
    type: IReference
    inline: boolean
    array: IArray
    stringMap: boolean
    linked: boolean
    full: boolean
    comment: string
    modifiers: IModifiers
    constraints: IConstraints
    example?: string
    default?: IDefaultValue
}

export interface IDefaultValue {
    type: string
    value: string
}

export interface IArray {
    type: number
    min: number
    max: number
}

export interface IModifiers {
    flag: boolean
    mutable: boolean
    output: boolean
    optional: boolean
    optionalPost: boolean
    optionalPut: boolean
    optionalGet: boolean
    query: boolean
    queryonly: boolean
    representation: boolean
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

export interface IEventOperation {
    operation: string
    comment: string
}

export interface IOperation {
    operation: string
    options: IOption[]
    comment: string
    errors: IError[]
}

export interface IOption {
    name: string
    value: string
}

export interface IError {
    codes: { code: string; comment: string }[]
    struct: IReference
}

export function getAllAttributes(el: AnyKind) {
    switch (el.kind) {
        case "resource-like":
            return el.attributes || []
        case "structure":
            return el.attributes || []
        case "union":
            return el.attributes || []
        case "event":
            return (el.payload || []).concat(el.header || [])
        default:
            return []
    }
}

export function getKeyAttributes(el: AnyKind) {
    switch (el.kind) {
        case "resource-like":
            return el.attributes || []
        case "structure":
            return el.attributes || []
        case "union":
            return el.attributes || []
        case "event":
            return el.payload || []
        default:
            return []
    }
}
