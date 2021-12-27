import {readFile} from "../parse"
import {strip} from "./utilities"
import {allModels} from "./allmodels"
import JsonSchemaGen from "../genjsonschema"

/**
 * json schema tests
 * the expected output is generated with --jsonschema=noroot --followresources
 * or specified in the second (root) and fourth (follow) paremeter of compare() in this file
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

    let got
    try {
        got = JSON.parse(strip(JsonSchemaGen.generateSchemaAndStringify(schemaGen)))
    } catch (err) {
        let expected = strip(
            readFile(`models/${module}/testdata/${file || "jsonschema.expected"}`)
        )
        expect("" + err).toBe(expected)
        return
    }

    let expected = JSON.parse(readFile(`models/${module}/testdata/${file || "jsonschema.expected"}`))
    expect(got).toStrictEqual(expected)
}
