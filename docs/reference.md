# Reference Manual

The reslang grammar is fully described by these [railroad diagrams](./bnf/railroad-for-reslang.pdf).

Note that we will draw heavily on the example specified [here](../models/direct2dist). This demo namespace models the complete Direct2Dist specification, which allows ids to be sent directly to a destination. This is explained in more detail [here](./direct2dist-explanation.md).

## Namespaces

The API is divided up into different namespaces. e.g. /distribution/...

Each namespace lives in a separate directory, which can contain many .reslang files. The name of the namespace is simply the name of the directory.

You must have one namespace declaration per directory. Use the "namespace" keyword to indicate the title and version of an API. It can live inside any reslang file.

```
"API for accessing LiveRamp's Direct to Distribution Service"
namespace distribution/direct2dist {
  title "Direct to Distribution API - BETA "
  version 0.0.1
}
```

If you don't specify a namespace name (e.g. distribution/direct2dist), then Reslang will use the folder name.

### Resource types

Relang is designed to make you think in terms of resources. There are 2 different resource types in Reslang:

-   a **resource** describes a noun in the system.
-   a **request-resource** is an asynchronous, long running process modeled as a resource.

Each resource specifies the attributes it holds, followed by the possible operations / verbs.

Each resource type can have any level of subresources. The depth is limited by a configuration parameter, and is currently limited to a single level. Resources can also have actions, representing either synchronous or asynchronous operations.

You can use the "singleton" keyword before a resource or subresource definition to indicate there is only 1 instance of this resource.

### Primitive Types

The following primitive types are available. These are translated into appropriate Swagger types - in some cases (datetime etc) the primitive type is translated into a string type because Swagger has no notion of time-based values. If a translation occurs, then an appropriate comment / example text will be inserted as documentation

| Type     | Description                                                                   |
| -------- | ----------------------------------------------------------------------------- |
| int      | 32-bit integer                                                                |
| long     | 64-bit integer                                                                |
| string   | Standard string                                                               |
| double   | Double floating point                                                         |
| boolean  | True or false                                                                 |
| date     | Date in ISO8601 format (e.g. 2019-04-13)                                      |
| time     | Time in ISO8601 format (e.g. 22:00:01)                                        |
| datetime | Date+time in ISO8601 format, always with timezone<br />(2019-04-13T03:35:34Z) |
| duration | Duration in IS08601 format (e.g. P3Y6M4DT12H30M5S)                            |
| url      | A URL                                                                         |
| uuid     | A string UUID (e.g. "123e4567-e89b-12d3-a456-426655440000")                   |

### Versioning

Granular versioning is possible on toplevel resources and other elements such as structures. By default all definitions are v1 if not specified. However, we can place another version at the front to indicate a breaking change in the resource e.g. v2/resource.

Note that this can also inherit from the v1 resource. We do not need more than the major version in the semver, as the assumption is that if you introduce minor changes in a resource it will be backwards compatible.

Also note that it is perfectly possible to support multiple major versions of a resource in a single API.

An example of evolution is contained in the models/upversion directory:

```upversioning example
resource v2/ResourceB {
  id: int
  totalSize: int

  /operations
    POST GET
}

subresource v2/ResourceB::Sub {
  id: int
  name: string

  /operations
    POST GET
}
```

Note that versioning is not possible (or necessary) for subresources

### Imports & References

You can import a peer directory into your current .reslang file using `import otherdirectory`. Since the directory must be a peer to the current working directory, slashes are not allowed in the import path. You should then refer to the imported elements by their full name `othernamespace.Resource`.

```
import identity

asset-resource Test {
  poolId: linked identity.IdentityPool
  ... }
```

Note that the full syntax to refer to subresources / actions is: `namespace.toplevelresource::subresource::subresource` etc
You can omit namespace if the subresource is in the current namespace.

### Id

Every resource or subresource that can be retrieved by a GET needs to define an id field. This is the primary identifier for that resource, and it can be of any type.

You do not require id if you do not have a GET, PUT, PATCH or DELETE operation, or if the resource is a singleton.

### Error Codes and Responses

You can specify a set of error codes and bodies after each operation. The following example shows a response for 404, 405 and 403 error codes.

```Error code example
resource FileType {
	id: string
	type: string query
	format: string
	specId: linked Specification
	/operations
		"Get a FileType"
		GET
			"Not Allowed" 405
				StandardError
			"Forbidden" 403
				SpecialError
		POST
		MULTIGET
}
```

Note that the standard set of response codes specified in RFC API-3 are automatically generated for you. E.g. a 201 on a POST, a 404 on a GET/PUT/PATCH/DELETE.

