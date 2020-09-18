#!/usr/bin/env ts-node

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

export const VERSION = "v2.2.5"

// parse the cmd line
const args = yargs
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
    .option("stdout", {
        type: "boolean",
        describe: "Write output to stdout as well as clipboard"
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
    .option("testwrite", {
        type: "string",
        describe:
            "Used to regenerated test data - the data will be written to this filename. Any errors will be written to this file also"
    })
    .option("testdir", {
        type: "string",
        describe: "Where the test data is generated to"
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

// filter out the directories and focus files
const files = args._

// read in the rules structure
const rulesData = readFile(args.rulefile || LOCAL_RULES)
const rules = JSON.parse(rulesData) as IRules
rules.ignoreRules = args.ignorerules ? true : false

const testwrite = args.testwrite
if (testwrite) {
    if (!args.testdir) {
        errorAndExit("Must specify testdir and testwrite options together")
    }
    files.forEach((file) => {
        const fname = lpath.join(args.testdir || "", file)
        let out: string | undefined
        try {
            out = handle([fname], true, true)
        } catch (err) {
            out = err
        }
        process.stdout.write(file + " ")
        writeFile(out + "\n", fname, testwrite)
    })
} else {
    handle(files, false)
}

function tryClip(text: string, tag: string, silent: boolean) {
    try {
        clip.writeSync(text)
        if (!silent) {
            console.log("Success -- " + tag + " copied to clipboard")
        }
    } catch (error) {
        console.error("Warning: Failed to copy to clipboard", error.msg)
    }
}

function handle(allFiles: string[], silent: boolean, throwErrors = false) {
    // If we are writing to stdout don't intermingle it with info msgs
    if (args.stdout) {
        silent = true
    }

    try {
        // generate a parse tree?
        if (args.parsed) {
            const json = new ParseGen(allFiles, rules).generate()
            if (args.stdout) {
                console.log(json)
            }
            tryClip(json, "parse tree", silent)
            return json
        } else if (args.stripped) {
            // pretty print the reslang in stripped down form
            const file = tmp.fileSync({ postfix: ".html" })
            const html = new StripGen(allFiles, rules).generate(!args.plain)
            tryClip(html, "html", false)
            if (args.open) {
                writeFile(html, file.name)
                open(file.name)
            }
        } else if (args.diagram) {
            // generate .viz?
            const dot = new DotvizGen(allFiles, rules)
            const dotviz = dot.generate(args.diagram)
            if (args.stdout) {
                console.log(dotviz)
            }
            tryClip(dotviz, "dotviz", silent)
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
            if (args.stdout) {
                console.log(yml)
            }
            tryClip(yml, "AsyncAPI spec", silent)
            if (args.open) {
                if (args.web) {
                    console.log(
                        "Paste the contents of the clipboard into the left pane in the browser"
                    )
                    open("https://playground.asyncapi.io/")
                } else {
                    // show asyncapi
                    myexec("show-asyncapi")
                }
            }
            return yml
        } else if (args.jsonschema) {
            // generate json schema
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
            const json = JsonSchemaGen.generateSchemaAndStringify(jsonSchema)
            if (args.stdout) {
                console.log(json)
            }
            tryClip(json, "JSON Schema", silent)
            return json
        } else {
            // generate swagger
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
            if (args.stdout) {
                console.log(yml)
            }
            tryClip(yml, "swagger", silent)
            if (args.open) {
                if (args.web) {
                    console.log(
                        "Paste the contents of the clipboard into the left pane in the browser"
                    )
                    open("https://editor.swagger.io")
                } else {
                    // show redoc
                    const output = myexec("show-redoc", !args.stacktrace)
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
    } catch (error) {
        if (throwErrors) {
            throw error
        }
        errorAndExit(args.stacktrace ? error : error.message)
    }
}

function errorAndExit(msg: any) {
    console.error("Reslang error: ", msg)
    process.exit(-1)
}

function myexec(script: string, silent: boolean = false) {
    return exec(lpath.join(__dirname, "..", script), { silent })
}
