import { IDefinition } from "./treetypes"
import { parseFile } from "./parse"
import { BaseGen } from "./basegen"

/**
 * generate .viz output for a graphical view of the resources
 */

interface Link {
    type: string
    from: string
    to: string
    label: string
}

export default class DotvizGen extends BaseGen {
    public generate() {
        let viz = `digraph G { 
        graph [fontname = "helvetica"];
        node [fontname = "helvetica"];
        edge [fontname = "helvetica"];
        node [shape=none];\n`
        const links: Link[] = []
        for (const def of this.defs) {
            const attrs = this.formAttributes(def, links)
            const ops = this.formOperations(def)
            const imported = def.name in this.imported
            const color = imported ? "color='gray'" : ""
            const bgcolor = ["resource", "request"].includes(def.type)
                ? "bgcolor='#ffffcc'"
                : ""

            if (
                [
                    "resource",
                    "subresource",
                    "structure",
                    "request",
                    "verb"
                ].includes(def.type)
            ) {
                const width = ["resource", "request"].includes(def.type) ? 3 : 1
                const rounded = [
                    "resource",
                    "request",
                    "verb",
                    "subresource"
                ].includes(def.type)
                    ? "style='rounded'"
                    : ""
                const box = `
                    <table border="${width}" cellborder="0" cellspacing="1" ${rounded} ${color} ${bgcolor}> 
                    <tr><td><b>${def.name}  </b></td></tr>`

                if ("structure" === def.type) {
                    viz += `"${def.name}" [label=<${box}${
                        attrs ? "<hr/>" : ""
                    }${attrs}</table> >];\n`
                } else if (imported) {
                    viz += `"${def.name}" [label=<${box}</table>>];\n`
                } else {
                    viz += `"${
                        def.name
                    }" [label=<${box}<hr/>${attrs}${ops}</table>>];\n`
                }

                // from parent to subresource
                if ("subresource" === def.type) {
                    const label = this.makeLabelText("subresource")
                    viz += `"${def.parent}" -> "${
                        def.name
                    }" [dir="back" arrowtail="ediamond" label=${label}];\n`
                }

                // from parent to verb
                if ("verb" === def.type) {
                    const label = this.makeLabelText("verb")
                    viz += `"${def.parent}" -> "${
                        def.name
                    }" [dir="none" label=${label}];\n`
                }
            } else if ("enum" === def.type) {
                const box = `
                    <table border="1" cellborder="0" cellspacing="1" ${color}>
                    <tr><td align="left"><b>${def.name}  </b></td></tr>`
                let literals = ""
                for (const lit of def.literals!) {
                    literals += `<tr><td align="left">${lit}</td></tr>`
                }
                viz += `"${
                    def.name
                }" [label=<${box}<hr/>${literals}</table>>];\n`
            }
        }

        // process additional links
        for (const link of links) {
            const label = this.makeLabelText(link.label)
            if (link.type === "resource") {
                viz += `"${link.from}" -> "${
                    link.to
                }" [label=${label} arrowhead="vee"];\n`
            }
            if (link.type === "structure") {
                viz += `"${link.from}" -> "${
                    link.to
                }" [dir="back" arrowtail="diamond" label=${label}];\n`
            }
        }

        viz += "}"
        return viz
    }

    private formAttributes(def: IDefinition, links: Link[]) {
        let attrs = ""
        if (def.attributes) {
            for (const attr of def.attributes) {
                const multi = attr.multiple ? "[]" : ""
                const output = attr.output ? " (out)" : ""

                // if this is linked do it that way
                const type = this.extractDefinitionGently(attr.type, this.defs)
                if (attr.linked) {
                    links.push({
                        type: "resource",
                        from: def.name,
                        to: attr.type,
                        label: ` ${attr.name}${multi}${output}`
                    })
                    continue
                }
                if (type && type.type === "structure") {
                    links.push({
                        type: "structure",
                        from: def.name,
                        to: attr.type,
                        label: ` ${attr.name}${multi}${output}`
                    })
                    continue
                }

                attrs += `<tr><td align="left">${attr.name}: ${
                    attr.type
                }${multi}${output}</td></tr>`
            }
        }
        return attrs
    }

    private formOperations(def: IDefinition) {
        let ops = `<tr><td align="right"><font color="#0000ff" point-size="8">`
        if (def.singleton) {
            ops += "singleton "
        }
        if (def.operations) {
            for (const op of def.operations) {
                if (ops) {
                    ops += " "
                }
                ops += op.operation
                if (op.operation === "MULTIGET") {
                    for (const id of op.ids!) {
                        ops += " " + id
                    }
                }
            }
            return ops + "</font></td></tr>"
        }
        return ""
    }

    private makeLabelText(text: string) {
        return `< <font point-size="8">${text}</font> >`
    }
}
