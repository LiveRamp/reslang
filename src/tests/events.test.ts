import { readFile, clean } from "../parse"
import { strip } from "./utilities"
import yaml from "js-yaml"
import EventsGen from "../genevents"
import { allModels } from "./allmodels"

/** event generation tests
 */
describe("event generation tests", () => {
    test.each(allModels)("events(%s)", a => {
        compare(a)
    })
})

/** compare the output with saved asyncapi spec */
function compare(module: string) {
    const asyncapi = new EventsGen([`models/${module}`], { ignoreRules: true })
    const api = asyncapi.generate()

    const got = strip(yaml.dump(clean(api), { noRefs: true }))
    const expected = strip(
        readFile(`models/${module}/testdata/asyncapi.expected`)
    )

    if (got !== expected) {
        console.log(got)
    }
    expect(got).toBe(expected)
}
