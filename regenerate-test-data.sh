#!/bin/bash

apis=(simple-resource complex-resource singleton upversion request file)

for api in "${apis[@]}"
do
   : 
   echo Updating test data for ${api}
    ./reslang ./models/new/${api} --stdout > ./src/tests/swagger_outputs/${api}.expected
    ./reslang ./models/new/${api} --stdout --dotviz > ./src/tests/dotviz_outputs/${api}.expected
    ./reslang ./models/new/${api} --stdout --parsed > ./src/tests/parsed_outputs/${api}.expected
done

echo Updated test data
