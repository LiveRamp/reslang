#!/bin/bash

apis=(dataset checkrules privacy optionality authorization complex-resource patchable direct2dist distribution file request simple-resource singleton stringmaps upversion multiplicity)

echo "Regenerating swagger files"
echo "---"
    ./reslang --ignorerules ${apis[@]} --testdir ./models --testwrite swagger.expected
echo
echo "---"
echo "Regenerating parse tree files"
echo "---"
    ./reslang --ignorerules ${apis[@]} --testdir ./models --testwrite parsed.expected --parsed
echo
echo "---"
echo "Regenerating Dotviz files"
echo "---"
    ./reslang --ignorerules ${apis[@]} --testdir ./models --testwrite dotviz.expected --diagram main 
echo
echo "---"

echo Updated test data
