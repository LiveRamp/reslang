import fs from "fs"
import peg from "pegjs"
import {
    PrimitiveType,
    IDiagram,
    IReference,
    getAllAttributes,
    isResourceLike,
    AnyKind,
    isProduces,
    isConsumes,
    ITag
} from "./treetypes"
import * as path from "path"

export function readFile(...parts: string[]) {
    return fs.readFileSync(path.join(...parts), { encoding: "utf8" })
}

export function writeFile(data: string, ...parts: string[]) {
    return fs.writeFileSync(path.join(...parts), data, { encoding: "utf8" })
}

// grammar is split into several parts
const grammar =
    readFile(__dirname, "grammar", "main.pegjs") +
    readFile(__dirname, "grammar", "tags.pegjs") +
    readFile(__dirname, "grammar", "servers.pegjs") +
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

export interface IParseTree {
    namespace: any[]
    imports: any[]
    servers: any[]
    tags: any[]
    definitions: any[]
    diagrams: any[]
    docs: any[]
}

export function parseFile(
    file: string,
    parsingNamespace: string,
    mainNamespace: string,
    additionalNamespace: string
): IParseTree {
    const contents = readFile(file)
    function locToString(location: any) {
        return location
            ? location.start
                ? location.start.line + ", " + location.start.column
                : "unknown start"
            : "unknown"
    }

    let tree: any[]
    try {
        tree = clean(
            loadParser().parse(contents, {
                output: "parser"
            }) as object
        )
    } catch (error) {
        const loc = error.location
            ? `location: ${locToString(error.location)}`
            : "location unknown"
        throw new Error(
            `Problem parsing file ${file}: ${error.message}, ${loc}`
        )
    }

    const parsed: IParseTree = {
        namespace: filter(tree, "namespace"),
        imports: filter(tree, "import"),
        servers: filter(tree, "servers"),
        tags: filter(tree, "tag"),
        definitions: filter(tree, "definition"),
        diagrams: filter(tree, "diagram"),
        docs: filter(tree, "docs")
    }
    addNamespace(
        parsed.definitions as AnyKind[],
        parsingNamespace,
        mainNamespace,
        additionalNamespace
    )
    addDiagramNamespace(
        parsed.diagrams as IDiagram[],
        parsingNamespace,
        mainNamespace
    )

    // convert the tags
    for (const tag of parsed.tags as ITag[]) {
        for (const incl of tag.include) {
            convert(incl, parsingNamespace, mainNamespace)
        }
    }

    return parsed
}

// filter out the entries to ensure they are in the right category
function filter(entries: any, category: string) {
    if (!Array.isArray(entries)) {
        return entries.category === category ? [entries] : []
    }
    return (entries as any[]).filter((entry) => entry.category === category)
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
    // addresses issue https://github.com/LiveRamp/reslang/issues/86
    if (parent === "") {
        ref.parentName = ""
    } else {
        // add in the namespace if needed
        ref.parentName =
            (namespace === mainNamespace ? "" : namespace + ".") + parent
    }
}

function addNamespace(
    defs: AnyKind[],
    namespace: string,
    mainNamespace: string,
    additionalNamespace: string
) {
    // normalize all the names: name is unique to doc, short is acceptable display form
    // refs are always in terms of name
    for (const def of defs || []) {
        convert(def, namespace, mainNamespace)

        // if this is a produces or consumes, convert the reference
        if (isProduces(def) || isConsumes(def)) {
            convert(def.event, namespace, mainNamespace)
        }

        // add to all references
        for (const attr of getAllAttributes(def)) {
            convert(attr.type, namespace, mainNamespace)
            // complain if the attribute has default value but is not optional
            if (attr.default && !attr.modifiers.optional) {
                throw new Error(
                    `Attribute ${attr.name} of ${def.name} has a default, but is not optional`
                )
            }
        }

        // convert the error references
        if (isResourceLike(def)) {
            // add additional namespace if present
            if (!def.parentName) {
                def.namespace = additionalNamespace
            }
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
