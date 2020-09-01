# Server Blocks

Both the REST and event-level APIs require a set of server urls and protocols to be specified. E.g. in REST, APIs are typically presented at a URL like https://api.liveramp.com - server blocks are how you specify this.

To see how to specify the servers, look at the following example:

    servers {
        /REST
            server = "https://api.liveramp.com:{port:8080}"
                environment = PROD
        /events
            "Production Google Pubsub server"
            server = "http://pubsub.google.com"
                environment = PROD
                protocol = GOOGLE_PUBSUB
    }

This says that for the Swagger definition, use the "https://api.liveramp.com" URL with a port specified by the "port" variable. If the port variable is not found, use 8080. Similarly, it says that for the events / AsyncAPI spec, use "http://pubsub.google.com".

## Specifying variables and environment

You can pass variables to reslang using the --var option. You can also indicate which environment is to be used - by default the env is PROD.

    ./reslang /models/servers --vars port=1230,prefix=servers --env PROD

## Defaults

If you don't specify any servers, the following are included by default from ./src/library:

    // this is included by default if no other server block is found
    servers {
        /REST
            server = "https://api.liveramp.com"
                environment = PROD
        /events
            "Production Google Pubsub server"
            server = "https://pubsub.googleapis.com/v1/projects/liveramp-events-prod"
                environment = PROD
                protocol = GOOGLE_PUBSUB
    }

## Some notes

A few points are worth bearing in mind:

1. only the servers that match the chosen env will be included
2. the REST endpoints will have the main module appended. e.g. "https://api.liveramp.com:1230/servers"
3. the events endpoints will not have the main module appended - the module name is already present in the topic name
4. only a single events server can be present for a given env
