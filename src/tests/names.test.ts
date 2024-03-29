import {
    pluralizeName,
    kebabCase,
    getVersion,
    removeVersion,
    capitalizeFirst,
    lowercaseFirst,
    camelCase
} from "../names"

describe("name tests", () => {
    test("name1", () => {
        expect(kebabCase("One two")).toBe("one-two")
    })

    test("name2", () => {
        expect(kebabCase("v2/One Two")).toBe("one-two")
    })

    test("name3", () => {
        expect(kebabCase("andrew/test-two")).toBe("andrew-test-two")
    })

    test("pluralize1", () => {
        expect(pluralizeName("battery")).toBe("batteries")
    })
    test("pluralize2", () => {
        expect(pluralizeName("name")).toBe("names")
    })
    test("pluralize3", () => {
        expect(pluralizeName("sheeps")).toBe("sheeps")
    })

    test("indexOf1", () => {
        expect("a.b".indexOf(".")).toBe(1)
    })
    test("indexOf2", () => {
        expect("ab".indexOf(".")).toBe(-1)
    })
    test("capitalizeFirst", () => {
        expect(capitalizeFirst("fooBar")).toBe("FooBar")
    })
    test("lowercaseFirst", () => {
        expect(lowercaseFirst("FooBar")).toBe("fooBar")
    })

    test("version gone1", () => {
        expect(kebabCase("v2/fooBar")).toBe("foo-bar")
    })
    test("version not gone", () => {
        expect(camelCase("v2/Foo-Bar")).toBe("v2FooBar")
    })
})

describe("getVersion", () => {
    it("gets the version", () => {
        expect(getVersion("v2/andrew")).toBe("v2")
        expect(getVersion("v12/andrew")).toBe("v12")
    })

    it("defaults to v1", () => {
        expect(getVersion("andrew")).toBe("v1")
    })
})

describe("removeVersion", () => {
    it("removes the version", () => {
        expect(removeVersion("v2/andrew")).toBe("andrew")
        expect(removeVersion("v12/andrew")).toBe("andrew")
    })
})
