start = namespace? import* (resource / structure / subresource / action / enum )* diagram* docs*

// defining a namespace
namespace = _ comment:description? _ "namespace" _ "{"
    _ "title" _ title:description _
    _ "version" _ version:semver _ "}" _ ";"? _ {
    return {"comment":comment, "title": title, "version": version}
}

// import from another module
import "import" = _ "import" _ namespace:filename _ ";"? _ {
    return {"import": namespace}
}

// documentation
docs = _ "docs" _ name:resname _ "{" _ docEntries:docEntry* _ "}" _ {
    return {name:name, entries:docEntries}
}

docEntry = _ name:resname _ "=" _ doc:description _ {
    return {name:name, documentation:doc}
}

// defining a resource
resource = _ comment:description? _ future:"future"? _ singleton:"singleton"? _ type:("request-resource" / "asset-resource" / "configuration-resource") _ name:resname _ "{" _
    attributes:attributes? _ operations:operations? _
"}" _ ";"? _ {
    return {"future": !!future, "type": type, "name": name, "singleton": !!singleton, "comment": comment, "attributes": attributes, "operations": operations }
}

subresource = _ comment:description? _ future:"future"? _ singleton:"singleton"? _ type:("subresource" / "action") _ parent:resname "::" name:resname _  "{" _
    attributes:attributes? _ operations:operations? _
"}" _ ";"? _ {
    return {"future": !!future, "type": type, "name": name, "singleton": !!singleton, "parent": parent,
    "comment": comment, "attributes": attributes, "operations": operations }
}

action = _ comment:description? _ future:"future"? _ singleton:"singleton"? _ async:("sync" / "async") _ "action" _ parent:resname "::" name:resname _  "{" _
    attributes:attributes? _ operations:operations? _
"}" _ ";"? _ {
    return {"type": "action", "async": async === "async", "name": name, "singleton": !!singleton, "parent": parent,
    "comment": comment, "attributes": attributes, "operations": operations }
}

operations = _ "/"? "operations" _ ops:op+ _ {
    return ops;
}

op = _ operation:ops _ errors: errors* _ ";"? _ {
    operation.errors = errors;
    return operation
}

errors = _ codes:errorcode+ _ struct:ref _ {
    return {codes: codes, "struct": struct}
}
errorcode = _ comment:description? _ code:[0-9]+ {
    return {"code": code.join(""), "comment": comment}
}

ops = _ comment:description? _ op:("GET" / "PUT" / "POST" / "DELETE"/ "MULTIGET") _ {return {"operation": op, "comment": comment}}
ids "ids" = ids:id+ {return ids}
id "id" = _ name:name _ ","? _ {return name}

structure = _ comment:description? _ type:("structure" / "union")  _ name:name  _ "{" _
    attrs:attr+ _
"}" _ ";"? _ {
    return {"type": type, "name": name, "comment": comment, "attributes": attrs}
}

// attributes also handle stringmaps
attributes = _ attrs:attr+ _ { return attrs; }
attr = _ comment:description? _ name:name _ ":" _
    smap:"stringmap<"? _ linked:"linked"? _ type:ref _ ">"? _ mult:"[]"? _ modifiers:modifiers _ inline:"inline"? _";"? _ { 
    return {name: name, comment: comment, stringMap: !!smap, type: type, inline: !!inline, multiple: !!mult, linked: !!linked, modifiers: modifiers}
}

modifiers = modifiers:( _ ("synthetic" / "mutable" / "queryOnly" / "query" / "optional" / "output") _ )* {
    var flat = modifiers.flat()
    return {synthetic: flat.includes("synthetic"), mutable: flat.includes("mutable"),
            queryOnly: flat.includes("queryOnly"), query: flat.includes("query"),
            optional: flat.includes("optional"), output: flat.includes("output")}
}

// enum
enum = _ comment:description? _ "enum"  _ name:name _ "{" _
    literals:literal+ _
"}" _ ";"? _ {
    return {"type": "enum", "name": name, "comment": comment, "literals": literals}
}

literal = _ comment:description? _ name:literalname _ ";"? _ { return name }

// identifiers
ref = parent:(filename ".")? _ toplevel:(resname "::")? _ name:resname {
    return {"parent": parent ? parent[0] : null, "toplevel": toplevel ? toplevel[0]: null, "name": name}
}
literalname "literalname" = name:([A-Z][A-Z0-9_]*) { return name.flat().join(""); }
name "name" = name:([a-zA-Z]+[a-zA-Z0-9]*) { return name.flat().join(""); }
resname "resname" = name:(("v"[0-9]+"/")?[a-zA-Z]+[a-zA-Z0-9]*) { return name.flat().join("") }
filename "filename" = fname:[a-zA-Z0-9_-]+  { return fname.join(""); }

// descriptions
description = "\"" _ inner:(!"\"" i:. {return i})* "\"" {return inner.join("").replace(/\\n/g, "\n")}

// version
semver = semver:([0-9]+ "." [0-9]+ "." [0-9]+) { return semver.join(""); }

// whitespace or comment
_  = ([ \t\r\n]+ / comment)*

// comments
comment = p:(single / multi) {return null}
single = "//" p:([^\n]*)
multi = "/*" inner:(!"*/" i:. {return i})* "*/"

// diagram details
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