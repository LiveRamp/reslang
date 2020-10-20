import pluralize from "pluralize"

/**
 * remove version & change to correct kebab case (hyphen-delimited)
 * @param name the name to fix
 */
export function kebabCase(name: string) {
    let fix = ""
    let dash = false
    for (const ch of removeVersion(name)) {
        if (/^[A-Z]$/.test(ch)) {
            if (fix) {
                if (!dash) {
                    fix = fix.concat("-")
                    dash = true
                }
            }
            fix = fix.concat(ch.toLowerCase())
        } else if (/^[a-z0-9_\-\$]$/.test(ch)) {
            fix = fix.concat(ch)
            dash = false
        } else {
            if (!dash) {
                fix = fix.concat("-")
                dash = true
            }
        }
    }
    return fix
}

export function camelCase(name: string) {
    let fix = ""
    for (const ch of name) {
        if (/[A-Za-z0-9]$/.test(ch)) {
            fix = fix.concat(ch)
        }
    }
    return fix
}

function removeVersion(name: string) {
    return name.replace(/^v\d+[-\/]/, "")
}

export function getVersion(name: string) {
    return (match => (match ? match[1] : "v1"))(name.match(/^(v\d+)[-\/]/))
}

export function capitalizeFirst(name: string) {
    return name.charAt(0).toUpperCase() + name.substring(1)
}

export function lowercaseFirst(name: string) {
    return name.charAt(0).toLowerCase() + name.substring(1)
}

export function pluralizeName(name: string) {
    return pluralize(name)
}
