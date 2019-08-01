import { parseFile, readFile, clean } from "../parse"
import { strip } from "./utilities"
import SwagGen from "../genswagger"
import yaml from "js-yaml"

/** swagger generation tests
 */
describe("swagger generation tests", () => {
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

    test("file", () => {
        compare("file")
    })
})

/** compare the output with saved swagger */
function compare(module: string) {
    const swag = new SwagGen([`models/new/${module}`])
    const swagger = swag.generate()

    let got = strip(yaml.dump(clean(swagger)))
    const expected = strip(
        readFile(`src/tests/swagger_outputs/${module}.expected`)
    )

    if (got !== expected) {
        console.log(got)
    }
    expect(got).toBe(expected)
}
