
tag = _ comment:description? _ "section" _ name:[^\{]+ _ "{" _ "/include" _ resources:respath+ _ "}" _ {
    return { category: "tag", comment: comment, name: name.join("").trim(), include: resources }
}