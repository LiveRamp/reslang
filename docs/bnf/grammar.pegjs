
structure = _ comment:description? _ type:("structure" / "union")  _ name:name  _ constraints: structconstraints _ "{" _
    attrs:attribute+ _
"}" _ ";"? _ {
    return { kind: type, "type": type, parents: [], "short": name, "comment": comment, "attributes": attrs, constraints: constraints}
}

structconstraints = constraints:(_ (maxProperties / minProperties) (__ / ";"))* {
    return constraints.reduce(function(acc, val) {
        return {...acc, ...val[1]}}, {})
}

minProperties = "min-properties:" _ min:number {
    return {minProperties: min}
}
maxProperties = "max-properties:" _ max:number {
    return {maxProperties: max}
}

// attributes also handle stringmaps
attributes = _ attrs:attribute+ _ { return attrs; }
attribute = _ comment:description? _ name:name _ ":" _
    smap:"stringmap<"? _ rep:("linked" / "value-of")? _ type:ref _ ">"? _ array:(array1 / array2)? _ modifiers:modifiers _ constraints:constraints _ inline:"inline"? _ (__ / ";")? _ { 
    return {name: name, comment: comment, stringMap: !!smap, type: type, inline: !!inline,
      array: array, linked: rep == "linked", full: rep == "value-of", modifiers: modifiers, constraints: constraints}
}

array1 = "[" min:([0-9]+)? _ ".." _ max:([0-9]+)? "]" {
    return {"type": 1, min: min ? parseInt(min.join("")) : null, max: max ? parseInt(max.join("")) : null} }

array2 = "[]" {
    return {"type": 2} }

modifiers = modifiers:(_ ("mutable" / "output" /"optional-post" / "optional-put" / "optional-get" / "queryonly" / "query" /  "representation" / "optional")(__ / ";"))* {
    var flat = modifiers.flat()
    return {mutable: flat.includes("mutable"), optional: flat.includes("optional"),
            optionalPost: flat.includes("optional-post"), optionalPut: flat.includes("optional-put"),
            optionalGet: flat.includes("optional-get"), output: flat.includes("output"),
            queryonly: flat.includes("queryonly"), query: flat.includes("query"), representation: flat.includes("representation")}
}

constraints = constraints:(_ (maxLength / minLength) (__ / ";"))* {
    return constraints.reduce(function(acc, val) {
        return {...acc, ...val[1]}}, {})
}

minLength = "min-length:" _ min:number {
    return {minLength: min}
}
maxLength = "max-length:" _ max:number {
    return {maxLength: max}
}
number = number:[0-9]+ {
    return parseInt(number.flat().join(""), 10)
}
// enum
enum = _ comment:description? _ "enum"  _ name:name _ "{" _
    literals:literal+ _
"}" _ ";"? _ {
    return {"kind": "enum", "type": "enum", parents: [], "short": name, "comment": comment, "literals": literals}
}
literal = _ comment:description? _ name:literalname _ ";"? _ { return name }
literalname "literalname" = name:([a-zA-Z0-9_:\-]+) { return name.flat().join(""); }

// naming resources
ref = module:(filename ".")? _ respath:respath _ {
    return {module: module ? module[0] : null, parents: respath.parents, short: respath.short}
}
respath = _ parents:parents? _ short:resname _ {
    return {parents: parents ? parents : [], short: short}
}
noparentrespath = _ short:resname _ {
    return {parents: [], short: short}
}
parentrespath = _ parents:parents _ short:name _ {
    return {parents: parents, short: short}
}
parents = _ first:resname "::" names:(name "::")* {
    return [first].concat(names.map(function(value, index, arr) {
        return value[0] }))
}
resname = name:(("v"[0-9]+"/")?[a-zA-Z]+[a-zA-Z0-9]*) { return name.flat().join(""); }
name = name:([a-zA-Z]+[a-zA-Z0-9]*) { return name.flat().join(""); }
filename = fname:[a-zA-Z0-9_-]+  { return fname.join(""); }

// descriptions
description = "\"" _ inner:(!"\"" i:. {return i})* "\"" {return inner.join("").replace(/\\n/g, "\n")}

// version
semver = semver:([0-9]+ "." [0-9]+ "." [0-9]+) { return semver.join(""); }

// whitespace or comment
_  = ([ \t\r\n]+ / comment)*
// mandatory separation
__ = ([ \t\r\n]+ / comment)+

// comments
comment = p:(single / multi) {return null}
single = "//" p:([^\n]*)
multi = "/*" inner:(!"*/" i:. {return i})* "*/"

// documentation
docs = _ "docs" _ name:resname _ "{" _ docEntries:docEntry* _ "}" _ {
    return {name:name, entries:docEntries}
}

