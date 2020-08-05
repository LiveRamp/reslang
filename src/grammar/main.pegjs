reslang = namespacedefinition? import* (resource / subresource / action / event / structure / enum )* diagram* docs*

// defining a namespace
namespacedefinition = _ comment:description? _ "namespace" _ space:space? _ "{"
    _ "title" _ title:description _
    _ "version" _ version:semver _ "}" _ ";"? _ {
    return {"comment":comment, space: space, "title": title, "version": version}
}

space = _ space:[a-zA-Z0-9\-_\/]+ _ {
    return space.flat().join("")
}

// import from another module
import "import" = _ "import" _ namespace:filename _ ";"? _ {
    return {"import": namespace}
}

