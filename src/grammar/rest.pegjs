

// defining a resource
resource = _ comment:description? _ future:"future"? _ singleton:"singleton"? _ type:("configuration-resource" / "asset-resource" / "resource" / "request-resource") _ respath:noparentrespath _ "{" _
    attributes:attributes? _ resourceSubsections:resourceDefinitionSubsections? _
"}" _ ";"? _ {
    return {
        category: "definition",
        kind: "resource-like",
        comment: comment, future: !!future, singleton: !!singleton, type: type,
        attributes: attributes, operations: resourceSubsections.ops, events: resourceSubsections.events,
        requestHeaders: resourceSubsections.requestHeaders,
        parents: [], short: respath.short}
}

// resourceDefinitionSubsections matches the subsections of resource
// definitions (e.g. /events, /operations, /request-headers), in any order. an
// expression cannot access labels set inside an sub-expression. instead, a
// `subsectionLabel` field was added to each subsection so that
// resourceDefinitionSubsections can return an object keyed by subsection label
resourceDefinitionSubsections =
    _ subsectionsWithLabels:(operations / events / requestHeaders )* {
        let subsections = {}
        subsectionsWithLabels.forEach((s) => {
            let l = s.subsectionLabel
            delete s.subsectionLabel
            subsections[l] = s
        })
        return subsections
    }


subresource = _ comment:description? _ future:"future"? _ singleton:"singleton"? _ type:("subresource") _ respath:parentrespath _ "{" _
    attributes:attributes? _ operations:operations? _ events:events? _
"}" _ ";"? _ {
    return {
        category: "definition",
        kind: "resource-like",
        comment: comment, future: !!future, singleton: !!singleton, type: type,
        attributes: attributes, operations: operations, events,
        parents: respath.parents, short: respath.short}
}

action = _ comment:description? _ future:"future"? _ async:("sync"/"async") _ bulk:("bulk" / "resource-level")? _ "action" _ respath:parentrespath _ "{" _
    attributes:attributes? _ operations:operations? _ events:events? _
"}" _ ";"? _ {
    return {
        category: "definition",
        kind: "resource-like",
        comment: comment, future: !!future, singleton: false, type: "action", async: async == "async",
        attributes: attributes, operations: operations, events,
        parents: respath.parents, short: respath.short,
        bulk: bulk}
}

operations = _ "/operations" _ ops:operation+ _ {
    ops.subsectionLabel = "ops"
    return ops
}

operation = _ operation:ops _ errors: errors* _ ";"? _ {
    operation.errors = errors;
    return operation
}

events = _ "/events" _ ops:eventops+ _ {
    ops.subsectionLabel = "events"
    return ops
}

// requestHeaders matches a subsection of resource definitions that is to be
// used for specifying which HTTP verbs ("operations" in Reslang parlance)
// require http headers on requests. Http headers defined in an `http-header`
// Reslang definition can be added to requests by specifying an operation, or
// "*" followed by the name of an http-header definition. For example,
//
//    /request-headers
//      *    myCoolHeader
//      POST myPostHeader
//
// will add myCoolHeader header to all of the resource's operations and add
// myPostHeader for POST requests.
requestHeaders = _ "/request-headers" _ operationsAndHeaders:operationOrWildcardAndHeaderDefName* _ {
    operationsAndHeaders.subsectionLabel = "requestHeaders"
    return operationsAndHeaders
}

// operationOrWildcardAndHeaderDefName matches one operation + http-header definition
// name pair. these pairs comprise the contents of the /request-headers section.
operationOrWildcardAndHeaderDefName = opOrWildcard:(oplist / "*" ) _ httpHeaderDefName:name _ {
    return {opOrWildcard: opOrWildcard, httpHeaderDefName: httpHeaderDefName}
}

errors = _ codes:errorcode+ _ struct:ref _ {
    return {codes: codes, "struct": struct}
}
errorcode = _ comment:description? _ code:[0-9]+ {
    return {"code": code.join(""), "comment": comment}
}

ops = _ comment:description? _ op:(mainops / multiops) _ options:options _ {return {"operation": op, "comment": comment, "options": options}}
eventops = _ comment:description? _ op:(mainops / ([a-z_]+[_a-z0-9]*)) _ {return {"operation": Array.isArray(op) ? op.flat().join("") : op, "comment": comment}}
oplist = op:("GET" / "MULTIGET" / "PUT" / "MULTIPUT" / "PATCH" / "MULTIPATCH" / "POST" / "MULTIPOST" / "DELETE"/ "MULTIDELETE") {
    return op
}
mainops = op:("GET" / "PUT" / "PATCH" / "POST" / "DELETE") {
    return op
}
multiops = op:("MULTIGET" / "MULTIPUT" / "MULTIPATCH" / "MULTIPOST" / "MULTIDELETE") {
    return op
}
options = options:option* {
    return options
}
option = _ name:[a-z_\-]+ _ "=" _ value:[a-zA-Z0-9_\-]+ _ {
    return {name: name.join(""), value: value.join("")}
}

ids "ids" = ids:id+ {return ids}
id "id" = _ name:name _ ","? _ {return name}

httpHeader = _ comment:description? _ type:("http-header")  _ name:name  _ "{" _
    "name:" _ headerName:[a-zA-Z0-9\-]+ _
"}" _ ";"? _ {
    return {category: "definition", kind: type, "type": type, parents: [], "short": name, "comment": comment, "headerName": headerName.join("")}
}
