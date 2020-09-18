import {
    isResourceLike,
    getAllAttributes,
    isEvent,
    getKeyAttributes,
    AnyKind,
    IResourceLike,
    isProduces,
    isConsumes,
    IReference
} from "./treetypes"
import { BaseGen } from "./genbase"
import { camelCase, snakeCase, getVersion } from "./names"
import { isPrimitiveType } from "./parse"
import { Verbs } from "./operations"

/**
 * generate asyncapi from the parsed representation
 */

// The more correct "publish OR subscribe" type was being fiddly,
// so I didn't bother for now.
interface IChannel {
    description: string
    publish?: IPublishOrSubscribe
    subscribe?: IPublishOrSubscribe
}

interface IPublishOrSubscribe {
    summary: string
    operationId: string
    message: {
        $ref: string
    }
}
interface IChannelMap {
    [name: string]: IChannel
}

export default class EventsGen extends BaseGen {
    public generate() {
        this.markGenerate()
        const messages: any = {}
        const schemas: any = {}
        const channels: IChannelMap = {}
        const headers: any = {}
        const asyncapi: any = {
            asyncapi: "2.0.0",
            info: {
                title: this.namespace.title,
                description: this.translateDoc(this.namespace.comment),
                version: this.namespace.version
            },
            servers: this.formServers(),
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
        const haveEvents = this.formMessages(messages)

        // model definitions
        const headerNames = this.formDefinitions(schemas)

        // lift the headers
        for (const name of headerNames) {
            this.liftToHeader(name, schemas, headers)
        }

        if (!haveEvents) {
            throw new Error("No events are listed in the specification")
        }
        return asyncapi
    }

    private formServers() {
        let assigned = false
        const servers: any = {}
        for (const ev of this.servers.events || []) {
            // only do 1 env, complain if there are others
            if (ev.environment === this.environment) {
                if (!assigned) {
                    servers[ev.environment] = {
                        url: ev.url,
                        protocol: ev.protocol,
                        description: this.translateDoc(ev.comment)
                    }
                    assigned = true
                } else {
                    throw new Error(
                        "Can only have 1 server for the specified environment"
                    )
                }
            }
        }
        return servers
    }

    private formChannels(channels: IChannelMap) {
        // handle each primary structure and work out if we should generate structures for it
        const produces = new Set<string>()
        const consumes = new Set<string>()
        const all = new Set<string>()
        for (const el of this.defs) {
            // don't generate for any imported def
            if (el.secondary) {
                continue
            }

            const unique = camelCase(this.formSingleUniqueName(el))
            if (isResourceLike(el) && !el.future && el.events) {
                channels[
                    "topics/" +
                        snakeCase(this.getSpace()) +
                        "." +
                        getVersion(el.name) +
                        "-" +
                        snakeCase(el.name) +
                        "-resource"
                ] = {
                    description:
                        this.translateDoc(el.comment) || "no documentation",
                    subscribe: {
                        summary: "REST: " + el.name,
                        operationId: el.name,
                        message: {
                            $ref: `#/components/messages/${unique}`
                        }
                    }
                }
            }
            if (isProduces(el)) {
                produces.add(el.event.name)
                all.add(el.event.name)
            }
            if (isConsumes(el)) {
                consumes.add(el.event.name)
                all.add(el.event.name)
            }
        }

        all.forEach((name) => {
            const def = this.extractDefinition(name)
            const unq = camelCase(this.formSingleUniqueName(def))
            const details: any = {
                description:
                    this.translateDoc(def.comment) || "no documentation"
            }
            const msg = {
                summary: "Adhoc: " + def.name,
                operationId: def.name,
                message: {
                    $ref: `#/components/messages/${unq}`
                }
            }
            if (produces.has(name)) {
                details.publish = msg
            }
            if (consumes.has(name)) {
                details.subscribe = msg
            }

            channels[
                "topics/" +
                    this.mainNamespace +
                    "." +
                    getVersion(def.name) +
                    "-" +
                    snakeCase(def.short)
            ] = details
        })
    }

    private addStandardHeaderDefinition(schemas: any, el: IResourceLike) {
        const name = camelCase(this.formSingleUniqueName(el)) + "Header"

        // form the array of event verbs
        const verbs: string[] = []
        for (const op of el.events || []) {
            verbs.push(op.operation)
        }

        schemas[name] = {
            type: "object",
            properties: {
                verb: {
                    description: "",
                    type: "string",
                    enum: verbs
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
        return name
    }

    private liftToHeader(name: string, schemas: any, headers: any) {
        const hdr = schemas[name]
        headers[name] = { headers: hdr }
    }

    private formMessages(messages: any) {
        // handle each primary structure and work out if we should generate structures for it
        let haveEvents = false
        const uniques = new Set<string>()
        for (const el of this.defs) {
            // don't generate for any imported def
            if (el.secondary) {
                continue
            }

            if (isResourceLike(el) && !el.future && el.events) {
                haveEvents = true
                const unique = camelCase(this.formSingleUniqueName(el))
                if (!uniques.has(unique)) {
                    messages[unique] = {
                        name: unique,
                        title: unique,
                        summary: this.translateDoc(el.comment),
                        contentType: "application/json",
                        traits: [
                            {
                                $ref: `#/components/messageTraits/${unique}Header`
                            }
                        ],
                        payload: {
                            $ref: `#/components/schemas/${unique}Output`
                        }
                    }
                    uniques.add(unique)
                }
            }
            if (isEvent(el) || isProduces(el) || isConsumes(el)) {
                haveEvents = true
                const unique = camelCase(this.formSingleUniqueName(el))
                if (!uniques.has(unique)) {
                    messages[unique] = {
                        name: unique,
                        title: unique,
                        summary: this.translateDoc(el.comment),
                        contentType: "application/json",
                        traits: [
                            {
                                $ref: `#/components/messageTraits/${unique}Header`
                            }
                        ],
                        payload: { $ref: `#/components/schemas/${unique}` }
                    }
                }
                uniques.add(unique)
            }
        }
        return haveEvents
    }

    private formDefinitions(schemas: any) {
        const headerNames: string[] = []
        for (const def of this.defs) {
            if (def.generateInput) {
                switch (def.kind) {
                    case "resource-like":
                        if (!def.secondary) {
                            const hdr = this.addStandardHeaderDefinition(
                                schemas,
                                def
                            )
                            headerNames.push(hdr)

                            this.addResourceDefinition(
                                schemas,
                                def,
                                Verbs.GET,
                                "Output"
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
                        headerNames.push(called)
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
        return headerNames // to lift up
    }

    /** determine if we should generate definitions for each entity */
    private markGenerate() {
        // handle each primary structure and work out if we should generate structures for it
        const visited = new Set<string>()
        for (const el of this.defs) {
            if (
                isResourceLike(el) ||
                isEvent(el) ||
                isProduces(el) ||
                isConsumes(el)
            ) {
                this.follow(el, visited, 0)
            }
        }
    }

    private follow(el: AnyKind, visited: Set<string>, level: number) {
        // have we seen this before?
        const unique = this.formSingleUniqueName(el)
        if (visited.has(unique)) {
            return
        }
        visited.add(unique)

        if (isResourceLike(el)) {
            if (el.future) {
                return
            }
            if (el.secondary && level === 0) {
                visited.delete(unique)
                return
            }
            if (!el.events && level === 0) {
                visited.delete(unique)
                return
            }
        } else if (isProduces(el) || isConsumes(el)) {
            const def = this.extractDefinition(el.event.name)
            visited.delete(unique)
            this.follow(def, visited, level + 1)
        }

        el.generateInput = true

        // now work out if attributes reference any structures or other resources
        for (const attr of getAllAttributes(el) || []) {
            if (!isPrimitiveType(attr.type.name)) {
                const def = this.extractDefinition(attr.type.name)
                if (def && !attr.inline && !attr.linked) {
                    this.follow(def, visited, level + 1)
                }
            }
        }
    }
}
