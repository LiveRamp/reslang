# Be sure to TSC first! :)

FROM mhart/alpine-node:12.16.1
WORKDIR /app/reslang

COPY reslang .
COPY dist dist
COPY node_modules dist/node_modules

ENTRYPOINT ["./reslang"]
