# MULTI-verbs

REST verbs such as POST, PUT, PATCH, GET and DELETE also have counterparts in Reslang that allow for multiple resources to be created or amended in 1 call.

e.g.

    resource Person {
        id: uuid
        name: string mutable
        address: string mutable

        /operations
          GET PUT PATCH DELETE  // the standard verbs
            MULTIPOST MULTIGET MULTIPUT MULTIPATCH MULTIDELETE // the multi-verbs
    }

For example, a MULTIPOST will allow an array of {name, address} structures to be sent in the request, and it will return an array of {id,http status} objects in response. The response code will be 207 - for multistatus.

## No POST and MULTIPOST together

POST and MULTIPOST cannot be specified together because they occupy the same URL. You must choose one or the other.

The same restrictions do not apply to any of the other MULTI-verbs. You can have PATCH and MULTIPATCH together, for instance.

## Events and MULTI-verbs

You cannot event on MULTI-verbs, because it would break the rule about a single event schema for each resource. Instead, event on the single verbs.

E.g.


    resource Person {
        id: uuid
        name: string mutable
        address: string mutable

        /operations
          GET PUT PATCH DELETE
            MULTIPOST MULTIGET MULTIPUT MULTIPATCH MULTIDELETE
        /events
          POST GET PUT PATCH DELETE
    }