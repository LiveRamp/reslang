# reslang-syntax-highlighting

Reslang is a DSL for building REST + event-based APIs. It's used at LiveRamp llc.

This extension supports syntax highlighting for Reslang. Written by Matt Connors @ LiveRamp.

It is a work in progress; this initial iteration is pretty basic, so as to get something mostly useful out the door.

## Usage

Search for reslang in the VSCode Extensions Marketplace. Woohoo.

Alternatively, if you want to install from a local package, go to the extensions view in VSCode. Then beside the search bar, click "...", select "Install from VSIX", and point it to [reslang-syntax-highlighting-0.0.1.vsix](reslang-syntax-highlighting-0.0.1.vsix)

## Rebuilding the package

The built package is the `.vsix` file. If you would like to rebuild it, run

```
yarn package
```

Be sure to bump the version if you intend on publishing it to VSCode extensions marketplace

```
yarn publish-extension
```

## Requests

Please file issues for any features you'd like to see.
