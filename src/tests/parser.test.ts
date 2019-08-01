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

    test("simple-resource", () => {
        compare("simple-resource")
    })

    test("complex-resource", () => {
        compare("complex-resource")
    })

    test("singleton", () => {
        compare("singleton")
    })

    test("upversion", () => {
        compare("upversion")
    })

    test("request", () => {
        compare("request")
    })
})

function compare(module: string) {
    const parser = new ParseGen([`models/new/${module}`])
    const got = parser.generate()
    const sgot = strip(got)
    const expected = strip(
        readFile(`src/tests/parsed_outputs/${module}.expected`)
    )
    if (sgot !== expected) {
        console.log(got)
    }
    expect(sgot).toBe(expected)
}
