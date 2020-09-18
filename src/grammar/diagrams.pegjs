// diagram details
diagram = _ "diagram" _ name:name _ "{" _ layout:layout? _ includeAll:includeAll? _ includes:includes? _ imports:dimports? _ excludes:excludes? _ folds:folds? _ groups:group* _ "}" _ {
    return {category: "diagram", "diagram": name, "layout": layout, "includeAll": includeAll, "include": includes, "import": imports, "exclude": excludes, "fold": folds, "groups": groups}
}

layout = _ "layout" _ layout:("LR") {
    return layout
}
includeAll = "/includeAll" _ includeAll:filename ".reslang" {
    return includeAll + ".reslang"
}
includes = _ "/include" _ includes:include+ _ {
    return includes;
}
include = _ ref:ref _ {
    return ref;
}
group = _ "/group" _ comment:description _ includes:include+ _ {
    return { "comment": comment, "include": includes }
}
dimports = _ "/import" _ imports:dimport+ _ {
    return imports;
}
dimport = _ ref:ref _ {
    return ref;
}
excludes = _ "/exclude" _ excludes:exclude+ _ {
    return excludes;
}
exclude = _ ref:ref _ {
    return ref;
}
folds = _ "/fold" _ folds:fold+ _ {
    return folds;
}
fold = _ attr:name _ "of" _ ref:ref _ {
    return {"attr": attr, "of": ref}
}