import { loadParser, clean } from "../parse"

/** parse the reslang files and check that the correct
 * abstract syntax tree is being generated
 */
describe("reslang summary parsing tests", () => {
    let parser = loadParser();

    function expected(...operations: any[]) {
        return [{
            category: "definition",
            type: "resource",
            kind: "resource-like",
            operations: operations,
            future: false,
            parents: [],
            short: "test",
            singleton: false
        }];
    }
    function operation(operation: string, summary: string, comment?: string) {
        return {
            summary: summary,
            operation: operation,
            comment: comment,
            options: [],
            errors: []
        };
    }

    test("operations should include empty summary by default", () => {
        let tree = clean(parser.parse(
            `resource test {
                /operations
                POST
            }`, {output: "parser"}));
        expect(tree).toEqual(expected(operation("POST", "")))
    })
    test("operations may include only a description", () => {
        let tree = clean(parser.parse(
            `resource test {
                /operations
                "my description"
                POST
            }`, {output: "parser"}));
        expect(tree).toEqual(expected(operation("POST", "", "my description")))
    })
    test("operations may include only a summary", () => {
        let tree = clean(parser.parse(
            `resource test {
                /operations
                "Summary: my summary"
                POST
            }`, {output: "parser"}));
        expect(tree).toEqual(expected(operation("POST", "my summary", "")))
    })
    test("operations may include both summary and description", () => {
        let tree = clean(parser.parse(
            `resource test {
                /operations
                "Summary: my summary
                my description"
                POST
            }`, {output: "parser"}));
        expect(tree).toEqual(expected(operation("POST", "my summary", "my description")))
    })
    test("summaries ignore dangling whitespace", () => {
        let tree = clean(parser.parse(
            `resource test {
                /operations
                "Summary: my summary     
                my description"
                POST
            }`, {output: "parser"}));
        expect(tree).toEqual(expected(operation("POST", "my summary", "my description")))
    })
    test("summaries ignore danling dot", () => {
        let tree = clean(parser.parse(
            `resource test {
                /operations
                "Summary: my summary.
                my description"
                POST
            }`, {output: "parser"}));
        expect(tree).toEqual(expected(operation("POST", "my summary", "my description")))
    })
})
