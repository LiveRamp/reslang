

// defining a resource
resource = _ comment:description? _ future:"future"? _ singleton:"singleton"? _ type:("configuration-resource" / "asset-resource" / "resource" / "request-resource") _ respath:noparentrespath _ "{" _
    attributes:attributes? _ operations:operations? _ events:events? _
"}" _ ";"? _ {
    return {
        category: "definition",
        kind: "resource-like",
        comment: comment, future: !!future, singleton: !!singleton, type: type, 
        attributes: attributes, operations: operations, events,
        parents: [], short: respath.short}
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

ops =
    _ comment:description? _ op:(mainops / multiops) _ allOptions: options _ {
    return {
        operation: op,
        comment: comment,
        options: allOptions.standard,
        pagination: allOptions.pagination
    }
}

eventops = _ comment:description? _ op:(mainops / ([a-z_]+[_a-z0-9]*)) _ {
    return {
        operation: Array.isArray(op) ? op.flat().join("") : op,
        comment: comment
    }
}

oplist = op:("GET" / "MULTIGET" / "PUT" / "MULTIPUT" / "PATCH" / "MULTIPATCH" / "POST" / "MULTIPOST" / "DELETE"/ "MULTIDELETE") {
    return op
}
mainops = op:("GET" / "PUT" / "PATCH" / "POST" / "DELETE") {
    return op
}
multiops = op:("MULTIGET" / "MULTIPUT" / "MULTIPATCH" / "MULTIPOST" / "MULTIDELETE") {
    return op
}

/*
    Verb options
    ------------

    Options represent modifiers to resource verbs (GET, PUT, ...).

    For example, in this code:
    ```
        /operations
            GET foo=bar
    ```
    foo=bar is parsed as { name: "foo", value: "bar" } and is a
    standard option to "GET".

    Besides simple key=val options, certain verbs can be modified
    using pagination (see the pagination rule for details).

    If more verb options are introduced to this grammar, they should be included
    in this "options" rule.
*/
options = arr:(option / pagination)* {
    let standard = arr.filter(o => !o.pagination)
    let pagination = arr.find(o => o.pagination) || {}
    return {
        standard,
        ...pagination,    // Splat because `pagination` itself has the form `{ pagination: [] }`
    }
}

option = _ name:[a-z_\-]+ _ "=" _ value:[a-zA-Z0-9_\-]+ _ {
    return {name: name.join(""), value: value.join("")}
}

ids "ids" = ids:id+ {return ids}
id "id" = _ name:name _ ","? _ {return name}


/*
    Pagination configuration
    ------------------------

    According to RFC-3, LiveRamp RESTful APIs should default to using
    cursor-based pagination for MULTIGET responses.

    While teams converge, Reslang remains backward compatible and continues
    to support offset pagination. To use offset pagination, specify
    `pagination { strategy = offset }` after a MULTIGET.

    Only certain pagination options are allowed:
        ["after", "before", "total", "next", "previous"]

    Example of a valid config:
        pagination {
            strategy = cursor
            after = string
            before = string
            total = integer
        }
*/
pagination = _ "pagination" _ "{" _ options:option+ "}" _ {
    return {
        pagination: options
    }
}
