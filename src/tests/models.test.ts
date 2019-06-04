import { parseFile, readFile } from "../parse"

/** parse the reslang files and check that the correct
 * abstract syntax tree is being generated
 */
xdescribe("reslang parsing tests", () => {
    test("strip", () => {
        expect(
            strip(` a   b
 c   d

 `)
        ).toBe(`a b
c d`)
    })

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
})

function compare(module: string) {
    const tree = parseFile(`models/${module}.reslang`)
    const got = JSON.stringify(tree, null, 2)
    const sgot = strip(got)
    const expected = strip(
        readFile(`src/tests/model_outputs/${module}.expected`)
    )
    if (sgot !== expected) {
        console.log(got)
    }
    expect(sgot).toBe(expected)
}

function strip(line: string) {
    return line
        .replace(/^[\ \t]+/g, "")
        .replace(/\n[\ \t]+/g, "\n")
        .replace(/[\ \t]+/g, " ")
        .replace(/\s*$/, "")
}
