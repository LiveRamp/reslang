
// "This is published when a segment delivery occurs"
// event SegmentDelivery {
//   /attributes
//     correlation: long
//   /payload
//     test: string optional min-length:10 max-length:30
// }


// defining an event
event = _ comment:description? _ "event" _ name:resname _ "{" _
    header:header? _ payload:payload? _
"}" _ ";"? _ {

    return {
        category: "definition",
        kind: "event",
        type: "event",
        comment: comment,
        parents: [],
        short: name,
        header: header,
        payload: payload}
}

header = _ "/header" _ attrs:attributes+ _ {
    return attrs[0];
}

payload = _ "/payload" _ attrs:attributes+ _ {
    return attrs[0];
}


produces = _ "produces" _ name:ref {
    return {
        category: "definition",
        kind: "produces",
        type: "produces",
        parents: [],
        short: "",
        event: name
    }
}

consumes = _ "consumes" _ name:ref {
    return {
        category: "definition",
        kind: "consumes",
        type: "consumes",
        parents: [],
        short: "",
        event: name
    }
}
