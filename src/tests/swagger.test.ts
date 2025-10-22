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

    test("swagger oneof polymorphism", () => {
        compare("polymorphism", true, "oneof.expected")
    })

    test("structure with all optional fields should not have required array", () => {
        const swag = new SwagGen(
            ["models/patchable"],
            { ignoreRules: true, pagination: "cursor", limit: 10, maxLimit: 100 },
            "PROD",
            "",
            true,
            false,
            true,
            false
        )
        const result = swag.generate() as any
        const schemas = result.components.schemas
        
        expect(schemas.PersonPatchable).toBeDefined()
        expect(schemas.PersonPatchable.required).toBeUndefined()
        
        for (const schemaName in schemas) {
            const schema = schemas[schemaName]
            if (schema.required !== undefined) {
                expect(Array.isArray(schema.required)).toBe(true)
                expect(schema.required.length).toBeGreaterThan(0)
            }
        }
    })
})

/** compare the output with saved swagger */
function compare(module: string, oneofPolymorphism = false, expectedPath = "swagger.expected") {
    const swag = new SwagGen(
        [`models/${module}`],
        { ignoreRules: true, pagination: "cursor", limit: 10, maxLimit: 100 },
        "PROD",
        "",
        true,
        false,
        true,
        oneofPolymorphism
    )
    const got = swag.generate();
    const expected = yaml.load(readFile(`models/${module}/testdata/${expectedPath}`));

    expect(yaml.dump(clean(got), {noRefs: true}))
        .toStrictEqual(yaml.dump(clean(expected), {noRefs: true}))
}
