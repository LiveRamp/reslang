#!/bin/bash

apis=(complex-resource direct2dist distribution file request simple-resource singleton stringmaps upversion)

for api in "${apis[@]}"
do
   : 
   echo Updating test data for ${api}
    ./reslang ./models/${api} --stdout > ./models/${api}/swagger.expected
    ./reslang ./models/${api} --stdout --parsed > ./models/${api}/parsed.expected
done

echo Updated test data
