import fs from "fs"
import peg, { Parser } from "pegjs"

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

export function parseFile(file: string) {
    const contents = readFile(file)

    try {
        return clean(loadParser().parse(contents, {
            output: "parser"
        }) as object)
    } catch (error) {
        console.log(error)
        throw new Error(
            `Problem parsing: ${error.message}, location: ${
                error.location.start.line
            }, ${error.location.start.column}`
        )
    }
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
