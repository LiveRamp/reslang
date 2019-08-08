start = namespace? import* (resource / structure / subresource / enum)*

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

extends = _ "extends" _ name: name _ {
    return name
}

// defining a resource
resource = _ comment:description? _ future:"future"? _ singleton:"singleton"? _ type:("request-resource" / "asset-resource" / "configuration-resource") _ name:resname _ ext:extends? _ "{" _
    attributes:attributes? _ operations:operations? _
"}" _ ";"? _ {
    return {"future": !!future, "type": type, "name": name, "singleton": !!singleton, "extends": ext, "comment": comment, "attributes": attributes, "operations": operations }
}

subresource = _ comment:description? _ future:"future"? _ singleton:"singleton"? _ type:("subresource" / "action") _ parent:resname "::" name:resname _  ext:extends? _ "{" _
    attributes:attributes? _ operations:operations? _
"}" _ ";"? _ {
    return {"future": !!future, "type": type, "name": name, "singleton": !!singleton, "extends": ext, "parent": parent,
    "comment": comment, "attributes": attributes, "operations": operations }
}

operations = _ "operations" _ ops:op+ _ {
    return ops;
}

op = _ operation:(ops / multiget) _ errors: errors* _ ";"? _ {
    operation.errors = errors;
    return operation
}

errors = _ codes:errorcode+ _ struct:ref _ {
    return {codes: codes, "struct": struct}
}
errorcode = _ comment:description? _ code:[0-9]+ {
    return {"code": code.join(""), "comment": comment}
}

ops = _ comment:description? _ op:("GET" / "PUT" / "POST" / "DELETE") _ {return {"operation": op, "comment": comment}}
multiget = _ comment:description? _ "MULTIGET" ids:ids {return {"operation": "MULTIGET", "comment": comment, "ids": ids}}
ids "ids" = ids:id+ {return ids}
id "id" = _ name:name _ ","? _ {return name}

structure = _ comment:description? _ "structure"  _ name:name  _ ext:extends? _ "{" _
    attrs:attr+ _
"}" _ ";"? _ {
    return {"type": "structure", "name": name, "comment": comment, "extends": ext, "attributes": attrs}
}

attributes = _ attrs:attr+ _ { return attrs; }
attr = _ comment:description? _ name:name _ ":" _ linked:"linked"? _ type:ref _ mult:"[]"? _ out:"output"? _ ";"? _ { 
    return {"name": name, "comment": comment, "type": type, "multiple": mult !== null, "output": out !== null, "linked": linked !== null}
}

// enum
enum = _ comment:description? _ "enum"  _ name:name _ ext:extends? _ "{" _
    literals:literal+ _
"}" _ ";"? _ {
    return {"type": "enum", "name": name, "comment": comment, "extends": ext, "literals": literals}
}

literal = _ comment:description? _ name:literalname _ ";"? _ { return name }

// identifiers
ref = parent:(filename ".")? _ toplevel:(resname "::")? _ name:resname {
    return {"parent": parent ? parent[0] : null, "toplevel": toplevel ? toplevel[0]: null, "name": name}
}
literalname "literalname" = name:[A-Z_]+[A-Z0-9_]* { return name.join(""); }
name "name" = name:[a-zA-Z]+[a-zA-Z0-9]* { return name.join(""); }
resname "resname" = name:(("v"[0-9]+"/")?[a-zA-Z]+[a-zA-Z0-9]*) { return name.flat().join("") }
filename "filename" = fname:[a-zA-Z0-9_-]+  { return fname.join(""); }

// descriptions
description = "\"" _ inner:(!"\"" i:. {return i})* "\"" {return inner.join("")}

// version
semver = semver:([0-9]+ "." [0-9]+ "." [0-9]+) { return semver.join(""); }

// whitespace or comment
_  = ([ \t\r\n]+ / comment)*

// comments
comment = p:(single / multi) {return null}
single = "//" p:([^\n]*)
multi = "/*" inner:(!"*/" i:. {return i})* "*/"

