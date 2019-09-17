import {
    pluralizeName,
    fixName,
    getVersion,
    makeShort,
    makeLong,
    capitalizeFirst,
    lowercaseFirst
} from "../names"

describe("name tests", () => {
    test("name1", () => {
        expect(fixName("One two")).toBe("onetwo")
    })
    test("name2", () => {
        expect(fixName("v2/One Two")).toBe("one-two")
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

    test("version1", () => {
        expect(getVersion("v2/andrew")).toBe("v2")
    })
    test("version2", () => {
        expect(getVersion("andrew")).toBe("v1")
    })
    test("makeshort", () => {
        expect(makeShort("foo.bar")).toBe("bar")
    })
    test("makeshort2", () => {
        expect(makeShort("bar")).toBe("bar")
    })
    test("indexOf1", () => {
        expect("a.b".indexOf(".")).toBe(1)
    })
    test("indexOf2", () => {
        expect("ab".indexOf(".")).toBe(-1)
    })
    test("makeLong1", () => {
        expect(makeLong("foo", "xxx", "bar")).toBe("foo.bar")
    })
    test("makeLong2", () => {
        expect(makeLong("foo", "foo", "bar")).toBe("bar")
    })
    test("makeLong3", () => {
        expect(makeLong("foo", "foo", "bar.bar")).toBe("bar.bar")
    })
    test("makeLong4", () => {
        expect(makeLong("foo", "bar", "bar")).toBe("foo.bar")
    })
    test("makeLong5", () => {
        expect(makeLong("foo", "bar", "bar.bar")).toBe("bar")
    })
    test("makeLong6", () => {
        expect(makeLong("foo", "xxx", "bar.bar")).toBe("bar.bar")
    })

    test("capitalizeFirst", () => {
        expect(capitalizeFirst("fooBar")).toBe("FooBar")
    })

    test("lowercaseFirst", () => {
        expect(lowercaseFirst("FooBar")).toBe("fooBar")
    })
})
