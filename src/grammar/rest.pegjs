

// defining a resource
resource = _ comment:description? _ future:"future"? _ singleton:"singleton"? _ type:("configuration-resource" / "asset-resource" / "resource" / "request-resource") _ respath:noparentrespath _ "{" _
    attributes:attributes? _ subsections:operationsEventsAndRequestHeadersSubsections? _
"}" _ ";"? _ {
    return {
        category: "definition",
        kind: "resource-like",
        comment: comment, future: !!future, singleton: !!singleton, type: type,
        attributes: attributes, operations: subsections.ops, events: subsections.events,
        requestHeaders: subsections.requestHeaders,
        parents: [], short: respath.short}
}


subresource = _ comment:description? _ future:"future"? _ singleton:"singleton"? _ type:("subresource") _ respath:parentrespath _ "{" _
    attributes:attributes? _ subsections:operationsEventsAndRequestHeadersSubsections? _
"}" _ ";"? _ {
    return {
        category: "definition",
        kind: "resource-like",
        comment: comment, future: !!future, singleton: !!singleton, type: type,
        attributes: attributes, operations: subsections.ops, events: subsections.events,
        requestHeaders: subsections.requestHeaders,
        parents: respath.parents, short: respath.short}
}

action = _ comment:description? _ future:"future"? _ async:("sync"/"async") _ bulk:("bulk" / "resource-level")? _ "action" _ respath:parentrespath _ "{" _
    attributes:attributes? _ subsections:operationsEventsAndRequestHeadersSubsections? _
"}" _ ";"? _ {
    return {
        category: "definition",
        kind: "resource-like",
        comment: comment, future: !!future, singleton: false, type: "action", async: async == "async",
        attributes: attributes, operations: subsections.ops, events: subsections.events,
        requestHeaders: subsections.requestHeaders,
        parents: respath.parents, short: respath.short,
        bulk: bulk}
}

// operationsEventsAndRequestHeadersSubsections matches /events, /operations,
// and /request-headers subsections in any order. resource, subresource, and
// action definitions can all have these subsections. an expression cannot
// access labels set inside an sub-expression. instead, a `subsectionLabel`
// field was added to each subsection so that
// operationsEventsAndRequestHeadersSubsections can return an object keyed by
// subsection label
operationsEventsAndRequestHeadersSubsections =
    _ subsectionsWithLabels:(operations / events / requestHeaders )* {
        let subsections = {}
        subsectionsWithLabels.forEach((s) => {
            let l = s.subsectionLabel
            // this label isn't used in the swagger generation and doesn't need
            // to be clutter the parse tree
            delete s.subsectionLabel
            subsections[l] = s
        })
        return subsections
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

operation_description = "\"" _ summary:operation_summary? _ inner:(!"\"" i:. {return i} )* "\"" {
    var description = inner.join("").replace(/\\n/g, "\n")
    if (!summary) {
        summary = ""
    }
    return {
        "description": description,
        "summary": summary
    }
}

operation_summary = "Summary:" _ content:(!"\n" !"\"" i:. {return i})* "\n" "\s"* {
    return content.join("")
}

ops =
    _ comment:operation_description? _ op:(mainops / multiops) _ allOptions: options _ {
    if (!comment) {
        comment = {
            summary: ""
        }
    }
    return {
        operation: op,
        comment: comment.description,
        summary: comment.summary,
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

    According to RFC API-3, LiveRamp RESTful APIs should default to using
    cursor-based pagination for MULTIGET responses.

    While teams converge, Reslang remains backward compatible and continues
    to support offset pagination. To use offset pagination, specify
    `deprecated-offset-pagination` after a MULTIGET.

    Only certain pagination options are allowed:
        ["defaultLimit", "maxLimit", "after", "before", "total", "next", "previous"]

    All default to false, except "after". Example of a valid config:
        pagination {
            defaultLimit = 10
            after = true // same as not specifying it
            before = true
            next = true
            total = false   // a comment to enable this later
        }
*/

pagination = config: (cursorOptions / "deprecated-offset-pagination" / "no-pagination") {
  if (config === "deprecated-offset-pagination") {
    return { pagination: { strategy: "offset" } }
  }
  if (config === "no-pagination") {
    return { pagination: { strategy: "none" }}
  }
  else {
      return {
        pagination: {
            strategy: "cursor",
            options: config.pagination.options
        }
      }
    }
}

cursorOptions = _ "pagination" _ "{" _ options:(cursorOption / comment)+ "}" _ {
    return {
        pagination: {
            strategy: "cursor",
            options: options.filter(o => o.hasOwnProperty("name")) // filter out the comments
        }
    }
}

/*
  cursorOption
  ------------
    cursorOption is an object of the form { name, value }, but
    the `value` field is always a boolean or number.

    Normally, these will be booleans e.g. `total = true`, where `true` indicates
    that the field should be included in the API response.

    Some options, like `defaultLimit` and `maxLimit`, require numbers to
    be specified, as opposed to booleans.
*/

cursorOption = _ name:[a-zA-Z_\-]+ _ "=" _ value:(bool / number) _ comment? _ {
    return {name: name.join(""), value }
}

bool = b: ("true" / "false") {
  return b === "true"
}

httpHeader = _ comment:description? _ type:("http-header")  _ name:name  _ "{" _
    "name:" _ headerName:[a-zA-Z0-9\-]+ _
"}" _ ";"? _ {
    return {category: "definition", kind: type, "type": type, parents: [], "short": name, "comment": comment, "headerName": headerName.join("")}
}
