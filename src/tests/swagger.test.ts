import { readFile, clean } from "../parse"
import { strip } from "./utilities"
import SwagGen from "../genswagger"
import yaml from "js-yaml"
import { allModels } from "./allmodels"

/** swagger generation tests
 */
describe("swagger generation tests", () => {
    test.each(allModels)("swagger(%s)", (a) => {
        compare(a)
    })
})

/** compare the output with saved swagger */
function compare(module: string) {
    const swag = new SwagGen(
        [`models/${module}`],
        { ignoreRules: true, pagination: "offset", limit: 10, maxLimit: 100 },
        "PROD",
        "",
        true
    )
    const swagger = swag.generate()

    const got = strip(yaml.dump(clean(swagger), { noRefs: true }))
    const expected = strip(
        readFile(`models/${module}/testdata/swagger.expected`)
    )

    expect(got).toBe(expected)
}
