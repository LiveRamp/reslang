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
import { camelCase, kebabCase, getVersion } from "./names"
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
                const topic = this.topicOfRestResource(el);
                const channel = this.eventChannelForRestResource(el, unique);
                channels[topic] = channel
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
            const topic = this.topicOfAdhocEvent(def);
            const channel = this.eventChannelForAdhocDefinition(def, name, produces, consumes);
            channels[topic] = channel
        })
    }

    private topicOfAdhocEvent(def: IReference) {
        let ns = kebabCase(this.getSpace());
        let version = getVersion(def.name);
        let name = kebabCase(def.short);
        return this.toEventTopic(ns, version, name);
    }

    private eventChannelForAdhocDefinition(def: AnyKind, name: string, produces: Set<string>, consumes: Set<string>) {
        const unq = camelCase(this.formSingleUniqueName(def))
        const channel: any = {
            description:
                this.translateDoc(def.comment) || "no documentation"
        }
        const operationBody = {
            summary: "Adhoc: " + def.name,
            operationId: def.name,
            message: {
                $ref: `#/components/messages/${unq}`
            }
        }
        if (produces.has(name)) {
            channel.publish = operationBody
        }
        if (consumes.has(name)) {
            channel.subscribe = operationBody
        }
        return channel;
    }

    private topicOfRestResource(el: IReference) {
        let ns = kebabCase(this.getSpace());
        let version = getVersion(el.name);
        let name = kebabCase(el.name);
        return this.toEventTopic(ns, version, name);
    }

    private eventChannelForRestResource(el: IResourceLike, unique: string) {
        const channelDescription = this.translateDoc(el.comment) || "no documentation";
        const subscribeOpDescription = el.events
            ?.map(e => this.translateDoc(e.comment))
            .filter(d => !!d)
            .join("\n\n") ?? ""
        let channelForRestResource = {
            description: channelDescription,
            subscribe: {
                summary: "REST: " + el.name,
                description: subscribeOpDescription != "" ? subscribeOpDescription : null,
                operationId: el.name,
                message: {
                    $ref: `#/components/messages/${unique}`
                }
            }
        };
        return channelForRestResource;
    }

    private toEventTopic(ns: string, version: string, name: string) {
        const basic = `${ns}_${version}-${name}`;
        const escaped = basic.replace(/[^a-zA-Z0-9_-]/, "_");
        const prefixed = "topics/" + escaped;
        return prefixed
    }

    private addStandardHeaderDefinition(schemas: any, el: IResourceLike) {
        const name = camelCase(this.formSingleUniqueName(el)) + "Header"
        const verb = this.buildVerbProperty(el);

        schemas[name] = {
            type: "object",
            properties: {
                verb: verb,
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

    public buildVerbProperty(el: IResourceLike) {
        const verbs: string[] = []
        for (const op of el.events || []) {
            verbs.push(op.operation)
        }
        return verbs.length > 0 ? {
            description: "",
            type: "string",
            "enum": verbs
        } : {
            description: "",
            type: "string",
        };
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
