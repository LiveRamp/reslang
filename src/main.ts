import clip from "clipboardy"
import yaml from "js-yaml"
import SwagGen from "./generate"
import { parseFile, clean } from "./parse"

if (process.argv.length !== 3) {
    console.error("Usage: reslang module")
    process.exit(-1)
}

const fname = process.argv[2]
const match = fname.match(/(?<path>.*\/)?(?<file>.*).reslang/)
if (!match) {
    console.error(`Filename ${fname} must have .reslang extension`)
    process.exit(-1)
}
const path = match!.groups!.path ? match!.groups!.path : "./"
const title = match!.groups!.file

// parse and form swagger yaml
const tree = parseFile(fname)

try {
    const swag = new SwagGen(path, title, tree)
    swag.processImports()
    const swagger = swag.generateSwagger()

    console.log(yaml.dump(clean(swagger)))
    clip.writeSync(yaml.dump(clean(swagger)))
} catch (error) {
    console.error(error.message)
}
