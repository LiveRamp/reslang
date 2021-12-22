# Reslang: API definitions made easy

Reslang is a simple language for describing resource-oriented APIs & turning them into Swagger. It produces Swagger/OpenAPI which is fully aligned with [LiveRamp's API standards](https://liveramp.atlassian.net/wiki/spaces/CI/pages/1014498273/RFC+API-3+LiveRamp+API+Standards).

It can also generate an [AsyncAPI specification](https://www.asyncapi.com/), describing events, from the same spec. Recently we have added the ability to generate [JSON schema](https://json-schema.org/) from the Reslang spec too.

[Release notes](./docs/releases.md)

Reslang is licensed under [Apache V2](https://www.apache.org/licenses/LICENSE-2.0)

## Docs

| Topic                                                    | Description                                                                                  |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [Why reslang?](./docs/why.md)                            | Why do we need this tool and what does it offer?                                             |
| [Intro tutorial](./docs/intro.md)                        | Describes making a toy API for manipulating files and directories.                           |
| [The API paradigm](./docs/paradigm.md)                   | What is the Reslang paradigm and how does it relate to REST, OO and RPC                      |
| [Event intro tutorial](./docs/intro-events.md)           | Describes a simple example of how to generate AsyncAPI to describe events                    |
| [Sections](./docs/sections.md)                           | This explains how to reorder / group the presentation of your resources                      |
| [Direct2Dist API](./docs/direct2dist-explanation.md)     | This is a more complex example which recreates the entire Direct2Dist API.                   |
| [MULTI verbs](./docs/multi.md)                           | Describes MULTI- verbs such as MULTIPOST, MULTIPATCH etc                                     |
| [Reference manual](./docs/reference.md)                  | This describes the syntax and features in more depth.                                        |
| [Server blocks](./docs/server-blocks.md)                 | This explains how to define servers for REST and events APIs                                 |
| [JSON schema generation](./docs/jsonschema.md)           | This explains how to generate JSON schema definitions from Reslang code                      |
| [Internal System Design](./docs/ReslangSystemDesign.pdf) | Explains how Reslang is structured as a typescript application, and how the transpiler works |
| [VSCode Syntax highlighting](./vscode/README.md)         | Explains how to install VSCode syntax highlighting. Hint search extensions for Reslang!      |

## Installation

### For local use

1. ensure node & yarn are installed

(This is the node.js stack - please see here for installation instructions: [node.js](https://nodejs.org/en/download/) & [yarn](https://classic.yarnpkg.com/en/docs/install/#mac-stable))

2. clone the reslang repo
3. yarn install
4. ./install-reslang

Note that step 4 installs it as a command line tool using "yarn link"

## Running

Test it out by typing:

    reslang

This should bring up the options.

<details>
  <summary>Click to see Installation options</summary>

## Running in Docker (for internal LiveRamp users only)

Individuals who do not want to build Reslang from scratch are free to use the `reslang-docker` script which provides convenient, but limited, functionality with a reslang container.
This script outputs the generated swagger to STDOUT and requires an absolute path to function.

```
    bash ./reslang-docker.sh $PWD/models/distribution
```

</details>

## Creating & viewing the Swagger / OpenAPI

To create swagger, you first create a reslang file. Then you simply ask the reslang program to turn this into swagger.

Note that the models directory has a set of example definitions.

The following copies the swagger to the clipboard and opens the ReDoc browser for you.

    reslang models/simple-resource --open

If you want just want to print to stdout use:

    reslang models/simple-resource --stdout

## Viewing Swagger / OpenAPI in Swagger editor

If you want to use the Swagger editor, add --web to the cmd line:

    reslang models/simple-resource --open --web

Then paste the clipboard into the left window pane of the editor.

## Creating a graphical view

Reslang can generate dotviz output, which provides a nice graphical view of the resources.

The following command will copy the dotviz output to the clipboard.

    reslang models/simple-resource --open --diagram main

This will open your browser at a nice graphviz online editor. Paste the clipboard into the editor and you will get your graphical view of your API - a resource diagram.

## Viewing events via AsyncAPI

Reslang can generate AsyncAPI, describing the events a REST API can generate. It also provides an "event" keyword which you can use to describe adhoc events.

    reslang models/eventing --open --events

If instead you wish to view the events in the AsyncAPI Playgrounder for editing, please add the --web option.

    reslang models/eventing --open --events --web

Note that the AsyncAPI spec has been copied to the clipboard - you will need to paste it into the opened editor, on the left.

## Pretty Printing - Stripping out the comments for review

Reslang can produce a nice pretty-printed, stripped down version of the Reslang in html. It is often easier to review this form, as it removes the comments and error structures.

    reslang models/resources --stripped --open

Will open a browser on the stripped down file. If you just want plain text, add --plain

## Requesting new features

New features and enhancements that involve changing LiveRamp's API standards
will not be considered until the [API standards proposal process][standards process] is complete.

Other enhancements should be requested by opening a GitHub Issue using the
appropriate issue template or by opening a Pull Request and having your changes
reviewed by the API Squad.

[standards process]: https://docs.google.com/document/d/1X3fcFYLdsRzsQeX89zdmCOoisNsD6X-wcrtYcb8MkGA/edit
