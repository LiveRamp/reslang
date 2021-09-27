
// defines the server blocks for both REST and eventing sides
// Here's how it works:

// - there are 2 types of servers - REST and EVENTS
// - each server entry starts with a URL, an environment name, and an optional protocol
// - during swagger generation runtime, a default PROD server will be added and used
//   (see src/library/servers.reslang & LOCAL_SERVERS_INCLUDE in src/genbase.ts & args.env in src/main.ts)
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
