// enum
enum = _ comment:description? _ "enum"  _ name:name _ "{" _
    literals:literal+ _
"}" _ ";"? _ {
    return {category: "definition", "kind": "enum", "type": "enum", parents: [], "short": name, "comment": comment, "literals": literals}
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
name = name:([a-zA-Z_]+[_a-zA-Z0-9]*) { return name.flat().join(""); }
filename = fname:[a-zA-Z0-9_-]+  { return fname.join(""); }

// descriptions
description = "\"" _ inner:(!"\"" i:. {return i})* "\"" {
    var line = inner.join("").replace(/\\n/g, "\n")
    return stripWhitespace(line)
}

// version
semver = semver:([0-9]+ "." [0-9]+ "." [0-9]+) { return semver.flat().join(""); }

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
    return {category: "docs", name:name, entries:docEntries}
}

docEntry = _ name:resname _ "=" _ doc:description _ {
    return {name:name, documentation: doc}
}
