import { parseFile, readFile, clean } from "../parse"
import { strip } from "./utilities"
import DotvizGen from "../gendotviz"

/** dotviz generation tests
 */
describe("dotviz generation tests", () => {
    test("simple-resource", () => {
        compare("simple-resource")
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

    test("singleton", () => {
        compare("singleton")
    })

    test("upversion", () => {
        compare("upversion")
    })

    test("request", () => {
        compare("request")
    })

    test("file", () => {
        compare("file")
    })

    test("multiplicity", () => {
        compare("multiplicity")
    })
})

/** compare the output with saved swagger */
function compare(module: string) {
    const dotviz = new DotvizGen([`models/${module}`])
    const out = dotviz.generate("main")

    const got = strip(out)
    const expected = strip(readFile(`models/${module}/dotviz.expected`))

    if (got !== expected) {
        console.log(got)
    }
    expect(got).toBe(expected)
}
