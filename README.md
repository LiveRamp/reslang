# Reslang: API definitions made easy

Relang is a simple language for describing resource-oriented APIs & turning them into Swagger. It produces Swagger which is fully aligned with the RFC API-3 standards.

## Manual

Please see the [manual here](./.docs/manual.md].

## Installation

1. ensure node & yarn are installed
2. clone the repo
3. yarn install
4. yarn test

## Running

Test it out by typing:

    ./reslang

This should bring up the options.

## Creating swagger

To create swagger, you first create a reslang file. Then you simply ask the reslang program to turn this into swagger.

Note that the models directory has a set of example definitions.

    ./reslang models/simple-resource.reslang

This will also copy the swagger into the clipboard. If you want it to stdout also, use --stdout.

If you want it to open the swagger editor for you, use --open. You will then have to paste the clipboard into the editor.

    ./reslang models/simple-resource.reslang --stdout --open

## Creating a graphical view

Reslang can generate dotviz output, which provides a nice graphical view of the resources.

    ./reslang models/simple-resource.reslang --dotviz

will copy the dotviz output to the clipboard.

If you use --open, it will open your browser at a nice graphviz online editor. Paste the clipboard into the editor and you will get your graphjical view.

    ./reslang models/simple-resource.reslang --dotviz --open

