# Reslang: API definitions made easy

Relang is a simple language for describing resource-oriented APIs & turning them into Swagger. It produces Swagger which is fully aligned with the RFC API-3 standards.

It can also generate an [AsyncAPI specification](https://www.asyncapi.com/), describing events, from the same spec.

[Release notes, v1.1.0](./docs/releases.md)

## Docs

|                                                      |                                                                            |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| [Why reslang?](./docs/why.md)                        | Why do we need this tool and what does it offer?                           |
| [Intro tutorial](./docs/intro.md)                    | Describes making a toy API for manipulating files and directories.         |
| [Event intro tutorial](./docs/intro-events.md)       | Describes a simple example of how to generate AsyncAPI to describe events  |
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
This script outputs the generated swagger to STDOUT and requires an absolute path to function.

```
    bash ./reslang-docker.sh <full-path-to-reslang-folder>
```

## Creating & viewing the Swagger / OpenAPI

To create swagger, you first create a reslang file. Then you simply ask the reslang program to turn this into swagger.

Note that the models directory has a set of example definitions.

The following copies the swagger to the clipboard and opens the Swagger editor for you. You will then have to paste into the editor.

    ./reslang models/simple-resource --open

If you want just want to print to stdout use:

    ./reslang models/simple-resource --stdout

## Viewing Swagger / OpenAPI in ReDoc

ReDoc has an advanced Swagger viewer which is far nicer than Swagger UI. To use this, type:

    ./reslang models/simple-resource --open --redoc

You're welcome.

## Creating a graphical view

Reslang can generate dotviz output, which provides a nice graphical view of the resources.

The following command will copy the dotviz output to the clipboard.

    ./reslang models/simple-resource --open --diagram main

This will open your browser at a nice graphviz online editor. Paste the clipboard into the editor and you will get your graphical view.

## Viewing events via AsyncAPI

Reslang can generate AsyncAPI, describing the events a REST API can generate. It also provides an "event" keyword which you can use to describe adhoc events.

The following command will copy the OpenAPI output to the clipboard & open up the AsyncAPI playgroud. Paste the clipboard into the editor to get a view of your events.

    ./reslang models/eventing --open --events
