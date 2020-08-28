import { readFile } from "../parse"
import { strip } from "./utilities"
import { allModels } from "./allmodels"
import JsonSchemaGen from "../jsonschemagen"

/** dotviz generation tests
 */
describe("JSON schema generation tests", () => {
    test.each(allModels)("JSON schema(%s)", (a) => {
        compare(a)
    })
})

/** compare the output with saved JSON schema spec */
function compare(module: string) {
    const schemaGen = new JsonSchemaGen(
        [`models/${module}`],
        { ignoreRules: true },
        "PROD",
        "",
        true,
        false,
        false
    )
    schemaGen.root = "noroot"
    schemaGen.followResources = true

    let got = ""
    try {
        got = strip(JsonSchemaGen.generateSchemaAndStringify(schemaGen))
    } catch (err) {
        got = "" + err
    }
    const expected = strip(
        readFile(`models/${module}/testdata/jsonschema.expected`)
    )

    if (got !== expected) {
        console.log(got)
        console.log("xxxxx")
        console.log(expected)
        console.log("yyyyy")
    }
    expect(got).toBe(expected)
}
