import cli, { parseArguments } from "./cli"

((version: string | undefined) => {
  cli(parseArguments(), version || "UNKNOWN")
})(process.env.npm_package_version)
