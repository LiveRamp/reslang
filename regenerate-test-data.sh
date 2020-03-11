#!/bin/bash

apis=(anydepth privacy optionality authorization complex-resource patchable direct2dist distribution file request simple-resource singleton stringmaps upversion multiplicity)

for api in "${apis[@]}"
do
   :
   echo Updating test data for ${api}
    ./reslang ./models/${api} --stdout > ./models/${api}/swagger.expected
    ./reslang ./models/${api} --stdout --parsed > ./models/${api}/parsed.expected
    ./reslang ./models/${api} --stdout --diagram main > ./models/${api}/dotviz.expected
done

echo Updated test data
