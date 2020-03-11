/**
 * simple functions to make writing tests easier
 */

export function strip(line: string, removeFirstLine = false) {
    // remove first line (reslang version) and all whitespace
    if (removeFirstLine) {
        line = line.replace(/^.*/, "")
    }
    return line
        .replace(/^[\ \t]+/g, "")
        .replace(/\n[\ \t]+/g, "\n")
        .replace(/[\ \t]+/g, " ")
        .replace(/\s*$/, "")
}
