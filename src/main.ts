import { parseFile } from "./parse"

if (process.argv.length !== 3) {
  console.error("Usage: reslang module")
  process.exit(-1)
}

const tree = parseFile(process.argv[2])
console.log(JSON.stringify(tree, null, 2))
