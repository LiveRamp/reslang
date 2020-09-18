
// defines the server blocks for both REST and eventing sides
// Here's how it works:

// - there are 2 types of servers - REST and EVENTS
// - each server entry starts with a URL. it can then specify an optional environment (default = TEST), and an optional protocol
// - variables can be specified in the URL - using the syntax {variable_name[:optional_default]}
// - the variables are taken from variables passed in through the command line switch: --var port=8020

servers = _ "servers" _ "{" _ rest:rest_servers? _ events:event_servers? _ "}" _ {
    return { category: "servers", rest: rest, events: events }
}

rest_servers = _ "/REST" _ servers:server+ {
    return servers
}

event_servers = _ "/events" _ servers:server+ {
    return servers
}

server = _ comment:description? _ "server" _ "=" _ url:url _ env:environment _ protocol: protocol? _ {
    return { comment: comment, url: url, environment: env, protocol: protocol }
}

url = "\"" name:[^\"]+ "\"" {
    return name.join("")
}

environment = "environment" _ "=" _ env:name {
    return env
}

protocol = "protocol" _ "=" _ protocol:name {
    return protocol
}
