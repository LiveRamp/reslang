import SwagGen from "./genswagger"
import { isResourceLike, isUnion, isStructure, isEnum } from "./treetypes"

/**
 * generate jsonschema from the parsed representation
 */

export default class JsonSchemaGen extends SwagGen {
    // the root for generation
    public root: string = ""
    public followResources: boolean = false

    public generate() {
        this.markGenerate(true)

        const schemas: { [name: string]: any } = {}
        const schema: any = {
            $id: "https://schemas.liveramp.com/" + this.root.toLowerCase(),
            $schema: "http://json-schema.org/draft-07/schema#"
        }

        // model definitions
        this.formDefinitions(schemas)

        // now pull up the root definition
        if (this.root !== "noroot") {
            const rootDef = schemas[this.root]
            if (!rootDef) {
                throw new Error(
                    "Cannot find root definition for JSON schema: " + this.root
                )
            }
            // move description higher
            schema.description = rootDef.description

            // move over subparts
            for (const key in rootDef) {
                if (rootDef.hasOwnProperty(key) && key !== "description") {
                    schema[key] = rootDef[key]
                }
            }
            delete schemas[this.root]
        }

        // move over the subdefinitions
        if (Object.keys(schemas).length) {
            schema.definitions = schemas
        }

        return schema
    }

    // tslint:disable-next-line: member-ordering
    public static generateSchemaAndStringify(jsonSchema: JsonSchemaGen) {
        const schema = jsonSchema.generate()
        // turn into a json string and repoint for the different definition locations
        const json = JSON.stringify(schema, null, 2).replace(
            /\#\/components\/schemas/gm,
            "#/definitions"
        )
        return json
    }

    // tslint:disable-next-line: member-ordering
    protected markGenerate(includeErrors: boolean) {
        // handle each primary structure and work out if we should generate structures for it
        const visited = new Set<string>()
        if (this.followResources) {
            for (const el of this.defs) {
                if (isResourceLike(el)) {
                    this.follow(el, visited, includeErrors, 0)
                }
            }
            // mark the standarderror as included - it is referenced implicitly by some operations
            this.extractDefinition("StandardError").generateInput = true
        } else if (this.root !== "noroot") {
            // only follow a single definition
            for (const el of this.defs) {
                if (el.name === this.root) {
                    this.follow(el, visited, includeErrors, 0)
                }
            }
        } else {
            // include every struct, union, enum
            for (const el of this.defs) {
                if (isStructure(el) || isUnion(el) || isEnum(el)) {
                    if (el.name !== "StandardError") {
                        el.generateInput = true
                    }
                }
            }
        }
    }
}
