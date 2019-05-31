import clip from "clipboardy"
import yaml from "js-yaml"
import generateSwagger from "./generate"
import { parseFile, clean} from "./parse"

if (process.argv.length !== 3) {
  console.error("Usage: reslang module")
  process.exit(-1)
}

const fname = process.argv[2]
const match = fname.match(/.*\/(.*).reslang/)
const title = match ? match[1] : fname

// parse and form swagger yaml
const tree = parseFile(fname)


const swag = generateSwagger(title, tree)
console.log(yaml.dump(clean(swag)))
clip.writeSync(yaml.dump(clean(swag)))
