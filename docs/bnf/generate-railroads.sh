#!/usr/bin/env bash

# this concatenates the source grammars together and generates a railroad from them

cat ../../src/grammar/*.pegjs > grammar.pegjs

grammkit grammar.pegjs
# remove the evidence ;-P
rm grammar.pegjs