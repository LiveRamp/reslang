import clip from "clipboardy"
import yaml from "js-yaml"
import DotvizGen from "./dotvizgen"
import SwagGen from "./swaggen"
import { parseFile, clean } from "./parse"
import yargs from "yargs"
import open from "open"

// parse the cmd line
const args = yargs
    .usage("Usage: reslang module.reslang")
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
        if (arg._.length != 1) {
            throw new Error("Needs 1 module to process")
        }
        return true
    }).argv

const files = args._
const fname = files[0]

const match = fname.match(/(?<path>.*\/)?(?<file>.*).reslang/)
if (!match) {
    console.error(`Filename ${fname} must have .reslang extension`)
    process.exit(-1)
}
const path = match!.groups!.path ? match!.groups!.path : "./"
const title = match!.groups!.file

try {
    const tree = parseFile(fname)

    // generate a parse tree?
    if (args.parsed) {
        const json = JSON.stringify(tree, null, 2)
        if (args.stdout) {
            console.log(json)
        } else {
            console.log("Success - parse tree copied to clipboard")
        }
        clip.writeSync(json)
    }
    // generate .viz?
    else if (args.dotviz) {
        const dot = new DotvizGen(path, title, tree)
        dot.processImports()
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
        const swag = new SwagGen(path, title, tree)
        swag.processImports()
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
    console.error(error.message)
}
