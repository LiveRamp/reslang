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
    .usage("Usage: reslang namespace_directory(s)")
    .option("dotviz", {
        type: "boolean",
        describe: "create dotviz graphical output of the resources"
    })
    .option("parsed", {
        type: "boolean",
        describe: "write the parsed output as a tree"
    })
    .option("stdout", {
        type: "boolean",
        describe: "write output to stdout as well as clipboard"
    })
    .option("open", {
        type: "boolean",
        describe: "open browser to the appropriate website for output"
    })
    .check(arg => {
        if (arg._.length < 1) {
            throw new Error("Needs 1 or more modules to process")
        }
        return true
    }).argv

const files = args._

try {
    // generate a parse tree?
    if (args.parsed) {
        const json = new ParseGen(files).generate()
        if (args.stdout) {
            console.log(json)
        } else {
            console.log("Success - parse tree copied to clipboard")
        }
        clip.writeSync(json)
    }
    // generate .viz?
    else if (args.dotviz) {
        const dot = new DotvizGen(files)
        const dotviz = dot.generate()
        if (args.stdout) {
            console.log(dotviz)
        } else {
            console.log("Success - dotviz copied to clipboard")
        }
        clip.writeSync(dotviz)
        if (args.open) {
            open("https://dreampuf.github.io/GraphvizOnline")
        }
    }
    // generate swagger
    else {
        const swag = new SwagGen(files)
        const swagger = swag.generate()
        let yml = yaml.dump(clean(swagger))
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
    console.error(error)
}
