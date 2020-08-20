#!/bin/bash

apis=(gendiagram servers linked databuyer eventing dataset checkrules privacy optionality authorization complex-resource patchable direct2dist distribution file request simple-resource singleton stringmaps upversion multiplicity namespaces)

echo "Regenerating event files"
echo "---"
    ./reslang --noversion --events --ignorerules ${apis[@]} --testdir ./models --testwrite ./testdata/asyncapi.expected
echo
echo "---"
echo "Regenerating swagger files"
echo "---"
    ./reslang --noversion --ignorerules ${apis[@]} --testdir ./models --testwrite ./testdata/swagger.expected
echo
echo "---"
echo "Regenerating parse tree files"
echo "---"
    ./reslang --noversion --ignorerules ${apis[@]} --testdir ./models --testwrite ./testdata/parsed.expected --parsed
echo
echo "---"
echo "Regenerating Dotviz files"
echo "---"
    ./reslang --noversion --ignorerules ${apis[@]} --testdir ./models --testwrite ./testdata/dotviz.expected --diagram main 
echo
echo "---"

echo Updated test data
