import {clean, readFile} from "../parse"
import SwagGen from "../genswagger"
import yaml from "js-yaml"
import {allModels} from "./allmodels"

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
        { ignoreRules: true, pagination: "cursor", limit: 10, maxLimit: 100 },
        "PROD",
        "",
        true
    )
    const got = swag.generate();
    const expected = yaml.load(readFile(`models/${module}/testdata/swagger.expected`));

    expect(yaml.dump(clean(got), {noRefs: true}))
        .toStrictEqual(yaml.dump(clean(expected), {noRefs: true}))
}
