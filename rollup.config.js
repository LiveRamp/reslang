import ts from "@wessberg/rollup-plugin-ts"

function skipExternalModulesError(arr) {
    let msg = "Cannot find type definition file for 'external-modules'."
    return arr.filter((x) => x.messageText !== msg)
}

export default {
    input: "src/main.ts",
    output: {
        file: "dist/main.js",
        format: "cjs",
        sourcemap: true,
    },
    plugins: [
        ts({
            hook: {
                diagnostics: skipExternalModulesError,
            },
        }),
    ],
}
