import { isResourceLike, getAllAttributes, isEvent } from "./treetypes"
import { BaseGen, Verbs } from "./genbase"

/**
 * generate swagger from the parsed representation
 */

export default class EventsGen extends BaseGen {
    public generate() {
        this.markGenerate()
        const messages: any = {}
        const schemas: any = {}
        const channels: any = {}
        const asyncapi: object = {
            asyncapi: "2.0.0",
            info: {
                title: this.namespace.title,
                description: this.translateDoc(this.namespace.comment),
                version: this.namespace.version
            },
            servers: {
                production: {
                    url: "test.port:{port}",
                    protocol: "Google Cloud Pub/Sub",
                    description: "LiveRamp Production pubsub instance",
                    variables: {
                        port: {
                            description:
                                "Secure connection (TLS) is available through port 8883",
                            default: "1883",
                            enum: ["1883"]
                        }
                    }
                }
            },
            defaultContentType: "application/json",
            channels,
            components: {
                messages,
                schemas
            }
        }
        channels["com/test"] = {
            description:
                "The topic on which measured values may be produced and consumed.",
            publish: {
                summary:
                    "Receive information about environmental lighting conditions of a particular streetlight.",
                operationId: "receiveLightMeasurement",
                message: {
                    $ref: "#/components/messages/StartSignal"
                }
            }
        }
        messages.StartSignal = {
            name: "StartSignal",
            title: "StartSignal",
            contentType: "application/json",
            payload: { $ref: "#components/schemas/StartSignal" }
        }

        // model definitions
        this.formDefinitions(schemas)

        return asyncapi
    }

    private formDefinitions(definitions: any) {
        for (const def of this.defs) {
            if (def.generateInput) {
                switch (def.kind) {
                    case "resource-like":
                        if (!def.secondary) {
                            this.addResourceDefinition(
                                definitions,
                                def,
                                Verbs.GET,
                                ""
                            )
                        }
                        break
                    case "event":
                    case "structure":
                        this.addStructureDefinition(definitions, def, "")
                        break
                    case "union":
                        this.addUnionDefinition(definitions, def, "")
                        break
                    case "enum":
                        this.addEnumDefinition(definitions, def, "")
                        break
                }
            }
        }
    }

    /** determine if we should generate definitions for each entity */
    private markGenerate() {
        // handle each primary structure and work out if we should generate structures for it
        for (const el of this.defs) {
            // don't generate for any imported def
            if (el.secondary) {
                continue
            }

            let follow = false
            if (isResourceLike(el)) {
                if (el.future) {
                    continue
                }
                const events = this.extractOp(el, "EVENTS")
                if (events) {
                    el.generateInput = true
                    follow = true
                }
            }

            if (isEvent(el)) {
                el.generateInput = true
                follow = true
            }

            // now work out if attributes reference any structures or other resources
            if (follow) {
                for (const attr of getAllAttributes(el) || []) {
                    const def = this.extractDefinitionGently(attr.type.name)
                    if (def && !attr.inline && !attr.linked) {
                        def.generateInput = true
                    }
                }
            }
        }
    }
}
