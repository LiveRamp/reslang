import { CodeGenerator } from "@babel/generator"

/**
 * remove version & change to correct case
 * @param name the name to fix
 */
export function fixName(name: string) {
    const match = name.match(/(?<version>v[0-9]+[\-\/])?(?<name>.*)/)
    const real = match ? match.groups!.name : "unknown"

    let fix = ""
    for (const ch of real) {
        if (/^[A-Z]$/.test(ch)) {
            if (fix) {
                fix = fix.concat("-")
            }
            fix = fix.concat(ch.toLowerCase())
        } else if (/^[a-z0-9_\$]$/.test(ch)) {
            fix = fix.concat(ch)
        }
    }
    return fix
}

export function fixNameCamel(name: string) {
    let fix = ""
    for (const ch of name) {
        if (/^[A-Za-z0-9_\$]$/.test(ch)) {
            fix = fix.concat(ch)
        }
    }
    return fix
}

export function sanitize(name: string) {
    let fix = ""
    for (const ch of name) {
        if (/[A-Za-z0-9]$/.test(ch)) {
            fix = fix.concat(ch)
        } else {
            fix = fix.concat("-")
        }
    }
    return fix
}

export function getVersion(name: string) {
    const match = name.match(/((?<version>v[0-9])[\-\/])?(.*)/)
    return match && match.groups && match.groups.version
        ? match.groups.version
        : "v1"
}

export function pluralizeName(name: string) {
    if (name.endsWith("s")) {
        return name + "es"
    }
    if (name.endsWith("y")) {
        return name.substring(0, name.length - 1) + "ies"
    }
    return name + "s"
}

export function makeShort(name: string) {
    const pos = name.indexOf(".")
    return pos === -1 ? name : name.substring(pos + 1)
}

export function makeLong(
    namespace: string, // namespace being parsed
    mainNamespace: string,
    name: string
) {
    const main = namespace === mainNamespace
    const pos = name.indexOf(".")

    // if we don't have a namespace, see if we need to add one
    if (pos === -1) {
        return main ? name : namespace + "." + name
    }

    // otherwise, check to see if the current namespace is the same as the main one
    const embedded = name.substring(0, pos)
    return embedded === mainNamespace ? name.substring(pos + 1) : name
}
