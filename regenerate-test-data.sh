#!/bin/bash

apis=(
    "authorization"
    "checkrules"
    "complex-resource"
    "direct2dist"
    "distribution"
    "eventing"
    "file"
    "linked"
    "milkman"
    "multi"
    "multiplicity"
    "namespaces"
    "optionality"
    "patchable"
    "request"
    "servers"
    "simple-resource"
    "stringmaps"
    "table"
    "upversion")
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
echo "Regenerating JSON schema files"
echo "---"
    ./reslang --noversion --ignorerules ${apis[@]} --testdir ./models --testwrite ./testdata/jsonschema.expected --jsonschema noroot --followresources
echo
echo "---"

echo Updated test data
