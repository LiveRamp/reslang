import cli, { parseArguments } from "./cli"

// TODO: expose a strict/"production" mode enforcing proper parsing of the version
((version: string | undefined) => {
  cli(parseArguments(), version || "UNKNOWN")
})(process.env.npm_package_version)
