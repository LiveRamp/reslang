# Reference Manual

The reslang grammar is fully described by these [railroad diagrams](./bnf/railroad-for-reslang.pdf).

Note that we will draw heavily on the example specified [here](../models/direct2dist). This demo namespace models the complete Direct2Dist specification, which allows ids to be sent directly to a destination. This is explained in more detail [here](./direct2dist-explanation.md).

## Namespaces

The API is divided up into different namespaces. e.g. /distribution/...

Each namespace lives in a separate directory, which can contain many .reslang files. The name of the namespace is simply the name of the directory.

You must have one namespace declaration per directory. Use the "namespace" keyword to indicate the title and version of an API. It can live inside any reslang file.

```
"API for accessing LiveRamp's Direct to Distribution Service"
namespace {
  title "Direct to Distribution API - BETA "
  version 0.0.1
}
```

### Resource types

Relang is designed to make you think in terms of resources. There are 3 different resource types in Reslang:

-   a **configuration-resource** describes configuration in the system.
-   an **asset-resource** is a resource that is typically created by processing data through our system.
-   a **request-resource** is an asynchronous, long running process modeled as a resource.

Each resource specifies the attributes it holds, followed by the possible operations / verbs. The reason for the three different types is that they will eventually have different audit and ownership structures - e.g. we might have full history available for configuration resources.

Each resource type can have 1 level of subresources. Further, a request-resource can also have actions, representing either synchronous or asynchronous operations.

You can use the "singleton" keyword before a resource definition to indicate there is only 1 instance of this resource.

### Primitive Types

The following primitive types are available. These are translated into appropriate Swagger types - in some cases (datetime etc) the primitive type is translated into a string type because Swagger has no notion of time-based values. If a translation occurs, then an appropriate comment / example text will be inserted as documentation

| Type     | Description                                                                   |
| -------- | ----------------------------------------------------------------------------- |
| int      | 32-bit integer                                                                |
| string   | Standard string                                                               |
| double   | Double floating point                                                         |
| boolean  | True or false                                                                 |
| date     | Date in ISO8601 format (2019-04-13)                                           |
| time     | Time in ISO8601 format (22:00:01)                                             |
| datetime | Date+time in ISO8601 format, always with timezone<br />(2019-04-13T03:35:34Z) |
| url      | A URL                                                                         |

### Versioning

Granular versioning is possible on toplevel resources and other elements such as structures. By default all definitions are v1 if not specified. However, we can place another version at the front to indicate a breaking change in the resource e.g. v2/resource.

Note that this can also inherit from the v1 resource. We do not need more than the major version in the semver, as the assumption is that if you introduce minor changes in a resource it will be backwards compatible.

Also note that it is perfectly possible to support multiple major versions of a resource in a single API.

An example of evolution is contained in the models/upversion directory:

```upversioning example
asset-resource v2/ResourceB {
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

You can import another namespace (at the peer directory level) into your current .reslang file using "import othernamespace". You should then refer to the imported elements by their full name "othernamespace.Resource".

```
import identity

asset-resource Test {
  poolId: linked identity.IdentityPool
  ... }
```

Note that the full syntax to refer to subresources / actions is: `namespace.toplevelresource::subresource`
You can omit namespace if the subresource is in the current namespace.

### Id

Every resource or subresource that can be retrieved by a GET needs to define an id field. This is the primary identifier for that resource, and it can be of any type.

You do not require and have a PUT or DELETE operation.

### Error Codes and Responses

You can specify a set of error codes and bodies after each operation. The following example shows a response for 404, 405 and 403 error codes.

```Error code example
configuration-resource FileType {
	id: string
	type: string query
	format: string
	specId: linked Specification
	/operations
		"Get a FileType"
		GET
			"Cannot find file type" 404
			"Not Allowed" 405
				StandardError
			"Forbidden" 403
				SpecialError
		POST
		MULTIGET
}
```

Note that StandardError is an internally defined structure that should be used for most errors. SpecialError above shows that you can also define your own error bodies as structures.

### Future Resources

It's common, when defining an API, to want to refer to resources that haven't yet been created. The "future" keyword allows you to define a theoretical resource, which will generate no Swagger. The purpose of this is so you can do a "linked" reference to it, in the expectation that you will add the full resource in the future.

```Future resource
future configuration-resource Specification {
	id: string
}
```

### Links

To refer to one resource from another, used the "linked" keyword in front of the attribute type. The attribute must end in "Id" or "Ids"

```
    destinationEndpointId: linked Destination::Endpoint
```

Note that to link to a subresource, you use the parent::child syntax.

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

## Stringmaps

Reslang supports dictionary structures where the keys are always strings. To specify this, use the stringmap<> syntax:

```

    destinationEndpointProperties: stringmap<string>

```

## Unions

Reslang supports unions, as per the Swagger oneOf specification. The discriminator field is always called type, and it is created implicitly. The names of the union attributes are used as the string value for the type field.

```

union MappingOutputUnion {
  outputKeyValueLabel: MappingKeyValueLabel inline
  outputIdLabel: MappingIdLabel inline
}

```

## Inline expansion

You can see above that we used the optional inline keyword. This expands all the structure attributes into the union directly.

## Request actions

We model synchronous or asynchronous actions as subresources of a request-resource. You specify either "sync" or "async" in front of the specification. For instance, the Direct2Dist API models an asynchronous retry action as follows:

```

async action DistributionRequest::Retry {
  id: string
  /operations
    POST
}

```

## Attribute Modifiers

The following modifiers can be placed after the attribute type:

-   output
    -   This indicates that the attribute does not need to be specified on a POST and is only present on an output representation from GET or MULTIGET. Id is always automatically output only.
-   optional
    -   This indicates that the attribute is not always required. By default, non-optional attributes are marked as required in the generated Swagger.
-   mutable
    -   This indicated that the attribute can be mutated using a PUT.
-   synthetic
    -   This indicates that the attribute is derived, or synthetic. i.e. it is formed out of other state. By default is is output only.
