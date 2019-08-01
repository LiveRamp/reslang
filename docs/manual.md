# Reslang - A DSL for Creating Resource-Oriented APIs

Reslang (aka Resource Language) is a fast and expressive way to create resource-oriented Swagger API definitions.

You can think of it as a Domain Specific Language for creating APIs, specifically tailored for the LiveRamp environment. The Swagger output produced automatically conforms to the documented [LiveRamp API standards](https://docs.google.com/document/d/1HHkdHXVj8vQ4XLKlmwD5QggV0lTg08_tI9J_tF5Qe9Q/edit?usp=sharing).

## Key Advantages Over Swagger

Why use Reslang when Swagger is clearly more expressive? There are a few reasons:

- Swagger is very verbose & low-level
  - Reslang describes APIs in a higher-level, more succinct way, allowing for preservation of intent. When working directly with Swagger, it is easy to get stuck on the details, particularly when reviewing and commenting. It is common that the Reslang file is one-tenth the size of the Swagger equivalent.
  - Reslang specifies how versioning works. Swagger, on the other hand, expresses no opinion on API or resource versioning, or the different classification of resources.
  - Reslang enforces a resource perspective. Swagger itself expresses no preference, and API creators can easily default to RPC.
- Swagger is often *too* expressive
  - It is extremely difficult to write Swagger that conforms to the dozens of rules expressed in our API standards RFC. This is non-trivial concern, as we are aiming for uniformity.

## Features

Reslang elevates the description of your API to a higher level of abstraction.

- It allows description of resources, classified into asset, configuration and request - mirroring our own domain classifications.
- A Java-like syntax makes it very fast and intuitive to write specs.
- Full support for subresources, singletons, structures, enums, linkage from one resource to another, arrays. Maps and enums will be done soon .
- Create Swagger or a diagram from your Reslang spec.

## Example

There are 3 different resource types in Reslang:

- a **configuration-resource** describes configuration in the system.
- an **asset-resource** is a resource that is typically created by processing data through our system.
- a **request-resource** is an asynchronous, long running process modeled as a resource.

Each resource specifies the attributes it holds, followed by the possible operations / verbs.

Here is an example of a simple API for creating and manipulating files and directories:

`"This is a simple API for manipulating files"`
`namespace {`
	`title "file"`
	`version 1.0.0`
`}`

`"This models a directory we might create"`
`asset-resource Directory {`
	`id: string`
	`name: string`
	`operations`

​		`GET POST MULTIGET name id`
`}`

`"This configures up a file type, e.g. .gif"`
`configuration-resource FileType {`
	`id: string`
	`type: string`
	`format: string`
	`operations`
		`GET POST MULTIGET type id`
`}`

`"This models a file in a directory"`
`subresource Directory::File {`
	`id: int`
	`name: string`
	`url: string`
	`fileType: linked FileType`

​	`operations`
​		`GET POST MULTIGET id`
`}`

`"This models a long running request"`
`request-resource DirectoryDeleteRequest {`
	`id: int`
	`directory: linked Directory`

​	`operations`

​		`GET POST MULTIGET id`
`}`

`"This models an action on a request"`
`action DirectoryDeleteRequest::Cancel {`
	`operations`
		`POST`
`}`

The description above models a Directory as an asset-resource. We can create any number of directories via POST. Files are contained within these directories, represented by the Directory subresource named File. Each File refers to a configuration-resource of FileType (e.g. png) via the "linked" keyword.

Finally, we have a request for deleting a directory, assuming this is a long running task. You can further perform a cancel action on it, to stop its operation. We could have also modeled this deletion by adding DELETE to the operations on Directory.

To create the Swagger, type the following, assuming that the file(s) live in a directory called "./file" and have the extension of .reslang:

​	`reslang ./file --open`

This copies the swagger to the clipboard (& opens the Swagger editor in the browser, allowing you to paste the clipboard into it).

If you want a diagram, use the flag —dotviz, which will copy a diagram format into the clipboard and open up the graphviz viewer.

##Example Swagger Output

The Swagger looks as follows in the Swagger Editor - the top level API description reflects the namespace declaration. (Note that the Reslang API descripotion is 48 lines, whereas the Swagger is 445 lines)

![API header](/Users/amcvei/projects/reslang/docs/api.png)

The Swagger itself reflects the set of routes available. Note that any quoted text just before an element gets inserted as documentation into the Swagger.

![Routes](/Users/amcvei/projects/reslang/docs/swagger.png)

Generating a dotviz file creates the following diagram of the API:

![Diagram](/Users/amcvei/projects/reslang/docs/dotviz.png)

Top level resources are yellow. Links from one resource to another are shown via arrows.

##Reference Manual

### Resource types

The 3 resource types are "configuration-resource", "asset-resource" and "request-resource". Each resource can have any number of 1-level-deep subresources. Deeper levels are unsupported.

You can use the "singleton" keyword before a resource definition to indicate there is only 1 instance of this resource.

### Inheritance

Resources, structures and enums can inherit from each other using the "extends" keyword. This currently only inherits the attributes of a resource, not the operations.

### Imports & Directory Structure

The directory structure is "namespace/*.reslang". You can import another namespace  at the peer level into your current file using "import othernamespace". You should then refer to the imported elements by their full name "othernamespace.Resource".

###Id

Currently the primary id field of any resource needs to be called "id". You only require an id for (sub)resources that are not singleton and have a PUT or DELETE operation.

### Links

To refer to one resource from another, used the "linked" keyword in front of the attribute type.

###Structures

You can define as reusable set of attributes using the "structure" keyword. The systax is like a resource but it does not support operations or the singleton modifier.

###Arrays

Use [] after an attribute type to indicate an array.

###Enums

You can define a set of literals using the "enum" keyword.

### API Spec

Use the "namespace" keyword to indicate the title and version of an API. There should only be one API spec per directory.

### 2 types of comments

// && /* */ comments are developer only comments. A comment using quotes ("this is a comment") will get transferred to the Swagger description field of the element it appears before.

### Multiget

A multi-GET is a GET on the plural resource, returning a collection of resources. Currently at least 1 filter parameter needs to be specified after the MULTIGET.

##Currently Unsupported

- Maps & Unions
- OpenAPI 3
- Better API titles
- Reusable error bodies
- Attribute & model examples