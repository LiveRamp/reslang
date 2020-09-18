import { IServers } from "../treetypes"
import { replaceServerVars, replaceVars, makeVars } from "../genbase"

/** parse the reslang files and check that the correct
 * abstract syntax tree is being generated
 */

describe("server block tests", () => {
    test("make vars", () => {
        // construct a simple server block across rest and events
        const vars = "foo=test,port=1030"
        const map = makeVars(vars)
        expect(map.get("foo")).toBe("test")
        expect(map.get("port")).toBe("1030")
    })

    test("replace vars", () => {
        // construct a simple server block across rest and events
        const vars = "foo=test,port=1030"
        expect(replaceVars(makeVars(vars), "https://{foo}:{port:8080}")).toBe(
            "https://test:1030"
        )
    })

    test("bad vars", () => {
        // construct a simple server block across rest and events
        const vars = "foo=test,port=1030"
        expect(() =>
            replaceVars(makeVars(vars), "https://{xxx}:{port:8080}")
        ).toThrowError()
    })

    test("replace urls", () => {
        // construct a simple server block across rest and events
        const vars = "foo=test,port=1030"
        const servers: IServers = {
            rest: [
                {
                    comment: "",
                    url: "https://{foo}:{port:8080}",
                    environment: "PROD"
                }
            ],
            events: [
                {
                    comment: "",
                    url: "https://{xfoo:bar}:{xport:8080}",
                    environment: "PROD"
                }
            ]
        }

        replaceServerVars(vars, servers)
        expect(servers.rest[0].url).toBe("https://test:1030")
        expect(servers.events[0].url).toBe("https://bar:8080")
    })
})
