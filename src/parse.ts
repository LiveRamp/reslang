import fs from "fs"
import peg from "pegjs"
import { IDefinition, PrimitiveType } from "./treetypes"

export function readFile(name: string) {
    return fs.readFileSync(name, { encoding: "utf8" })
}

const grammar = readFile("src/grammar.pegjs")

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

export function parseFile(file: string, namespace: string) {
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
    addNamespace(tree[2] as IDefinition[], namespace)
    return tree
}

function addNamespace(defs: IDefinition[], namespace: string) {
    // add to all defs
    for (const def of defs || []) {
        def.name =
            namespace + "." + (def.parent ? def.parent + "::" : "") + def.name
        if (def.parent) {
            def.parent = namespace + "." + def.parent
        }
        if (def.extends) {
            def.extends.name =
                def.extends.parent || namespace + "." + def.extends.name
        }

        // add to all references
        for (const attr of def.attributes || []) {
            const type = attr.type
            if (!isPrimitiveType(type.name)) {
                type.name = (type.parent || namespace) + "." + type.name
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
