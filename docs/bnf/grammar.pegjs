start = namespace? import* (resource / structure / subresource / action / enum )* diagram* docs*

// defining a namespace
namespace = comment:description?  "namespace"  "{"
     "title"  title:description 
     "version"  version:semver  "}"  ";"?  {
    return {"comment":comment, "title": title, "version": version}
}

// import from another module
import "import" =  "import"  namespace:filename  ";"?  {
    return {"import": namespace}
}

// documentation
docs =  "docs"  name:resname  "{"  docEntries:docEntry*  "}"  {
    return {name:name, entries:docEntries}
}

docEntry =  name:resname  "="  doc:description  {
    return {name:name, documentation:doc}
}

// defining a resource
resource =  comment:description?  future:"future"?  singleton:"singleton"?  type:("request-resource" / "asset-resource" / "configuration-resource")  name:resname  "{" 
    attributes:attributes?  operations:operations? 
"}"  ";"?  {
    return {"future": !!future, "type": type, "name": name, "singleton": !!singleton, "comment": comment, "attributes": attributes, "operations": operations }
}

subresource =  comment:description?  future:"future"?  singleton:"singleton"?  type:("subresource" / "action")  parent:resname "::" name:resname   "{" 
    attributes:attributes?  operations:operations? 
"}"  ";"?  {
    return {"future": !!future, "type": type, "name": name, "singleton": !!singleton, "parent": parent,
    "comment": comment, "attributes": attributes, "operations": operations }
}

action =  comment:description?  future:"future"?  singleton:"singleton"?  async:("sync" / "async")  "action"  parent:resname "::" name:resname   "{" 
    attributes:attributes?  operations:operations? 
"}"  ";"?  {
    return {"type": "action", "async": async === "async", "name": name, "singleton": !!singleton, "parent": parent,
    "comment": comment, "attributes": attributes, "operations": operations }
}

operations =  "/operations"  ops:op+  {
    return ops;
}

op =  operation:ops  errors: errors*  ";"?  {
    operation.errors = errors;
    return operation
}

errors =  codes:errorcode+  struct:ref  {
    return {codes: codes, "struct": struct}
}
errorcode =  comment:description?  code:[0-9]+ {
    return {"code": code.join(""), "comment": comment}
}

ops =  comment:description?  op:("GET" / "PUT" / "POST" / "DELETE"/ "MULTIGET")  {return {"operation": op, "comment": comment}}
ids "ids" = ids:id+ {return ids}
id "id" =  name:name  ","?  {return name}

structure =  comment:description?  type:("structure" / "union")   name:name   "{" 
    attrs:attr+ 
"}"  ";"?  {
    return {"type": type, "name": name, "comment": comment, "attributes": attrs}
}

// attributes also handle stringmaps
attributes =  attrs:attr+  { return attrs; }
attr =  comment:description?  name:name  ":" 
    smap:"stringmap<"?  linked:"linked"?  type:ref  ">"?  mult:"[]"?  modifiers:modifiers  inline:"inline"? ";"?  { 
    return {name: name, comment: comment, stringMap: !!smap, type: type, inline: !!inline, multiple: !!mult, linked: !!linked, modifiers: modifiers}
}

modifiers = modifiers:(  ("synthetic" / "mutable" / "queryonly" / "query" / "optional" / "output")  )* {
    var flat = modifiers.flat()
    return {synthetic: flat.includes("synthetic"), mutable: flat.includes("mutable"),
            queryOnly: flat.includes("queryOnly"), query: flat.includes("query"),
            optional: flat.includes("optional"), output: flat.includes("output")}
}

// enum
enum =  comment:description?  "enum"   name:name  "{" 
    literals:literal+ 
"}"  ";"?  {
    return {"type": "enum", "name": name, "comment": comment, "literals": literals}
}

literal =  comment:description?  name:literalname  ";"?  { return name }

// identifiers
ref = parent:(filename ".")?  toplevel:(resname "::")?  name:resname {
    return {"parent": parent ? parent[0] : null, "toplevel": toplevel ? toplevel[0]: null, "name": name}
}
literalname "literalname" = name:([A-Z][A-Z0-9_]*) { return name.flat().join(""); }
name "name" = name:([a-zA-Z]+[a-zA-Z0-9]*) { return name.flat().join(""); }
resname "resname" = name:(("v"[0-9]+"/")?[a-zA-Z]+[a-zA-Z0-9]*) { return name.flat().join("") }
filename "filename" = fname:[a-zA-Z0-9_-]+  { return fname.join(""); }

// descriptions
description = "\""  inner:(!"\"" i:. {return i})* "\"" {return inner.join("").replace(/\\n/g, "\n")}

// version
semver = semver:([0-9]+ "." [0-9]+ "." [0-9]+) { return semver.join(""); }

// comments
comment = p:(single / multi) {return null}
single = "//" p:([^\n]*)
multi = "/*" inner:(!"*/" i:. {return i})* "*/"

// diagram details
diagram =  "diagram"  name:name  "{"  layout:layout?  includeAll:includeAll?  includes:includes?  imports:dimports?  excludes:excludes?  folds:folds?  groups:group*  "}"  {
    return {"diagram": name, "layout": layout, "includeAll": includeAll, "include": includes, "import": imports, "exclude": excludes, "fold": folds, "groups": groups}
}

layout =  "layout"  layout:("LR") {
    return layout
}
includeAll = "/includeAll"  includeAll:filename ".reslang" {
    return includeAll + ".reslang"
}
includes =  "/include"  includes:include+  {
    return includes;
}
include =  ref:ref  {
    return ref;
}
group =  "/group"  comment:description  includes:include+  {
    return { "comment": comment, "include": includes }
}
dimports =  "/import"  imports:dimport+  {
    return imports;
}
dimport =  ref:ref  {
    return ref;
}
excludes =  "/exclude"  excludes:exclude+  {
    return excludes;
}
exclude =  ref:ref  {
    return ref;
}
folds =  "/fold"  folds:fold+  {
    return folds;
}
fold =  attr:name  "of"  ref:ref  {
    return {"attr": attr, "of": ref}
}