docEntry = _ name:resname _ "=" _ doc:description _ {
    return {name:name, documentation:doc}
}// diagram details
diagram = _ "diagram" _ name:name _ "{" _ layout:layout? _ includeAll:includeAll? _ includes:includes? _ imports:dimports? _ excludes:excludes? _ folds:folds? _ groups:group* _ "}" _ {
    return {"diagram": name, "layout": layout, "includeAll": includeAll, "include": includes, "import": imports, "exclude": excludes, "fold": folds, "groups": groups}
}

layout = _ "layout" _ layout:("LR") {
    return layout
}
includeAll = "/includeAll" _ includeAll:filename ".reslang" {
    return includeAll + ".reslang"
}
includes = _ "/include" _ includes:include+ _ {
    return includes;
}
include = _ ref:ref _ {
    return ref;
}
group = _ "/group" _ comment:description _ includes:include+ _ {
    return { "comment": comment, "include": includes }
}
dimports = _ "/import" _ imports:dimport+ _ {
    return imports;
}
dimport = _ ref:ref _ {
    return ref;
}
excludes = _ "/exclude" _ excludes:exclude+ _ {
    return excludes;
}
exclude = _ ref:ref _ {
    return ref;
}
folds = _ "/fold" _ folds:fold+ _ {
    return folds;
}
fold = _ attr:name _ "of" _ ref:ref _ {
    return {"attr": attr, "of": ref}
}
// "This is published when a segment delivery occurs"
// event SegmentDelivery {
//   /attributes
//     correlation: long
//   /payload
//     test: string optional min-length:10 max-length:30
// }


// defining an event
event = _ comment:description? _ produces:("produces" / "consumes") _ "event" _ name:resname _ "{" _
    header:header? _ payload:payload? _
"}" _ ";"? _ {

    return {
        kind: "event",
        type: "event",
        comment: comment,
        produces: produces == "produces",
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
reslang = namespacedefinition? import* (resource / subresource / action / event / structure / enum )* diagram* docs*

// defining a namespace
namespacedefinition = _ comment:description? _ "namespace" _ space:[a-zA-Z0-9\-_\/]* _ "{"
    _ "title" _ title:description _
    _ "version" _ version:semver _ "}" _ ";"? _ {
    return {"comment":comment, space: space.flat().join(""), "title": title, "version": version}
}

// import from another module
import "import" = _ "import" _ namespace:filename _ ";"? _ {
    return {"import": namespace}
}



// defining a resource
resource = _ comment:description? _ future:"future"? _ singleton:"singleton"? _ type:("configuration-resource" / "asset-resource" / "resource" / "request-resource") _ respath:noparentrespath _ "{" _
    attributes:attributes? _ operations:operations? _
"}" _ ";"? _ {
    return {
        kind: "resource-like",
        comment: comment, future: !!future, singleton: !!singleton, type: type, 
        attributes: attributes, operations: operations,
        parents: [], short: respath.short}
}

subresource = _ comment:description? _ future:"future"? _ singleton:"singleton"? _ type:("subresource") _ respath:parentrespath _ "{" _
    attributes:attributes? _ operations:operations? _
"}" _ ";"? _ {
    return {
        kind: "resource-like",
        comment: comment, future: !!future, singleton: !!singleton, type: type, 
        attributes: attributes, operations: operations,
        parents: respath.parents, short: respath.short}
}

action = _ comment:description? _ future:"future"? _ async:("sync"/"async") _ bulk:("bulk" / "resource-level")? _ "action" _ respath:parentrespath _ "{" _
    attributes:attributes? _ operations:operations? _
"}" _ ";"? _ {
    return {
        kind: "resource-like",
        comment: comment, future: !!future, singleton: false, type: "action", async: async == "async", 
        attributes: attributes, operations: operations,
        parents: respath.parents, short: respath.short,
        bulk: bulk}
}

operations = _ "/operations" _ ops:operation+ _ {
    return ops;
}

operation = _ operation:ops _ errors: errors* _ ";"? _ {
    operation.errors = errors;
    return operation
}

errors = _ codes:errorcode+ _ struct:ref _ {
    return {codes: codes, "struct": struct}
}
errorcode = _ comment:description? _ code:[0-9]+ {
    return {"code": code.join(""), "comment": comment}
}

ops = _ comment:description? _ op:("GET" / "PUT" / "PATCH" / "POST" / "DELETE"/ "MULTIGET" / "EVENTS") _ {return {"operation": op, "comment": comment}}
ids "ids" = ids:id+ {return ids}
id "id" = _ name:name _ ","? _ {return name}




