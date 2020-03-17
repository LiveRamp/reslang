import { parseFile, readFile } from "../parse"
import { strip } from "./utilities"
import ParseGen from "../genparse"

/** parse the reslang files and check that the correct
 * abstract syntax tree is being generated
 */
describe("reslang parsing tests", () => {
    test("strip", () => {
        expect(
            strip(` a   b
 c   d

 `)
        ).toBe(`a b
c d`)
    })

    test("dataset", () => {
        compare("dataset")
    })

    test("checkrules", () => {
        compare("checkrules")
    })

    test("privacy", () => {
        compare("privacy")
    })
    test("optionality", () => {
        compare("optionality")
    })

    test("authorization", () => {
        compare("authorization")
    })

    test("patchable", () => {
        compare("patchable")
    })

    test("complex-resource", () => {
        compare("complex-resource")
    })

    test("direct2dist", () => {
        compare("direct2dist")
    })

    test("distribution", () => {
        compare("distribution")
    })

    test("file", () => {
        compare("file")
    })

    test("request", () => {
        compare("request")
    })

    test("simple-resource", () => {
        compare("simple-resource")
    })

    test("singleton", () => {
        compare("singleton")
    })

    test("stringmaps", () => {
        compare("stringmaps")
    })

    test("upversion", () => {
        compare("upversion")
    })

    test("multiplicity", () => {
        compare("multiplicity")
    })
})

function compare(module: string) {
    const parser = new ParseGen([`models/${module}`], { ignoreRules: true })
    const got = parser.generate()
    const sgot = strip(got)
    const expected = strip(readFile(`models/${module}/parsed.expected`))
    if (sgot !== expected) {
        console.log(got)
    }
    expect(sgot).toBe(expected)
}
