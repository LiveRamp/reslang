import {clean, loadParser} from "../parse"

/** parse the reslang files and check that the correct
 * abstract syntax tree is being generated
 */
describe("reslang default parsing tests", () => {
    function attributeWithDefault(attrName: string, attrType: string, defaultType: string, defaultValue: string) {
        return {
            "constraints": {},
            "default": {
                "type": defaultType,
                "value": defaultValue,
            },
            "full": false,
                "inline": false,
                "linked": false,
                "modifiers": {
                "flag": false,
                    "mutable": false,
                    "optional": true,
                    "optionalGet": false,
                    "optionalPost": false,
                    "optionalPut": false,
                    "output": false,
                    "input": false,
                    "query": false,
                    "queryonly": false,
                    "representation": false,
                    "nullable": false
            },
            "name": attrName,
            "stringMap": false,
            "type": {
                "parents": [],
                "short": attrType,
            },
        }
    }

    let parser = loadParser();
    test("enum defaults should be parsed for primitives", () => {
        let tree = clean(parser.parse(`
            structure test {
                a: double optional
                    default = 123.9
                b: int optional
                    default = 123
                c: date optional
                    default = "12/20/1990"
                e: Struct4 inline
                f: boolean optional
                    default = true
                g: OperationType optional
                    default = ADD
            }`, {output: "parser"}));

        expect(tree.length).toBe(1)
        expect(tree[0].attributes).toBeDefined()
        expect(tree[0].attributes).toContainEqual(attributeWithDefault("a", "double", "numerical", "123.9"))
        expect(tree[0].attributes).toContainEqual(attributeWithDefault("b", "int", "numerical", "123"))
        expect(tree[0].attributes).toContainEqual(attributeWithDefault("c", "date", "string", "12/20/1990"))
        expect(tree[0].attributes).toContainEqual(attributeWithDefault("f", "boolean", "boolean", "true"))
        expect(tree[0].attributes).toContainEqual(attributeWithDefault("g", "OperationType", "enum", "ADD"))
    })
});

