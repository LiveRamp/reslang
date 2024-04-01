import {readFile} from "../parse";
import peg from "pegjs";
import * as path from "path";

const grammar = readFile(path.resolve(__dirname, '..'), "grammar", "base.pegjs")

const parser = peg.generate(grammar, {allowedStartRules: ["semver"]});


describe("semver", () => {
    it("should parse a semantic version with a pre-release identifier", () => {
        const input_1 = "1.2.3-alpha";
        const expected_1 = "1.2.3-alpha";

        const input_2 = "1.0.0-alpha.beta";
        const expected_2 = "1.0.0-alpha.beta";

        const input_3 = "1.2.3----RC-SNAPSHOT.12.9.1--.12";
        const expected_3 = "1.2.3----RC-SNAPSHOT.12.9.1--.12";
        // Parse the input string
        const result_1 = parser.parse(input_1);
        const result_2 = parser.parse(input_2);
        const result_3 = parser.parse(input_3);

        // Check the result
        expect(result_1).toBe(expected_1);
        expect(result_2).toBe(expected_2);
        expect(result_3).toBe(expected_3);
    });

    it("should parse a semantic version with no pre-release identifier", () => {
        const input = "1.2.3";
        const expected = "1.2.3";

        // Parse the input string
        const result = parser.parse(input);

        // Check the result
        expect(result).toBe(expected);
    });

    it("parse a invalid semantic version throw error", () => {
        const input_1 = "1.2.3-0123";
        const input_2 = "alpha_beta";

        // Parsing an invalid semantic version should throw an error
        expect(() => parser.parse(input_1)).toThrow();
        expect(() => parser.parse(input_2)).toThrow();
    });
});
