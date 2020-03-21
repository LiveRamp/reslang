
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
        kind: "event",
        type: "event",
        comment: comment, 
        name: name,
        header: header,
        payload: payload}
}

header = _ "/header" _ attrs:attributes+ _ {
    return attrs;
}

payload = _ "/payload" _ attrs:attributes+ _ {
    return attrs;
}
