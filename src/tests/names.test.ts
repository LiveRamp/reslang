import { pluralizeName, fixName, getVersion } from "../names"

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
        expect(pluralizeName("sheeps")).toBe("sheepses")
    })

    test("version1", () => {
        expect(getVersion("v2/andrew")).toBe("v2")
    })
    test("version2", () => {
        expect(getVersion("andrew")).toBe("v1")
    })
})
