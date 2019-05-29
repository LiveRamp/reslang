import peg, { Parser } from "pegjs"
import fs, { exists } from "fs"

function readFile(name: string) {
  return fs.readFileSync(name, { encoding: "utf8" })
}

let grammar = readFile("src/grammar.pegjs")

let parser!: Parser
try {
  parser = peg.generate(grammar)
} catch (error) {
  console.log(
    `Problem reading grammar: ${error.message}, location: ${
      error.location.start.line
    }, ${error.location.start.column}`
  )
  process.exit(-1)
}

if (process.argv.length !== 3) {
  console.error("Usage: reslang module")
  process.exit(-1)
}
let module = process.argv[2]

let contents = readFile(module)

try {
  console.log(
    JSON.stringify(parser.parse(contents, { output: "parser" }), null, 2)
  )
} catch (error) {
  console.error(
    `Problem parsing: ${error.message}, location: ${
      error.location.start.line
    }, ${error.location.start.column}`
  )
}
