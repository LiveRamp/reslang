#!/usr/bin/env bash

# this concatenates the source grammars together and generates a railroad from them

cat ../../src/grammar/*.pegjs > grammar.pegjs

grammkit grammar.pegjs

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --headless \
  --disable-gpu \
  --no-margins \
  --print-to-pdf grammar.html
  mv output.pdf railroad-for-reslang.pdf

# remove the evidence ;-P
rm grammar.pegjs
rm grammar.html