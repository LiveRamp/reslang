import {
    isResourceLike,
    getAllAttributes,
    isEvent,
    getKeyAttributes
} from "./treetypes"
import { BaseGen, Verbs } from "./genbase"
import { camelCase, snakeCase, getVersion } from "./names"

/**
 * generate swagger from the parsed representation
 */

export default class EventsGen extends BaseGen {
    public generate() {
        this.markGenerate()
        const messages: any = {}
        const schemas: any = {}
        const channels: any = {}
        const headers: any = {}
        const asyncapi: object = {
            asyncapi: "2.0.0",
            info: {
                title: this.namespace.title,
                description: this.translateDoc(this.namespace.comment),
                version: this.namespace.version
            },
            servers: {
                production: {
                    url: "pubsub.liveramp.com:{port}",
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
                schemas,
                messageTraits: headers
            }
        }

        // form channels
        this.formChannels(channels)

        // form messages
        this.formMessages(messages)

        // model definitions
        const headerNames = this.formDefinitions(schemas)

        // add standard header definitions - tbd move this to a file
        this.addStandardHeaderDefinitions(headers, schemas)

        // lift the headers
        for (const name of headerNames) {
            this.liftToHeader(name, schemas, headers)
        }

        return asyncapi
    }

    private formChannels(channels: any) {
        // handle each primary structure and work out if we should generate structures for it
        for (const el of this.defs) {
            // don't generate for any imported def
            if (el.secondary) {
                continue
            }

            const unique = camelCase(this.formSingleUniqueName(el))
            if (
                isResourceLike(el) &&
                !el.future &&
                this.extractOp(el, "EVENTS")
            ) {
                channels[
                    "rest-" +
                        this.mainNamespace +
                        "-" +
                        getVersion(el.name) +
                        "-" +
                        snakeCase(el.name)
                ] = {
                    description: el.comment,
                    publish: {
                        summary: "REST: " + el.comment,
                        operationId: el.name,
                        message: {
                            $ref: `#/components/messages/${unique}`
                        }
                    }
                }
            }
            if (isEvent(el)) {
                channels[
                    "adhoc-" +
                        this.mainNamespace +
                        "-" +
                        getVersion(el.name) +
                        "-" +
                        snakeCase(el.name)
                ] = {
                    description: el.comment,
                    publish: {
                        summary: el.comment,
                        operationId: el.name,
                        message: {
                            $ref: `#/components/messages/${unique}`
                        }
                    }
                }
            }
        }
    }

    private addStandardHeaderDefinitions(headers: any, schemas: any) {
        headers.RestHeader = {
            headers: {
                type: "object",
                properties: {
                    verb: {
                        description: "",
                        $ref: "#/components/schemas/VerbEnum"
                    },
                    location: {
                        description: "",
                        type: "string",
                        format: "url",
                        example: "https://www.domain.com (url)"
                    },
                    ids: {
                        description: "",
                        items: {
                            type: "string"
                        },
                        type: "array"
                    }
                },
                required: ["verb", "location", "ids"]
            }
        }
        schemas.VerbEnum = {
            type: "string",
            enum: ["POST", "PUT", "PATCH", "GET", "MULTIGET", "DELETE"]
        }
    }

    private liftToHeader(name: string, schemas: any, headers: any) {
        const hdr = schemas[name]
        headers[name] = { headers: hdr }
    }

    private formMessages(messages: any) {
        // handle each primary structure and work out if we should generate structures for it
        for (const el of this.defs) {
            // don't generate for any imported def
            if (el.secondary) {
                continue
            }

            if (
                isResourceLike(el) &&
                !el.future &&
                this.extractOp(el, "EVENTS")
            ) {
                const unique = camelCase(this.formSingleUniqueName(el))
                messages[unique] = {
                    name: unique,
                    title: unique,
                    summary: el.comment,
                    contentType: "application/json",
                    traits: [{ $ref: `#/components/messageTraits/RestHeader` }],
                    payload: { $ref: `#/components/schemas/${unique}` }
                }
            }
            if (isEvent(el)) {
                const unique = camelCase(this.formSingleUniqueName(el))
                messages[unique] = {
                    name: unique,
                    title: unique,
                    summary: el.comment,
                    contentType: "application/json",
                    traits: [
                        { $ref: `#/components/messageTraits/${unique}Header` }
                    ],
                    payload: { $ref: `#/components/schemas/${unique}` }
                }
            }
        }
    }

    private formDefinitions(schemas: any) {
        const headers: string[] = []
        for (const def of this.defs) {
            if (def.generateInput) {
                switch (def.kind) {
                    case "resource-like":
                        if (!def.secondary) {
                            this.addResourceDefinition(
                                schemas,
                                def,
                                Verbs.GET,
                                ""
                            )
                        }
                        break
                    case "event":
                        // add the header and the payload
                        const called = this.addStructureDefinition(
                            schemas,
                            def,
                            "Header",
                            def.header || []
                        )
                        headers.push(called)
                        this.addStructureDefinition(
                            schemas,
                            def,
                            "",
                            getKeyAttributes(def)
                        )
                        break
                    case "structure":
                        this.addStructureDefinition(
                            schemas,
                            def,
                            "",
                            getKeyAttributes(def)
                        )
                        break
                    case "union":
                        this.addUnionDefinition(schemas, def, "")
                        break
                    case "enum":
                        this.addEnumDefinition(schemas, def, "")
                        break
                }
            }
        }
        return headers // to lift up
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
