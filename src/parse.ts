import fs from "fs"
import peg from "pegjs"
import {
    IDefinition,
    PrimitiveType,
    IDiagram,
    IReference,
    getAllAttributes,
    isResourceLike,
    AnyKind
} from "./treetypes"
import * as path from "path"

export function readFile(...parts: string[]) {
    return fs.readFileSync(path.join(...parts), { encoding: "utf8" })
}

// grammar is split into 3 separate parts
const grammar =
    readFile(__dirname, "grammar", "main.pegjs") +
    readFile(__dirname, "grammar", "rest.pegjs") +
    readFile(__dirname, "grammar", "events.pegjs") +
    readFile(__dirname, "grammar", "diagrams.pegjs") +
    readFile(__dirname, "grammar", "attributes.pegjs") +
    readFile(__dirname, "grammar", "base.pegjs")

export function loadParser() {
    try {
        return peg.generate(grammar)
    } catch (error) {
        throw new Error(
            `Problem reading grammar: ${error.message}, location: ${error.location.start.line},
            ${error.location.start.column}`
        )
    }
}

export function parseFile(
    file: string,
    parsingNamespace: string,
    mainNamespace: string
) {
    const contents = readFile(file)

    let tree: any[]
    try {
        tree = clean(
            loadParser().parse(contents, {
                output: "parser"
            }) as object
        )
    } catch (error) {
        console.log(error)
        throw new Error(
            `Problem parsing file ${file}: ${error.message}, location: ${error.location.start.line}, ${error.location.start.column}`
        )
    }
    addNamespace(tree[2] as AnyKind[], parsingNamespace, mainNamespace)
    addDiagramNamespace(tree[3] as IDiagram[], parsingNamespace, mainNamespace)
    return tree
}

// create name, parentName and parentShort from the module, parents and short fields
// name and parentName are fully qualified for the entire set of definitions
function convert(ref: IReference, namespace: string, mainNamespace: string) {
    if (isPrimitiveType(ref.short)) {
        ref.name = ref.short
        ref.parentShort = ""
        ref.parentName = ""
        return
    }
    const module = ref.module
        ? ref.module + "."
        : namespace === mainNamespace
        ? ""
        : namespace + "."
    const parent = ref.parents.length !== 0 ? ref.parents.join("::") : ""
    ref.name = module + (parent ? parent + "::" : "") + ref.short
    ref.parentShort = ref.parents.length !== 0 ? ref.parents[0] : ""
    ref.parentName = parent
}

function addNamespace(
    defs: AnyKind[],
    namespace: string,
    mainNamespace: string
) {
    // normalize all the names: name is unique to doc, short is acceptable display form
    // refs are always in terms of name
    for (const def of defs || []) {
        convert(def, namespace, mainNamespace)

        // add to all references
        for (const attr of getAllAttributes(def)) {
            convert(attr.type, namespace, mainNamespace)
        }

        // convert the error references
        if (isResourceLike(def)) {
            for (const op of def.operations || []) {
                for (const err of op.errors) {
                    convert(err.struct, namespace, mainNamespace)
                }
            }
        }
    }
}

function addDiagramNamespace(
    diagrams: IDiagram[],
    namespace: string,
    mainNamespace: string
) {
    // normalize all the references
    for (const diag of diagrams) {
        for (const incl of diag.include || []) {
            convert(incl, namespace, mainNamespace)
        }
        for (const incl of diag.import || []) {
            convert(incl, namespace, mainNamespace)
        }
        for (const incl of diag.exclude || []) {
            convert(incl, namespace, mainNamespace)
        }
        for (const fold of diag.fold || []) {
            convert(fold.of, namespace, mainNamespace)
        }
        for (const group of diag.groups || []) {
            for (const incl of group.include) {
                convert(incl, namespace, mainNamespace)
            }
        }
    }
}

export function isPrimitiveType(name: string) {
    return PrimitiveType.includes(name)
}

export function clean(obj: any) {
    for (const propName in obj) {
        if (obj.hasOwnProperty(propName)) {
            const val = obj[propName]
            if (val === null || val === undefined) {
                delete obj[propName]
            }
            if (typeof val === "object") {
                clean(val)
            }
        }
    }
    return obj
}
