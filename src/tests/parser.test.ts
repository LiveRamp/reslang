import { parseFile, readFile } from "../parse"
import { strip } from "./utilities"
import ParseGen from "../genparse"
import { allModels } from "./allmodels"

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

    test.each(allModels)("parser(%s)", a => {
        compare(a)
    })
})

function compare(module: string) {
    const parser = new ParseGen([`models/${module}`], { ignoreRules: true })
    const got = parser.generate()
    const sgot = strip(got)
    const expected = strip(
        readFile(`models/${module}/testdata/parsed.expected`)
    )
    if (sgot !== expected) {
        console.log(got)
    }
    expect(sgot).toBe(expected)
}
