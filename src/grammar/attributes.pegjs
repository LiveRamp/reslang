
structure = _ comment:description? _ type:("structure" / "union")  _ name:name  _ "{" _
    attrs:attribute+ _
"}" _ ";"? _ {
    return {category: "definition", kind: type, "type": type, parents: [], "short": name, "comment": comment, "attributes": attrs}
}

// attributes also handle stringmaps
attributes = _ attrs:attribute+ _ { return attrs; }
attribute = _ comment:description? _ name:name _ ":" _
    smap:"stringmap<"? _ rep:("linked" / "value-of")? _ type:ref _ ">"? _ array:(array1 / array2)? _ modifiers:modifiers _ constraints:constraints _ inline:"inline"? example:example? _ def:default? _ (__ / ";")? _ { 
    return {name: name, comment: comment, stringMap: !!smap, type: type, inline: !!inline,
      array: array, linked: rep == "linked", full: rep == "value-of", modifiers: modifiers, constraints: constraints, example: example, default: def}
}

example = _ "example:" _ format: description _ {
    return format
}

default = _ "default" _ "=" _ value: (boolean / string / numerical) _ {
    return value
}

boolean = _ val:("true" / "false") {
    return {"type": "boolean", "value": val}
}

numerical = _ val:([\+\-]?[0-9]*("."[0-9]+)?) _ {
    return {"type": "numerical", "value": val.flat().join("")}
}

string = _ "\"" val:([^\"]+) "\"" _ {
    return {"type": "string", "value": val.flat().join("")}
}

array1 = "[" min:([0-9]+)? _ ".." _ max:([0-9]+)? "]" {
    return {"type": 1, min: min ? parseInt(min.join("")) : null, max: max ? parseInt(max.join("")) : null} }

array2 = "[]" {
    return {"type": 2} }

modifiers = modifiers:(_ ("flag" / "mutable" / "output" /"optional-post" / "optional-put" / "optional-get" / "queryonly" / "query" /  "representation" / "optional")(__ / ";"))* {
    var flat = modifiers.flat()
    return {flag: flat.includes("flag"), mutable: flat.includes("mutable"), optional: flat.includes("optional"),
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
