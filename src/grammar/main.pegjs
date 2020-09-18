
{
    function stripWhitespace(str) {
        // break it into lines
        var lines = str.split("\n")
        var all = []
        var length = lines.length
        var indent = ""
        lines.forEach((value, index) => {
            // if this is the 2nd line, capture the indent
            if (index == 1) {
                indent = value.substring(0, value.length - value.trimLeft().length)
            }

            // add if this is not an empty first or last line
            if (value || (index != 0 && index !== length - 1)) {
                all.push(removeIndent(value, indent))
            }
        })
        return all.join("\n")
    }

    function removeIndent(str, indent) {
        if (str.startsWith(indent)) {
            return str.substring(indent.length)
        }
        return str
    }
}


reslang = (namespacedefinition / import / servers / tag / resource / subresource /
            action / structure / enum / event / produces / consumes / diagram / docs)*

// defining a namespace
namespacedefinition = _ comment:description? _ "namespace" _ space:space? _ "{"
    _ "title" _ title:description _
    _ "version" _ version:semver _ "}" _ ";"? _ {
    return {category: "namespace", "comment":comment, space: space, "title": title, "version": version}
}

space = _ space:[a-zA-Z0-9\-_\/]+ _ {
    return space.flat().join("")
}

// import from another module
import "import" = _ "import" _ namespace:filename _ ";"? _ {
    return {category: "import", "import": namespace}
}

