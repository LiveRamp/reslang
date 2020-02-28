import { parseFile, readFile, clean } from "../parse"
import { strip } from "./utilities"
import SwagGen from "../genswagger"
import yaml from "js-yaml"

/** swagger generation tests
 */
describe("swagger generation tests", () => {
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

/** compare the output with saved swagger */
function compare(module: string) {
    const swag = new SwagGen([`models/${module}`])
    const swagger = swag.generate()

    const got = strip(yaml.dump(clean(swagger)))
    const expected = strip(readFile(`models/${module}/swagger.expected`))

    if (got !== expected) {
        console.log(got)
    }
    expect(got).toBe(expected)
}
