import clip from "clipboardy"
import yaml from "js-yaml"
import DotvizGen from "./gendotviz"
import SwagGen from "./genswagger"
import { clean } from "./parse"
import yargs from "yargs"
import open from "open"
import ParseGen from "./genparse"

// parse the cmd line
const args = yargs
    .usage("Usage: reslang namespace_directory [focus.reslang]*")
    .option("dotviz", {
        type: "boolean",
        describe:
            "Create dotviz graphical output of the resources. note optional focus files, for generation or diagramming"
    })
    .option("dotvizlr", {
        type: "boolean",
        describe: "Create lr dotviz graphical output of the resources"
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
    .option("stacktrace", {
        type: "boolean",
        describe: "Show full stacktrace of any errors"
    })
    .check(arg => {
        if (arg._.length < 1) {
            throw new Error("Needs a module at least to process")
        }
        return true
    }).argv

// filter out the directories and focus files
const files = new Array<string>()
const focus = new Array<string>()
for (const arg of args._) {
    if (arg.endsWith(".reslang")) {
        focus.push(arg)
    } else {
        files.push(arg)
    }
}

try {
    // generate a parse tree?
    if (args.parsed) {
        const json = new ParseGen(files, focus).generate()
        if (args.stdout) {
            console.log(json)
        } else {
            console.log("Success - parse tree copied to clipboard")
        }
        clip.writeSync(json)
    } else if (args.dotviz || args.dotvizlr) {
        // generate .viz?
        const dot = new DotvizGen(files, focus)
        const dotviz = dot.generate(!!args.dotvizlr)
        if (args.stdout) {
            console.log(dotviz)
        } else {
            console.log("Success - dotviz copied to clipboard")
        }
        clip.writeSync(dotviz)
        if (args.open) {
            open("https://dreampuf.github.io/GraphvizOnline")
        }
    } else {
        // generate swagger
        const swag = new SwagGen(files, focus)
        const swagger = swag.generate()
        const yml = yaml.dump(clean(swagger))
        if (args.stdout) {
            console.log(yml)
        } else {
            console.log("Success - swagger copied to clipboard")
        }
        clip.writeSync(yml)
        if (args.open) {
            open("https://editor.swagger.io")
        }
    }
} catch (error) {
    console.error(args.stacktrace ? error.message : error)
}
