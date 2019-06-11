start = details import* (resource / structure / subresource / enum)*


details = _ desc:comment? _ "version" _ semver:semver _ ";"? _
    { return {"description": desc, "version": semver} }

// import from another module
import "import" = _ "import" _ name:name _ "from" _ file:filename _ ";"? _ {
    return {"import": name, "file": file}
}

extends = _ "extends" _ name: name _ {
    return name
}

// defining a resource
resource = _ comment:comment? _ singleton:"singleton"? _ type:("resource" / "request") _ name:resname _ ext:extends? _ "{" _
    attributes:attributes? _ operations:operations? _
"}" _ ";"? _ {
    return {"type": type, "name": name, "singleton": singleton !== null, "extends": ext, "comment": comment, "attributes": attributes, "operations": operations }
}

subresource = _ comment:comment? _ singleton:"singleton"? _ type:("subresource" / "verb") _ name:resname _ "of" _ parent:resname _ "{" _
    attributes:attributes? _ operations:operations? _
"}" _ ";"? _ {
    return {"type": type, "name": name, "singleton": singleton !== null, "parent": parent,
    "comment": comment, "attributes": attributes, "operations": operations }
}

operations = _ "operations" _ ops:op+ _ {
    return ops;
}

op = _ operation:(ops / multiget) _ ";"? _ {
    return operation
}

ops = _ comment:comment? _ op:("GET" / "PUT" / "POST" / "DELETE") _ {return {"operation": op, "comment": comment}}
multiget = _ comment:comment? _ "MULTIGET" ids:ids {return {"operation": "MULTIGET", "comment": comment, "ids": ids}}
ids "ids" = ids:id+ {return ids}
id "id" = _ name:name _ ","? _ {return name}

structure = _ comment:comment? _ "structure"  _ name:name _ "{" _
    attrs:attr+ _
"}" _ ";"? _ {
    return {"type": "structure", "name": name, "comment": comment, "attributes": attrs}
}

attributes = _ attrs:attr+ _ { return attrs; }
attr = _ comment:comment? _ name:name _ ":" _ linked:"linked"? _ type:type _ mult:"[]"? _ out:"output"? _ ";"? _ { 
    return {"name": name, "comment": comment, "type": type, "multiple": mult !== null, "output": out !== null, "linked": linked !== null}
}

// enum
enum = _ comment:comment? _ "enum"  _ name:name _ "{" _
    literals:literal+ _
"}" _ ";"? _ {
    return {"type": "enum", "name": name, "comment": comment, "literals": literals}
}

literal = _ comment:comment? _ name:literalname _ ";"? _ { return name }

// identifiers
literalname "literalname" = name:[A-Z_]+[A-Z0-9_]* { return name.join(""); }
type "type" = resname
name "name" = name:[a-zA-Z]+[a-zA-Z0-9]* { return name.join(""); }
resname "resname" = name:(("v"[0-9]+"/")?[a-zA-Z]+[a-zA-Z0-9]*) { return name.flat().join("") }
filename "filename" = fname:[a-zA-Z0-9_-]+  { return fname.join(""); }

// comments
comment = _ p:(single / multi) {return p}
single = "//" _ p:([^\n]*) {return p.join("")}
multi = "/*" _ inner:(!"*/" i:. {return i})* "*/" {return inner.join("")}

// version
semver = semver:([0-9]+ "." [0-9]+ "." [0-9]+) { return semver.join(""); }

// whitespace
_  = [ \t\r\n]*

