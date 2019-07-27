import { IDefinition } from "./treetypes"
import { parseFile } from "./parse"
import { BaseGen } from "./genbase"

/**
 * generate .viz output for a graphical view of the resources
 */

interface ILink {
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
        node [shape=none];
        rankdir="LR";\n`
        const links: ILink[] = []
        for (const def of this.defs) {
            const attrs = this.formAttributes(def, links)
            const ops = this.formOperations(def)
            const imported = def.secondary
            const color = imported ? "color='gray'" : ""
            const bgcolor = [
                "request-resource",
                "asset-resource",
                "configuration-resource"
            ].includes(def.type)
                ? "bgcolor='#ffffcc'"
                : ""

            if (
                [
                    "request-resource",
                    "asset-resource",
                    "configuration-resource",
                    "subresource",
                    "structure",
                    "request",
                    "action"
                ].includes(def.type)
            ) {
                const width = [
                    "request-resource",
                    "asset-resource",
                    "configuration-resource"
                ].includes(def.type)
                    ? 3
                    : 1
                const rounded = [
                    "request-resource",
                    "asset-resource",
                    "configuration-resource",
                    "action",
                    "subresource"
                ].includes(def.type)
                    ? "style='rounded'"
                    : ""
                const box = `
                    <table border="${width}" cellborder="0" cellspacing="1" ${rounded} ${color} ${bgcolor}>
                    <tr><td><b>${def.short}  </b></td></tr>`

                if ("structure" === def.type) {
                    viz += `"${def.short}" [label=<${box}${
                        attrs ? "<hr/>" : ""
                    }${attrs}</table> >];\n`
                } else if (imported) {
                    viz += `"${def.short}" [label=<${box}</table>>];\n`
                } else {
                    viz += `"${
                        def.short
                    }" [label=<${box}<hr/>${attrs}${ops}</table>>];\n`
                }

                // from parent to subresource
                if ("subresource" === def.type) {
                    const label = this.makeLabelText("subresource")
                    viz += `"${def.parent}" -> "${
                        def.short
                    }" [dir="back" arrowtail="ediamond" label=${label}];\n`
                }

                // from parent to action
                if ("action" === def.type) {
                    const label = this.makeLabelText("action")
                    viz += `"${def.parent}" -> "${
                        def.short
                    }" [dir="none" label=${label}];\n`
                }
            } else if ("enum" === def.type) {
                const box = `
                    <table border="1" cellborder="0" cellspacing="1" ${color}>
                    <tr><td align="left"><b>${def.short}  </b></td></tr>`
                let literals = ""
                for (const lit of def.literals!) {
                    literals += `<tr><td align="left">${lit}</td></tr>`
                }
                viz += `"${
                    def.short
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

        // handle inheritance
        for (const def of this.defs) {
            if (def.extends) {
                viz += `"${def.name}" -> "${
                    def.extends
                }" [arrowhead="onormal" label=${this.makeLabelText(
                    "inherits"
                )}];\n`
            }
        }

        viz += "}"
        return viz
    }

    private formAttributes(def: IDefinition, links: ILink[]) {
        let attrs = ""
        if (def.attributes) {
            for (const attr of def.attributes) {
                const multi = attr.multiple ? "[]" : ""
                const output = attr.output ? " (out)" : ""

                // if this is linked do it that way
                const type = this.extractDefinitionGently(attr.type.name)
                if (attr.linked) {
                    links.push({
                        type: "resource",
                        from: def.short,
                        to: attr.type.short,
                        label: ` ${attr.name}${multi}${output}`
                    })
                    continue
                }
                if (type && type.type === "structure") {
                    links.push({
                        type: "structure",
                        from: def.short,
                        to: attr.type.short,
                        label: ` ${attr.name}${multi}${output}`
                    })
                    continue
                }

                attrs += `<tr><td align="left">${attr.name}: ${
                    attr.type.short
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
