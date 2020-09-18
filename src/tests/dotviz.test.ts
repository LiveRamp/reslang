import { parseFile, readFile, clean } from "../parse"
import { strip } from "./utilities"
import DotvizGen from "../gendotviz"
import { allModels } from "./allmodels"

/** dotviz generation tests
 */
describe("dotviz generation tests", () => {
    test.each(allModels)("dotviz(%s)", a => {
        compare(a)
    })
})

/** compare the output with saved swagger */
function compare(module: string) {
    const dotviz = new DotvizGen([`models/${module}`], { ignoreRules: true })
    const out = dotviz.generate("main")

    const got = strip(out)
    const expected = strip(
        readFile(`models/${module}/testdata/dotviz.expected`)
    )

    if (got !== expected) {
        console.log(got)
    }
    expect(got).toBe(expected)
}
