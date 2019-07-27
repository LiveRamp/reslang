import fs from "fs"
import peg from "pegjs"
import { IDefinition, PrimitiveType } from "./treetypes"
import * as path from "path"
import { makeShort, makeLong, fixName, sanitize } from "./names"

export function readFile(name: string) {
    return fs.readFileSync(name, { encoding: "utf8" })
}

const grammar = readFile(path.join(__dirname, "grammar.pegjs"))

export function loadParser() {
    try {
        return peg.generate(grammar)
    } catch (error) {
        throw new Error(
            `Problem reading grammar: ${error.message}, location: ${
                error.location.start.line
            }, ${error.location.start.column}`
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
        tree = clean(loadParser().parse(contents, {
            output: "parser"
        }) as object)
    } catch (error) {
        console.log(error)
        throw new Error(
            `Problem parsing file ${file}: ${error.message}, location: ${
                error.location.start.line
            }, ${error.location.start.column}`
        )
    }
    addNamespace(tree[2] as IDefinition[], parsingNamespace, mainNamespace)
    return tree
}

function addNamespace(
    defs: IDefinition[],
    namespace: string,
    mainNamespace: string
) {
    const fixLong = (name: string) =>
        sanitize(makeLong(namespace, mainNamespace, name))

    // normalize all the names: name is unique to doc, short is acceptable display form
    // refs are always in terms of name
    for (const def of defs || []) {
        def.short = def.name
        if (def.parent) {
            def.parentShort = makeShort(def.parent)
            def.parent = fixLong(def.parent)
        }
        def.name = fixLong(
            (def.parent ? fixLong(def.parent) + "::" : "") + def.name
        )
        if (def.extends) {
            def.extends.name = fixLong(
                (def.extends.parent ? def.extends.parent + "." : "") +
                    def.extends.name
            )
        }

        // add to all references
        for (const attr of def.attributes || []) {
            const type = attr.type
            if (!isPrimitiveType(type.name)) {
                type.short = makeShort(type.name)
                type.name = fixLong(
                    (type.parent ? type.parent + "." : "") + type.name
                )
            } else {
                type.short = type.name
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
