# Reslang: API definitions made easy

Relang is a simple language for describing resource-oriented APIs & turning them into Swagger. It produces Swagger which is fully aligned with the RFC API-3 standards.

## Docs

|                                                      |                                                                            |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| [Why reslang?](./docs/why.md)                        | Why do we need this tool and what does it offer?                           |
| [Intro tutorial](./docs/intro.md)                    | Describes making a toy API for manipulating files and directories.         |
| [Direct2Dist API](./docs.direct2dist-explanation.md) | This is a more complex example which recreates the entire Direct2Dist API. |
| [Reference manual](./docs/reference.md)              | This describes the syntax and features in more depth.                      |

## Installation

1. ensure node & yarn are installed
2. clone the repo
3. yarn install
4. yarn jest

## Running

Test it out by typing:

    ./reslang

This should bring up the options.

## Running in Docker
Individuals who do not want to build Reslang from scratch are free to use the `reslang-docker` script which provides convenient, but limited, functionality with a reslang container.
This script outputs the generated swagger and requires an absolute path to function.

## Creating & viewing the swagger

To create swagger, you first create a reslang file. Then you simply ask the reslang program to turn this into swagger.

Note that the models directory has a set of example definitions.

    ./reslang models/simple-resource.reslang

This will copy the swagger into the clipboard. If you want it to stdout also, use --stdout.

If you want it to open the swagger editor for you, use --open. You will then have to paste the clipboard into the editor.

    ./reslang models/simple-resource.reslang --open

## Viewing in ReDoc

ReDoc has an advanced Swagger viewer which is far nicer than Swagger UI. To use this, first install the redoc-cli command:

`npm -g install redoc-cli`

Then copy the swagger into a file, say swagger.yaml, and serve it up using:

`redoc-cli serve --watch swagger.yaml`

Finally, point your browser at localhost:8080

## Creating a graphical view

Reslang can generate dotviz output, which provides a nice graphical view of the resources.

The following command will copy the dotviz output to the clipboard.

    ./reslang models/simple-resource.reslang --diagram name

Note that you will need to make a diagram definition first. See [here](./docs/diagrams.md) for how it is done.

If you use the --open switch, it will open your browser at a nice graphviz online editor. Paste the clipboard into the editor and you will get your graphical view.

    ./reslang models/simple-resource.reslang --diagram name --open