StandardError is an internally defined structure that should be used for most errors. SpecialError above shows that you can also define your own error bodies as structures.

### Future Resources

It's common, when defining an API, to want to refer to resources that haven't yet been created. The "future" keyword allows you to define a theoretical resource, which will generate no Swagger. The purpose of this is so you can do a "linked" reference to it, in the expectation that you will add the full resource in the future.

```Future resource
future resource Specification {
	id: string
}
```

### Events

Reslang can also describe events. These fall into 2 categories - events related to a REST resource's lifecycle, and adhoc events.

To generate the first, use the /events section:

    "This models a file in a directory"
    subresource Directory::File {
        id: int
        name: string
        url: string
        fileTypeId: linked FileType

        contents: string queryonly

        /operations
            GET POST MULTIGET DELETE
        /events
	    POST GET DELETE
    }

To specify an adhoc event, use the "event" construct and let Reslang know if it's generated or consumed by your API:

    event DirectoryDeleteIncomplete {
        /header
    	    timeOfFailure: datetime
        /payload
    	    directory: linked Directory
    	    corrupted: boolean
    }

    event DirectoryNotification {
        /header
    	    when: datetime
        /payload
    	    directory: linked Directory
    }

    produces DirectoryDeleteIncomplete
    consumes DirectoryNotification

To generate & view the AsyncAPI specification for your API, use something like:

    ./reslang ./models/file --open --events

This will copy the AsyncAPI spec to the clipboard and open up the browser on the AsyncAPI playground. Paste the spec into the left hand text editor to see your events.

### Links & Values

To refer to one resource from another, used the "linked" keyword in front of the attribute type. The attribute must end in "Id" or "Ids"

```
    destinationEndpointId: linked Destination::Endpoint
```

Note that to link to a subresource, you use the parent::child syntax.

A link to a toplevel resource is just an "id". A link to a subresource is an array of [parentIds..., resourceId]. Note that to link to a subresource requires that all parent resources share the same id type. If one has an "int" and another parent has a "string" id type, then linking will fail with an error

If, rather than a link you'd prefer the full value of the resource, then use "value-of" instead:

```
    destinationEndpoint: value-of Destination::Endpoint
```

### Structures

You can define as reusable set of attributes using the "structure" keyword.

```

structure MappingInputKey {
  key: int
  value: int
}

```

### Arrays

Use [] after an attribute type to indicate an array. You can also represent a minimum and maximum number of items via [minItems..maxItems]. You can omit the minItems, or maxItems.

```test

    dataMappingConfigs: DataMappingConfig[]
    name: string[..10]
```

### Enums

You can define a set of literals using the "enum" keyword.

```

enum StatusEnum {
  QUEUED
  IN_PROGRESS
  COMPLETED
  FAILED
  CANCELLED
}

```

Note that the literals can include the lowercase, colons, numbers etc.

### 2 types of comments

// && /\* \*/ comments are developer only comments. A comment using quotes ("this is a comment") will get transferred to the Swagger description field of the element it appears before.

### Multiget

A multi-GET is a GET on the plural resource, returning a collection of resources. The filter parameters can be specified by placing a "query" modifier after the type, or "queryonly" after the type if the parameter is not an attribute also.

```

      "Sort key and order. See docs: DistMVP.sort"
    sort: SortTypeEnum queryonly
	/operations
	  MULTIGET

```

### Representation parameters

A representation parameter is used to adjust how much detail is returned on a GET or MULTIGET.

E.g.

    resource Car {
        id: uuid
        view: DetailEnum representation
        standardInfo: StandardDetails
        detailedInfo: FullDetails output optional
        /operations
            GET POST MULTIGET
    }

    enum DetailEnum { STANDARD DETAILS }

View will turn into a query parameter on both GET and MULTIGET.

## Attribute Modifiers

The underlying intuition is that you mark fields as "mutable" if you want to be able to change them with PUT or PATCH, and you can mark something as output only by using "output". You can then mark them as optional by using "optional" or "optional-post" etc for specific verbs. PATCH always has every field as optional.

The following modifiers can be placed after the attribute type to indicate that it should be included for the given verbs:

-   no modifier
    -   The default is that the field is included for POST and GET
-   mutable
    -   The field is included also for PUT and PATCH
-   output
    -   The field is only included for GET
-   flag
    -   The field is included for GET, MULTIGET, PUT and PATCH. It's basically a flag that you can set after creation. It can be marked as optional.

Note that "id" is treated as "output" implicitly.

The following modifiers can be placed after the attribute type to indicate optionality:

-   no modifier
    -   The default is that the attribute is always required when included in a verb
-   optional
    -   Mark the attribute as always optional when included in a verb
