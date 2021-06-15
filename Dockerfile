FROM mhart/alpine-node:12.16.1
RUN apk add --update --no-cache bash

WORKDIR /app/reslang
COPY reslang package.json tsconfig.json yarn.lock ./
COPY src ./src/

RUN yarn install --frozen-lockfile --non-interactive

ENTRYPOINT ["./reslang"]
