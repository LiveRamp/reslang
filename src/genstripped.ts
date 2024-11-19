import { BaseGen } from "./genbase"
import {
    isAction,
    IResourceLike,
    IEnum,
    IStructure,
    IUnion,
    IEvent,
    IAttribute,
    IProduces,
    IConsumes
} from "./treetypes"

/**
 * parse and then print out in pretty form
 */
const tab = "&nbsp;&nbsp;&nbsp;&nbsp;"

// prints up a stripped down version of the reslang for easy review without the comments and noise such as errors
export default class StripGen extends BaseGen {
    public generate(pretty: boolean) {
        let lines = ""

        // do only the defs
        for (const def of this.defs) {
            if (def.secondary || def.name === "StandardError") {
                continue
            }
            switch (def.kind) {
                case "resource-like":
                    if (isAction(def)) {
                        printAction(def)
                    } else {
                        printResource(def)
                    }
                    break
                case "enum":
                    printEnum(def)
                    break
                case "structure":
                    printStructure(def)
                    break
                case "union":
                    printUnion(def)
                    break
                case "event":
                    printEvent(def)
                    break
                case "produces":
                    printProduces(def)
                    break
                case "consumes":
                    printConsumes(def)
                    break
            }
            ln()
        }
        const font = ``
        return (
            "<html>" +
            (!pretty
                ? "<font face='Monaco'>" + lines
                : `<table style="width:100%"><br>
                <tr>
                <td>&nbsp;</td>
                <td><font face="Monaco" color="grey">${lines}</td>
                </tr>
             </table>`)
        )

        /** nested functions after here, to make the l() and ln() calls easier */

        function l(a: string) {
            lines = lines + a
        }
        function ln(a: string = "") {
            lines = lines + a + "<br>"
        }
        function keyword(a: string) {
            return !pretty ? a : "<font color='magenta'>" + a + "</font>"
        }
        function name(a: string) {
            return !pretty ? a : "<font color='blue'>" + a + "</font>"
        }
        function type(a: string) {
            return !pretty ? a : "<font color='blue'>" + a + "</font>"
        }
        function attrName(a: string) {
            return a
        }

        /**
         * functions below here render the various reslang constructs
         */

        function printResource(def: IResourceLike) {
            if (def.future) {
                l(keyword("future "))
            }
            if (def.parents.length === 0) {
                l(keyword(def.type) + " ")
            } else {
                l(keyword("subresource") + " ")
            }
            printResourceLikeBody(def)
        }

        function printResourceLikeBody(def: IResourceLike) {
            ln(name(def.name) + " {")
            for (const attr of def.attributes || []) {
                printAttribute(attr)
            }
            if (def.operations && def.operations.length !== 0) {
                ln()
                ln(tab + keyword("/operations"))
                l(tab + tab)
                for (const op of def.operations) {
                    l(op.operation + " ")
                }
                ln()
            }
            if (def.events && def.events.length !== 0) {
                ln()
                ln(tab + keyword("/events"))
                l(tab + tab)
                for (const op of def.events) {
                    l(op.operation + " ")
                }
                ln()
            }
            ln("}")
        }

        function printAttribute(attr: IAttribute, tabs: number = 1) {
            for (let t = 0; t < tabs; t++) {
                l(tab)
            }
            l(
                attrName(attr.name) +
                    ": " +
                    (attr.stringMap ? "stringmap<" : "") +
                    (attr.linked ? keyword("linked") + " " : "") +
                    (attr.full ? keyword("value-of") + " " : "") +
                    type(attr.type.name) +
                    (attr.stringMap ? ">" : "")
            )
            printArray(attr)
            printModifiers(attr)
            printConstraints(attr)
            l(attr.inline ? keyword("inline") + " " : "")
            ln()
        }

        function printArray(attr: IAttribute) {
            if (attr.array) {
                const arr = attr.array
                l("[")
                if (arr.type === 1) {
                    l(arr.min ? "" + arr.min : "")
                    l("..")
                    l(arr.max ? "" + arr.max : "")
                }
                l("] ")
            } else {
                l(" ")
            }
        }

        function printModifiers(attr: IAttribute) {
            const mod = attr.modifiers
            l(mod.mutable ? keyword("mutable ") : "")
            l(mod.optional ? keyword("optional ") : "")
            l(mod.optionalPost ? keyword("optional-post ") : "")
            l(mod.optionalPut ? keyword("optional-put ") : "")
            l(mod.optionalGet ? keyword("optional-get ") : "")
            l(mod.output ? keyword("output ") : "")
            l(mod.queryonly ? keyword("queryonly ") : "")
            l(mod.query ? keyword("query ") : "")
            l(mod.representation ? keyword("representation ") : "")
            l(mod.getOnly ? keyword("get-only ") : "")
        }

        function printConstraints(attr: IAttribute) {
            const con = attr.constraints
            if (con.minLength || con.maxLength) {
                ln()
                l(tab + tab)
            }
            if (con.minLength) {
                l(keyword("min-length:") + con.minLength + " ")
            }
            if (con.maxLength) {
                l(keyword("max-length:") + con.maxLength + " ")
            }
        }

        function printAction(def: IResourceLike) {
            l(keyword(def.async ? "async " : "sync "))
            l(def.bulk ? keyword("bulk ") : "")
            l(keyword("action "))
            printResourceLikeBody(def)
        }
        function printEnum(def: IEnum) {
            ln(keyword("enum ") + name(def.name) + " {")
            if (def.literals) {
                l(tab)
            }
            for (const literal of def.literals || []) {
                l(literal + " ")
            }
            ln()
            ln("}")
        }
        function printStructure(def: IStructure) {
            ln(keyword("structure ") + name(def.name) + " {")
            for (const attr of def.attributes || []) {
                printAttribute(attr)
            }
            ln("}")
        }
        function printUnion(def: IUnion) {
            ln(keyword("union ") + name(def.name) + " {")
            for (const attr of def.attributes || []) {
                printAttribute(attr)
            }
            ln("}")
        }
        function printEvent(def: IEvent) {
            ln(keyword("event ") + name(def.name) + " {")
            if (def.header && def.header.length !== 0) {
                ln(tab + keyword("/header"))
                for (const attr of def.header) {
                    printAttribute(attr, 2)
                }
            }
            if (def.payload && def.payload.length !== 0) {
                ln(tab + keyword("/payload"))
                for (const attr of def.payload) {
                    printAttribute(attr)
                }
            }
            ln("}")
        }
        function printProduces(def: IProduces) {
            ln(keyword("produces ") + name(def.event.name))
        }
        function printConsumes(def: IConsumes) {
            ln(keyword("consumes ") + name(def.event.name))
        }
    }
}
