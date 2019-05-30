start = (import / resource / structure / subresource / enum)*


// import from another module
import "import" = _ "import" _ name:name _ "from" _ file:filename _ ";"? _ {
    return {"import": name, "file": file}
}

// defining a resource
resource = _ comment:comment? _ "resource" _ name:name _ "{" _
    attributes:attributes? _ operations:operations? _
"}" _ ";"? _ {
    return {"resource": name, "comment": comment, "attributes": attributes, "operations": operations }
}

subresource = _ comment:comment? _ "subresource" _ name:name _ "of" _ parent:name _ "{" _
    attributes:attributes? _ operations:operations? _
"}" _ ";"? _ {
    return {"subresource": name, "parent": parent, "comment": comment, "attributes": attributes, "operations": operations }
}

operations = _ "operations" _ ops:op+ _ {
    return ops;
}

op = _ comment:comment? _ operation:("GET" / "PUT" / "POST" / "DELETE" / "MULTIGET") _ ";"? _ {
    return {"operation": operation, "comment": comment}
}

structure = _ comment:comment? _ "structure"  _ name:name _ "{" _
    attrs:attr+ _
"}" _ ";"? _ {
    return {"structure": name, "comment": comment, "attributes": attrs}
}

attributes = _ attrs:attr+ _ { return attrs; }
attr = _ comment:comment? _ name:name _ ":" _ "linked"? _ type:type _ mult:"[]"? _ out:"output"? ";"? _ { 
    return {"name": name, "comment": comment, "type": type, "multiple": mult !== null, "output": out !== null}
}

// enum
enum = _ comment:comment? _ "enum"  _ name:name _ "{" _
    literals:literal+ _
"}" _ ";"? _ {
    return {"enum": name, "comment": comment, "literals": literals}
}

literal = _ comment:comment? _ name:literalname _ ";"? _ { return {"literal": name, "comment": comment} }
literalname "literalname" = name:[A-Z_]+[A-Z0-9_]* { return name.join(""); }

// identifiers
type "name" = name
name "name" = name:[a-zA-Z]+[a-zA-Z0-9]* { return name.join(""); }
filename "filename" = fname:[a-zA-Z0-9_-]+  { return fname.join(""); }

// comments
comment = _ p:(single / multi) {return p}
single = "//" _ p:([^\n]*) {return p.join("")}
multi = "/*" _ inner:(!"*/" i:. {return i})* "*/" {return inner.join("")}

// whitespace
_  = [ \t\r\n]*