-   optional-post, optional-put, optional-get
    -   Mark the attribute as optional when included in that specific verb

Note that attributes included in PATCH are _always_ optional.

Here is a simple example:

    resource Car {
        id: string
        make: string
        nitro: string mutable optional-post
        created: datetime output
        location: string mutable optional-put
    /operations
        GET POST PUT PATCH
    }

This results in the following fields:

-   POST required=make and location, optional=nitro
-   PUT required=nitro, optional=location
-   PATCH optional=nitro and location
-   GET required=id, make, nitro, created, location

## Attribute examples

You can specify (or override) the example / format string of any type. For instance, the following will override the usual url format:

    location: url "https://gcs.google.com <- put files here!"

## Default values for attributes

You can specify a default value for any attribute, and that will be inserted into the correct point in Swagger. Only attributes of primitive type can have defaults.

Here is a simple example:

    structure Struct3 {
        a: double
            default = 123.9
        b: int output
            default = 20
        c: date default = "12/20/1990"
        f: boolean
            default = true
    }

You can use doubles, integers, booleans and strings. Any complex types such as uuids or datetimes are specified using string defaults, see above.


## Difference between PUT and PATCH

A PUT requires a body with all mutable, non-optional fields. A PATCH makes all mutable fields optional. Prefer PUT because it accepts all the mandatory fields at the same time and hence, is idempotent. Use PATCH at your discretion to allow any field to be adjusted.

Consider this example:

    resource Person {
        id: int
        name: string mutable
        address: string mutable optional
        birthDate: datetime
        /operations
            POST PUT PATCH GET
    }

A PUT body must always include "name", but can optionally include "address". A PATCH body can include any combination of the 2 fields, or none at all.

Never use PUT or PATCH to trigger an action, please only use it to adjust state.

## Stringmaps

Reslang supports dictionary structures where the keys are always strings. To specify this, use the stringmap<> syntax:

```

    destinationEndpointProperties: stringmap<string>

```

## Inline expansion

Putting "inline" after an attribute, will pull all the referenced attributes up one level.

e.g.

    structure A {
        a: int
        b: int
    }
    structure C {
        a: A inline
        c: int
    }

Is exactly equivalent to defining C as such:

    structure C {
        a: int
        b: int
        c: int
    }


## Unions

Reslang supports unions, as per the Swagger oneOf specification. The discriminator field is always called type, and it is created implicitly. The names of the union attributes are used as the string value for the type field.

```

union MappingOutputUnion {
  outputKeyValueLabel: MappingKeyValueLabel
  outputIdLabel: MappingIdLabel
}

```

*Note!!!* Prior to v2.0.0, you needed the "inline" keyword on each union attribute - it treated inline in unions differently to structure attributes etc which were inlines. v2.0.0 fixed this.

Only put "inline" if you truly want your structure inlined (e.g. each inlined attribute will be considered as a separate option)


## Actions

We model synchronous or asynchronous actions as subresources of a resource. You specify either "sync" or "async" in front of the specification. For instance, the Direct2Dist API models an asynchronous retry action as follows:

```

async action DistributionRequest::Retry {
  id: string
  /operations
    POST
}

```

This will translate to a POST URL of /v1/distribution-request/{id}/actions/retry

You can also specify that the action applies to the entire resource using the resource-level keyword:

```

async resource-level action DistributionRequest::DeleteAllRequests {
  id: string
  /operations
    POST
}

```

This translates to a POST URL of /v1/distribution-request//actions/delete-all-requests. Note that {id} is no longer present.

## Advanced: Configurable Rule Checker

Reslang supports a rule checker which generates errors if you violate certain edicts. These are described in the libary/rules.json configuration file:

    {
        "maxResourceDepth": 2,
        "maxActionDepth": 3,
        "actionsOnRequestsOnly": false,
        "onlyConfigToConfig": true,
        "noSubresourcesOnActions": true
    }

You can specify an alternative file using the switch --rulefile. You can ignore the rules using --ignorerules.

The rules are:

-   maxResourceDepth controls how deep a resource & subresource hierarchy can go. /v1/cars/2/wheels/3/bolts/4 is 3 levels deep. Default is to allow 2 levels
-   maxActionDepth controls how deeply nested an action can be. THe default setting is 3 layers deep, which means an action can currently go on a subresource. e.g. /v1/cars/2/wheels/3/actions/replace-wheel is allowed
-   actionsOnRequestsOnly, if set, restricts actions to only being on request-resources
-   onlyConfigToConfig means that configuration-resources can only link to other configuration-resources. They cannot link to asset or request resources
-   noSubresourcesOnActions means that actions cannot have subresources
