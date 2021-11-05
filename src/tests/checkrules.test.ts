import ParseGen from "../genparse"
import { IRules } from "../rules"
import SwagGen from "../genswagger"

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
            { onlyConfigToConfig: true },
            "RULE ONLY_CONFIG_TO_CONFIG violated: A"
        )
    })

    test("actions cannot have subresources", () => {
        check(
            { noSubresourcesOnActions: true },
            "RULE NO_ACTION_SUBRESOURCE violated: A::B::stop::Deep"
        )
    })

    test("Enum literal duplicated", () => {
        checkFullSwagger(
            {},
            "Duplicate literals in Duplicate enum",
            "models/duplicate-literals"
        )
    })
})

function check(
    rules: IRules,
    expected: string,
    model: string = "models/checkrules"
) {
    try {
        const _ = new ParseGen([model], rules, "PROD")
    } catch (error) {
        const got = error.message
        const correct = got.includes(expected)
        if (!correct) {
            console.log("Error: got this: " + got)
        }
        expect(correct).toBe(true)
        return
    }
    console.error("No rule exception triggered")
    expect(false).toBe(true)
}

function checkFullSwagger(
    rules: IRules,
    expected: string,
    model: string = "models/checkrules"
) {
    try {
        const _ = new SwagGen([model], rules, "PROD").generate()
    } catch (error) {
        const got = error.message
        const correct = got.includes(expected)
        expect(correct).toBe(true)
        return
    }
    console.error("No rule exception triggered")
    expect(false).toBe(true)
}
