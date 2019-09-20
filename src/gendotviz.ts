import { IDefinition, IDiagram } from "./treetypes"
import { BaseGen } from "./genbase"

/**
 * generate .viz output for a graphical view of the resources
 */

interface ILink {
    type: string
    from: string
    fromName: string
    to: string
    toName: string
    label: string
}

export default class DotvizGen extends BaseGen {
    public generate(diagramName: string) {
        // don't include errors
        this.markGenerate(false)

        const diagram = (this.diagrams || []).find(
            diag => diag.diagram === diagramName
        )
        if (!diagram) {
            throw new Error("Cannot find diagram definition for " + diagramName)
        }
        // find exclusions etc
        const exclude = this.formExclusions(diagram)
        const imports = this.formImports(diagram)
        const include = this.formInclusions(diagram, exclude, imports)
        const folds = this.formFolds(diagram)

        let viz = `digraph G {
        graph [fontname = "helvetica"];
        node [fontname = "helvetica"];
        edge [fontname = "helvetica"];
        node [shape=none];
        ${diagram.layout === "LR" ? 'rankdir="LR";' : ""}\n`
        const links: ILink[] = []
        for (const def of this.defs) {
            if (!include.has(def.name)) {
                continue
            }

            const imported = imports.has(def.name)
            const attrs = this.formAttributes(def, links, include, folds)
            const ops = this.formOperations(def)
            const color = def.secondary ? "color='gray'" : ""
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
                const padding = "        "
                const box = `
                    <table border="${width}" cellborder="0" cellspacing="1" ${rounded} ${color} ${bgcolor}>
                    <tr><td><b>${def.short}${padding}</b></td></tr>`

                if ("structure" === def.type) {
                    viz += `"${def.short}" [label=<${box}${padding}${
                        attrs ? "<hr/>" : ""
                    }${attrs}</table> >];\n`
                } else if (imported) {
                    viz += `"${def.short}" [label=<${box}</table>>];\n`
                } else {
                    viz += `"${def.short}" [label=<${box}<hr/>${attrs}${ops}"}</table>>];\n`
                }

                // from parent to subresource
                if ("subresource" === def.type && include.has(def.parent!)) {
                    const label = this.makeLabelText("subresource")
                    viz += `"${def.parentShort}" -> "${def.short}" [dir="back" arrowtail="ediamond" label=${label}];\n`
                }

                // from parent to action
                if ("action" === def.type) {
                    const label = this.makeLabelText("action")
                    viz += `"${def.parentShort}" -> "${def.short}" [dir="none" label=${label}];\n`
                }
            } else if ("enum" === def.type) {
                const box = `
                    <table border="1" cellborder="0" cellspacing="1" ${color}>
                    <tr><td align="left"><b>${def.short}  </b></td></tr>`
                let literals = ""
                for (const lit of def.literals!) {
                    literals += `<tr><td align="left">${lit}</td></tr>`
                }
                viz += `"${def.short}" [label=<${box}<hr/>${literals}</table>>];\n`
            }
        }
        // process additional links
        for (const link of links) {
            if (!include.has(link.fromName) || !include.has(link.toName)) {
                continue
            }
            const label = this.makeLabelText(link.label)
            if (link.type === "resource") {
                viz += `"${link.from}" -> "${link.to}" [label=${label} arrowhead="vee"];\n`
            }
            if (link.type === "structure") {
                viz += `"${link.from}" -> "${link.to}" [dir="back" arrowtail="diamond" label=${label}];\n`
            }
        }

        // add the groups
        let count = 0
        console.log(diagram.groups)
        for (const group of diagram.groups || []) {
            viz += `subgraph cluster${count++} \{
                style = dashed;
                color=blue;
                label = "${group.comment}";`
            for (const ref of group.include || []) {
                viz += `"${ref.short}" `
            }
            viz += "}\n"
        }

        viz += "}"
        return viz
    }

    private formFolds(diagram: IDiagram) {
        return new Set<string>(
            (diagram.fold || []).map(fold => fold.attr + "/" + fold.of.name)
        )
    }

    private formExclusions(diagram: IDiagram) {
        return new Set<string>((diagram.exclude || []).map(ref => ref.name))
    }

    private formImports(diagram: IDiagram) {
        return new Set<string>((diagram.import || []).map(ref => ref.name))
    }

    private formInclusions(
        diagram: IDiagram,
        exclude: Set<string>,
        imports: Set<string>
    ) {
        const include = new Set<string>(
            (this.defs || [])
                .filter(
                    def => diagram.includeAll && diagram.includeAll === def.file
                )
                .map(def => def.name)
        )
        if (diagram.include) {
            diagram.include.forEach(incl => include.add(incl.name))
        }
        if (diagram.import) {
            diagram.import.forEach(incl => include.add(incl.name))
        }
        exclude.forEach(excl => include.delete(excl))
        console.log(diagram.includeAll)
        return include
    }

    private formAttributes(
        def: IDefinition,
        links: ILink[],
        include: Set<string>,
        folded: Set<string>
    ) {
        let attrs = ""
        if (!include.has(def.name)) {
            return
        }
        if (def.attributes) {
            for (const attr of def.attributes) {
                const fold = attr.name + "/" + def.name
                const foldThis =
                    folded.has(fold) || !include.has(attr.type.name)
                const multi = attr.multiple ? "[]" : ""
                const output = attr.modifiers.output ? " (out)" : ""

                // if this is linked do it that way
                const type = this.extractDefinitionGently(attr.type.name)
                if (!foldThis) {
                    if (attr.linked) {
                        links.push({
                            type: "resource",
                            from: def.short,
                            fromName: def.name,
                            to: attr.type.short,
                            toName: attr.type.name,
                            label: ` ${attr.name}${multi}${output}`
                        })
                        continue
                    }
                    if (type && type.type === "structure") {
                        links.push({
                            type: "structure",
                            from: def.short,
                            fromName: def.name,
                            to: attr.type.short,
                            toName: attr.type.name,
                            label: ` ${attr.name}${multi}${output}`
                        })
                        continue
                    }
                }

                attrs += `<tr><td align="left">${attr.name}: ${
                    attr.linked ? "linked " : ""
                }${attr.type.short}${multi}${output}</td></tr>`
            }
        }
        return attrs
    }

    private formOperations(def: IDefinition) {
        let ops = `<tr><td align="right"><font color="#0000ff" point-size="8">`
        if (def.singleton) {
            ops += "singleton "
        }
        if (def.future) {
            ops += "FUTURE "
        }
        if (def.operations || def.future || def.singleton) {
            for (const op of def.operations || []) {
                if (ops) {
                    ops += " "
                }
                ops += op.operation
                if (op.operation === "MULTIGET") {
                    for (const attr of def.attributes || []) {
                        ops += " " + attr.name
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
