reslang = namespacedefinition? import* (resource / subresource / action / event / structure / enum )* diagram* docs*

// defining a namespace
namespacedefinition = _ comment:description? _ "namespace" _ "{"
    _ "title" _ title:description _
    _ "version" _ version:semver _ "}" _ ";"? _ {
    return {"comment":comment, "title": title, "version": version}
}

// import from another module
import "import" = _ "import" _ namespace:filename _ ";"? _ {
    return {"import": namespace}
}

