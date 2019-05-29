start = _ import* _ (resource / structure / subresource)* _


// import from another module
import = "import" _ name:name _ "from" _ file:filename _ ";"? { return {"import": name, "file": file} }

// defining a resource
resource = _ "resource" _ comment? _ name _ "{" _
    operations? _ attributes? _
"}" _ ";"?

subresource = _ "subresource" _ comment? _ name _ "of" _ name _ "{" _
    operations? _ attributes? _
"}" _ ";"?

structure = _ "structure" _ comment? _ name _ "{" _
    attr+ _
"}" _ ";"?

operations = _ "operations:" _ op+ _;
op = _ comment? _ ("GET" / "PUT" / "POST" / "DELETE" / "MULTIGET") _ ";"

attributes = "attributes:" + attr+
attr = _ comment? _ name _ ":" _ "linked"? _ type _ "[]"? _ "output"? ";" _

// identifiers
type = name
name = name:[a-zA-Z]+[a-zA-Z0-9]* { return name.join(""); }
filename = fname:[a-zA-Z0-9_-]+  { return fname.join(""); }

// comments
comment = _ p:(single / multi) {return ['COMMENT', p]}
single = '//' p:([^\n]*) {return p.join('')}
multi = "/*" inner:(!"*/" i:. {return i})* "*/" {return inner.join('')}

// whitespace
_  = [ \t\r\n]* { return null; }

