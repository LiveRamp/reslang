#!/usr/bin/env npx ts-node

import clip from "clipboardy"
import yaml from "js-yaml"
import tmp from "tmp"
import open from "open"
import lpath from "path"
import { exec } from "shelljs"
import yargs from "yargs"
import DotvizGen from "./gendotviz"
import EventsGen from "./genevents"
import ParseGen from "./genparse"
import StripGen from "./genstripped"
import SwagGen from "./genswagger"
import { clean, readFile, writeFile } from "./parse"
import { IRules } from "./rules"
import JsonSchemaGen from "./genjsonschema"
const RULES = "rules.json"
const LOCAL_RULES = lpath.join(__dirname, "library", RULES)

export const VERSION = "v2.2.6"

main()

function main() {
    let args = parseArgs()
    let files = args._

    let rulesData = readFile(args.rulefile || LOCAL_RULES)
    let rules = JSON.parse(rulesData) as IRules
    rules.ignoreRules = !!args.ignorerules

    let out = handle(files, rules, args)

    console.log(out)
    if (args.clip) clip.writeSync(out)
}

function parseArgs() {
    return yargs
        .version(VERSION)
        .usage("Usage: reslang namespace_directory [focus.reslang]*")
        .option("diagram", {
            type: "string",
            describe: "Create dotviz graphical output of the declared diagram"
        })
        .option("parsed", {
            type: "boolean",
            describe: "Write the parsed output as a tree"
        })
        .option("clip", {
            type: "boolean",
            describe:
                "Copy output to clipboard (DEPRECATED: use pbcopy instead)"
        })
        .option("open", {
            type: "boolean",
            describe: "Open browser to the appropriate website for output"
        })
        .option("web", {
            type: "boolean",
            describe:
                "Open both the Swagger and AsyncAPI viewers on the web, rather than using local viewers"
        })
        .option("events", {
            type: "boolean",
            describe: "Generate an AsyncAPI spec for events"
        })
        .option("stripped", {
            type: "boolean",
            describe:
                "Pretty print a pretty stripped version of the reslang to stdout, for easy review"
        })
        .option("plain", {
            type: "boolean",
            describe: "Make the stripped version completely plain text"
        })
        .option("stacktrace", {
            type: "boolean",
            describe: "Show full stacktrace of any errors"
        })
        .option("rulefile", {
            type: "string",
            describe: "Use the specified rule file rather than the standard one"
        })
        .option("ignorerules", {
            type: "boolean",
            describe: "Don't check the rules"
        })
        .option("noversion", {
            type: "boolean",
            describe: "Don't write the Reslang version to the Swagger etc"
        })
        .option("omitnamespace", {
            type: "boolean",
            describe: "Don't add the namespace to the servers definition"
        })
        .option("env", {
            type: "string",
            describe:
                "Specify environment for including urls in the server block. Defaults to PROD"
        })
        .option("vars", {
            type: "string",
            describe:
                "Specify environment variables to replace in the server block. Format is var=X,var2=Y..."
        })
        .option("forceallofevents", {
            type: "boolean",
            describe:
                "Force allOf to be generated for AsyncAPI (breaks the viewer but works better for code generation)"
        })
        .option("jsonschema", {
            type: "string",
            describe:
                "Create a json schema & use the definition name as the root, output will be copied to clipboard. Use 'noroot' if you just want definitions"
        })
        .option("followresources", {
            type: "boolean",
            describe: "Use resource definitions when making a JSON schema"
        })
        .check((arg) => {
            if (arg._.length < 1) {
                throw new Error("Needs a module at least to process")
            }
            return true
        }).argv
}

function handle(allFiles: string[], rules: IRules, args: any): string {
    if (args.parsed) {
        return new ParseGen(allFiles, rules).generate()
    } else if (args.stripped) {
        // pretty print the reslang in stripped down form
        const file = tmp.fileSync({ postfix: ".html" })
        const html = new StripGen(allFiles, rules).generate(!args.plain)
        if (args.open) {
            writeFile(html, file.name)
            open(file.name)
        }
        return html
    } else if (args.diagram) {
        const dot = new DotvizGen(allFiles, rules)
        const dotviz = dot.generate(args.diagram)
        if (args.open) {
            open("https://dreampuf.github.io/GraphvizOnline")
        }
        return dotviz
    } else if (args.events) {
        // generate asyncapi - but turn "allOff" off, as it breaks the asyncAPI viewer
        const events = new EventsGen(
            allFiles,
            rules,
            args.env || "PROD",
            args.vars,
            true,
            false,
            args.forceallofevents || false
        )
        const doc = events.generate()
        const version = "# generated by Reslang " + VERSION + "\n"
        const yml =
            (args.noversion ? "" : version) +
            yaml.dump(clean(doc), { noRefs: true })
        if (args.open) {
            if (args.web) {
                open("https://playground.asyncapi.io/")
            } else {
                myexec("show-asyncapi")
            }
        }
        return yml
    } else if (args.jsonschema) {
        const jsonSchema = new JsonSchemaGen(
            allFiles,
            rules,
            args.env || "PROD",
            args.vars,
            true,
            false,
            false
        )
        jsonSchema.root = args.jsonschema
        jsonSchema.followResources = !!args.followresources
        return JsonSchemaGen.generateSchemaAndStringify(jsonSchema)
    } else {
        const swag = new SwagGen(
            allFiles,
            rules,
            args.env || "PROD",
            args.vars,
            true,
            args.omitnamespace
        )
        const swagger = swag.generate()
        const version = "# generated by Reslang " + VERSION + "\n"
        const yml =
            (args.noversion ? "" : version) +
            yaml.dump(clean(swagger), { noRefs: true })
        if (args.open) {
            if (args.web) {
                open("https://editor.swagger.io")
            } else {
                const output = myexec("show-redoc")
                if (output.stderr.includes("EADDRINUSE")) {
                    throw new Error(
                        "Cannot start Redoc server on port 8080 - please check you don't have another server running"
                    )
                } else if (output.stderr) {
                    throw new Error(output.stderr)
                }
            }
        }
        return yml
    }
}

function myexec(script: string) {
    return exec(lpath.join(__dirname, "..", script))
}
