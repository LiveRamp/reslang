// these functions are actually turned into javascript, and embedded into main.pegjs
// as it's far easier to call these inside the grammar rule for documentation
function stripWhitespace(str: string) {
    // break it into lines
    const lines = str.split("\n")
    const all = new Array<string>()
    const length = lines.length
    let indent = ""
    lines.forEach((value, index) => {
        // if this is the 2nd line, capture the indent
        if (index === 1) {
            indent = value.substring(0, value.length - value.trimLeft().length)
        }

        // add if this is not an empty first or last line
        if (value || (index !== 0 && index !== length - 1)) {
            all.push(removeIndent(value, indent))
        }
    })
    return all.join("\n")
}

function removeIndent(str: string, indent: string) {
    if (str.startsWith(indent)) {
        return str.substring(indent.length)
    }
    return str
}

describe("whitespace stripping and indentation preservation", () => {
    // test that the indent of the next line is removed
    const doc0a = `
We are stripping out
the start and end lines
`
    const doc0b = `We are stripping out\nthe start and end lines`

    test("strip indent", () => {
        expect(stripWhitespace(doc0a)).toBe(doc0b)
    })

    // test that the indent of the next line is removed
    const doc1a = `The next line is indented
                  and we should
                  strip it.
                  The same with the last line
`
    const doc1b = `The next line is indented
and we should
strip it.
The same with the last line`

    test("handle indent", () => {
        expect(stripWhitespace(doc1a)).toBe(doc1b)
    })

    // the indentation here should be preserved
    const doc2a = `
The next line is indented
                  and we should
                  strip it.
                  The same with the last line
`
    const doc2b = `The next line is indented
                  and we should
                  strip it.
                  The same with the last line`

    test("strip leave indent", () => {
        expect(stripWhitespace(doc2a)).toBe(doc2b)
    })

    const doc3a = `Use this endpoint to fetch the overview of a given DistributionRequest, including current status, input
    configuration as well as output metadata, if the request has completed`
    const doc3b = `Use this endpoint to fetch the overview of a given DistributionRequest, including current status, input
configuration as well as output metadata, if the request has completed`
    test("strip remove indent", () => {
        expect(stripWhitespace(doc3a)).toBe(doc3b)
    })
})
