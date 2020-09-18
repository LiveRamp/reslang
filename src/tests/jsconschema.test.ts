import { readFile } from "../parse"
import { strip } from "./utilities"
import { allModels } from "./allmodels"
import JsonSchemaGen from "../genjsonschema"

/** dotviz generation tests
 */
describe("JSON schema generation tests", () => {
    test.each(allModels)("JSON schema(%s)", (a) => {
        compare(a)
    })

    // test with an actual root
    test("Structure root", () => {
        compare(
            "direct2dist",
            "BatchOutputMetadata",
            "jsonschema-structure.expected",
            false
        )
    })
    test("Structure root", () => {
        compare(
            "direct2dist",
            "noroot",
            "jsonschema-structure-follow.expected",
            false
        )
    })
})

/** compare the output with saved JSON schema spec */
function compare(
    module: string,
    root: string = "noroot",
    file: string | null = null,
    followResources = true
) {
    const schemaGen = new JsonSchemaGen(
        [`models/${module}`],
        { ignoreRules: true, pagination: "offset", limit: 10, maxLimit: 100 },
        "PROD",
        "",
        true,
        false,
        false
    )
    schemaGen.root = root
    schemaGen.followResources = followResources

    let got = ""
    try {
        got = strip(JsonSchemaGen.generateSchemaAndStringify(schemaGen))
    } catch (err) {
        got = "" + err
    }
    const expected = strip(
        readFile(`models/${module}/testdata/${file || "jsonschema.expected"}`)
    )

    if (got !== expected) {
        console.log(got)
    }
    expect(got).toBe(expected)
}
