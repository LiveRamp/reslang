/**
 * simple functions to make writing tests easier
 */

export function strip(line: string) {
    return line
        .replace(/^[\ \t]+/g, "")
        .replace(/\n[\ \t]+/g, "\n")
        .replace(/[\ \t]+/g, " ")
        .replace(/\s*$/, "")
}
