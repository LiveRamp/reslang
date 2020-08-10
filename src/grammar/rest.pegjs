

// defining a resource
resource = _ comment:description? _ future:"future"? _ singleton:"singleton"? _ type:("configuration-resource" / "asset-resource" / "resource" / "request-resource") _ respath:noparentrespath _ "{" _
    attributes:attributes? _ operations:operations? _ events:events? _
"}" _ ";"? _ {
    return {
        kind: "resource-like",
        comment: comment, future: !!future, singleton: !!singleton, type: type, 
        attributes: attributes, operations: operations, events,
        parents: [], short: respath.short}
}

subresource = _ comment:description? _ future:"future"? _ singleton:"singleton"? _ type:("subresource") _ respath:parentrespath _ "{" _
    attributes:attributes? _ operations:operations? _ events:events? _
"}" _ ";"? _ {
    return {
        kind: "resource-like",
        comment: comment, future: !!future, singleton: !!singleton, type: type, 
        attributes: attributes, operations: operations, events,
        parents: respath.parents, short: respath.short}
}

action = _ comment:description? _ future:"future"? _ async:("sync"/"async") _ bulk:("bulk" / "resource-level")? _ "action" _ respath:parentrespath _ "{" _
    attributes:attributes? _ operations:operations? _ events:events? _
"}" _ ";"? _ {
    return {
        kind: "resource-like",
        comment: comment, future: !!future, singleton: false, type: "action", async: async == "async", 
        attributes: attributes, operations: operations, events,
        parents: respath.parents, short: respath.short,
        bulk: bulk}
}

operations = _ "/operations" _ ops:operation+ _ {
    return ops;
}

operation = _ operation:ops _ errors: errors* _ ";"? _ {
    operation.errors = errors;
    return operation
}

events = _ "/events" _ ops:eventops+ _ {
    return ops;
}

errors = _ codes:errorcode+ _ struct:ref _ {
    return {codes: codes, "struct": struct}
}
errorcode = _ comment:description? _ code:[0-9]+ {
    return {"code": code.join(""), "comment": comment}
}

ops = _ comment:description? _ op:("GET" / "PUT" / "PATCH" / "POST" / "DELETE"/ "MULTIGET") _ {return {"operation": op, "comment": comment}}
eventops = _ comment:description? _ op:("GET" / "PUT" / "PATCH" / "POST" / "DELETE"/ "MULTIGET" / ([a-z_]+[_a-z0-9]*)) _ {return {"operation": Array.isArray(op) ? op.flat().join("") : op, "comment": comment}}
ids "ids" = ids:id+ {return ids}
id "id" = _ name:name _ ","? _ {return name}




