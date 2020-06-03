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
const RULES = "rules.json"
const LOCAL_RULES = lpath.join(__dirname, "library", RULES)

export const VERSION = "v1.4.6"

// parse the cmd line
const args = yargs
    .usage("Usage: reslang namespace_directory [focus.reslang]*")
    .option("diagram", {
        type: "string",
        describe: "Create dotviz graphical output of the declared diagram",
    })
    .option("parsed", {
        type: "boolean",
        describe: "Write the parsed output as a tree",
    })
    .option("stdout", {
        type: "boolean",
        describe: "Write output to stdout as well as clipboard",
    })
    .option("open", {
        type: "boolean",
        describe: "Open browser to the appropriate website for output",
    })
    .option("web", {
        type: "boolean",
        describe:
            "Open both the Swagger and AsyncAPI viewers on the web, rather than using local viewers",
    })
    .option("events", {
        type: "boolean",
        describe: "Generate an AsyncAPI spec for events",
    })
    .option("stripped", {
        type: "boolean",
        describe:
            "Pretty print a pretty stripped version of the reslang to stdout, for easy review",
    })
    .option("plain", {
        type: "boolean",
        describe: "Make the stripped version completely plain text",
    })
    .option("stacktrace", {
        type: "boolean",
        describe: "Show full stacktrace of any errors",
    })
    .option("rulefile", {
        type: "string",
        describe: "Use the specified rule file rather than the standard one",
    })
    .option("ignorerules", {
        type: "boolean",
        describe: "Don't check the rules",
    })
    .option("testwrite", {
        type: "string",
        describe:
            "Used to regenerated test data - the data will be written to this filename",
    })
    .option("testdir", {
        type: "string",
        describe: "Where the test data is generated to",
    })
    .option("noversion", {
        type: "boolean",
        describe: "Don't write the Reslang version to the Swagger etc",
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
        const out = handle([fname], true)
        process.stdout.write(file + " ")
        writeFile(out + "\n", fname, testwrite)
    })
} else {
    handle(files, false)
}

function handle(allFiles: string[], silent: boolean) {
    try {
        // generate a parse tree?
        if (args.parsed) {
            const json = new ParseGen(allFiles, rules).generate()
            if (args.stdout) {
                console.log(json)
            } else {
                if (!silent) {
                    console.log("Success - parse tree copied to clipboard")
                }
            }
            clip.writeSync(json)
            return json
        } else if (args.stripped) {
            // pretty print the reslang in stripped down form
            const file = tmp.fileSync({ postfix: ".html" })
            const html = new StripGen(allFiles, rules).generate(!args.plain)
            clip.writeSync(html)
            console.log("Success -- html copied to clipboard")
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
            } else {
                if (!silent) {
                    console.log("Success - dotviz copied to clipboard")
                }
            }
            clip.writeSync(dotviz)
            if (args.open) {
                open("https://dreampuf.github.io/GraphvizOnline")
            }
            return dotviz
        } else if (args.events) {
            // generate swagger
            const events = new EventsGen(allFiles, rules)
            const doc = events.generate()
            const version = "# generated by Reslang " + VERSION + "\n"
            const yml =
                (args.noversion ? "" : version) +
                yaml.dump(clean(doc), { noRefs: true })
            if (args.stdout) {
                console.log(yml)
            } else {
                if (!silent) {
                    console.log("Success - AsyncAPI spec copied to clipboard")
                }
            }
            clip.writeSync(yml)
            if (args.open) {
                if (args.web) {
                    console.log(
                        "Paste the contents of the clipboard into the left pane in the browser"
                    )
                    open("https://playground.asyncapi.io/")
                } else {
                    // show asyncapi
                    exec("./show-asyncapi")
                }
            }
            return yml
        } else {
            // generate swagger
            const swag = new SwagGen(allFiles, rules)
            const swagger = swag.generate()
            const version = "# generated by Reslang " + VERSION + "\n"
            const yml =
                (args.noversion ? "" : version) +
                yaml.dump(clean(swagger), { noRefs: true })
            if (args.stdout) {
                console.log(yml)
            } else {
                if (!silent) {
                    console.log("Success - swagger copied to clipboard")
                }
            }
            clip.writeSync(yml)
            if (args.open) {
                if (args.web) {
                    console.log(
                        "Paste the contents of the clipboard into the left pane in the browser"
                    )
                    open("https://editor.swagger.io")
                } else {
                    // show redoc
                    exec("./show-redoc")
                }
            }
            return yml
        }
    } catch (error) {
        errorAndExit(args.stacktrace ? error : error.message)
    }
}

function errorAndExit(msg: any) {
    console.error("Reslang error: ", msg)
    process.exit(-1)
}
