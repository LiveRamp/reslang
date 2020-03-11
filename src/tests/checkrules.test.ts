import { parseFile, readFile } from "../parse"
import { strip } from "./utilities"
import ParseGen from "../genparse"
import { IRules, RULES } from "../rules"

/** parse the reslang files and check that the correct
 * abstract syntax tree is being generated
 */
describe("rule checking tests", () => {
    test("resource depth", () => {
        check(
            { maxResourceDepth: 2 },
            "RULE maxResourceDepth(2) violated: A::B::C"
        )
    })

    test("action depth", () => {
        check(
            { maxActionDepth: 2 },
            "RULE maxActionDepth(2) violated: A::B::C::start"
        )
    })

    test("actions on requests only", () => {
        check(
            { actionsOnRequestsOnly: true },
            "RULE actionsOnRequestsOnly violated: A::B::C::start"
        )
    })

    test("no config links to non-config resources", () => {
        check(
            { checkRules: [RULES.ONLY_CONFIG_TO_CONFIG] },
            "RULE ONLY_CONFIG_TO_CONFIG violated: A"
        )
    })

    test("actions cannot have subresources", () => {
        check(
            { checkRules: [RULES.NO_ACTION_SUBRESOURCES] },
            "RULE NO_ACTION_SUBRESOURCE violated: A::B::stop::Deep"
        )
    })
})

function check(rules: IRules, expected: string) {
    try {
        const _ = new ParseGen([`models/checkrules`], rules)
    } catch (error) {
        const got = error.message
        const correct = got.includes(expected)
        if (!correct) {
            console.log(got)
        }
        expect(correct).toBe(true)
        return
    }
    console.error("No rule exception triggered")
    expect(false).toBe(true)
}
