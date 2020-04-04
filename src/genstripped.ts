import { BaseGen } from "./genbase"
import {
    isAction,
    IResourceLike,
    IEnum,
    IStructure,
    IUnion,
    IEvent,
    IAttribute
} from "./treetypes"
import colors from "colors/safe"

/**
 * parse and then print out in pretty form
 */
const tab = "    "
function l(a: string) {
    process.stdout.write(a)
}
function ln(a: string = "") {
    l(a + "\n")
}
function keyword(a: string) {
    return colors.blue(a)
}
function name(a: string) {
    return colors.bold(a)
}

// prints up a stripped down version of the reslang for easy review without the comments and noise such as errors
export default class StripGen extends BaseGen {
    public generate() {
        // do only the defs
        for (const def of this.defs) {
            if (def.secondary || def.name === "StandardError") {
                continue
            }
            switch (def.kind) {
                case "resource-like":
                    if (isAction(def)) {
                        this.printAction(def)
                    } else {
                        this.printResource(def)
                    }
                    break
                case "enum":
                    this.printEnum(def)
                    break
                case "structure":
                    this.printStructure(def)
                    break
                case "union":
                    this.printUnion(def)
                    break
                case "event":
                    this.printEvent(def)
                    break
            }
            ln()
        }
    }

    private printResource(def: IResourceLike) {
        if (def.parents.length === 0) {
            l(keyword(def.type) + " ")
        } else {
            l(keyword("subresource") + " ")
        }
        this.printResourceLikeBody(def)
    }

    private printResourceLikeBody(def: IResourceLike) {
        ln(name(def.name) + " {")
        for (const attr of def.attributes || []) {
            this.printAttribute(attr)
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
        ln("}")
    }

    private printAttribute(attr: IAttribute, tabs: number = 1) {
        for (let t = 0; t < tabs; t++) {
            l(tab)
        }
        l(
            name(attr.name) +
                ": " +
                (attr.stringMap ? "stringmap<" : "") +
                (attr.linked ? keyword("linked") + " " : "") +
                (attr.full ? keyword("value-of") + " " : "") +
                attr.type.name +
                (attr.stringMap ? ">" : "")
        )
        this.printArray(attr)
        this.printModifiers(attr)
        this.printConstraints(attr)
        l(attr.inline ? keyword("inline") + " " : "")
        ln()
    }

    private printArray(attr: IAttribute) {
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

    private printModifiers(attr: IAttribute) {
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
    }

    private printConstraints(attr: IAttribute) {
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

    private printAction(def: IResourceLike) {
        l(keyword(def.async ? "async " : "sync "))
        l(def.bulk ? keyword("bulk ") : "")
        l(keyword("action "))
        this.printResourceLikeBody(def)
    }
    private printEnum(def: IEnum) {
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
    private printStructure(def: IStructure) {
        ln(keyword("structure ") + name(def.name) + " {")
        for (const attr of def.attributes || []) {
            this.printAttribute(attr)
        }
        ln("}")
    }
    private printUnion(def: IUnion) {
        ln(keyword("union ") + name(def.name) + " {")
        for (const attr of def.attributes || []) {
            this.printAttribute(attr)
        }
        ln("}")
    }
    private printEvent(def: IEvent) {
        l(keyword(def.produces ? "produces" : "consumes"))
        ln(keyword(" event ") + name(def.name) + " {")
        if (def.header && def.header.length !== 0) {
            ln(tab + keyword("/header"))
            for (const attr of def.header) {
                this.printAttribute(attr, 2)
            }
        }
        if (def.payload && def.payload.length !== 0) {
            ln(tab + keyword("/payload"))
            for (const attr of def.payload) {
                this.printAttribute(attr)
            }
        }
        ln("}")
    }
}
