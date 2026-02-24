FROM node:18-alpine
RUN apk add --update --no-cache bash

WORKDIR /app/reslang
COPY reslang package.json tsconfig.json yarn.lock ./
COPY src ./src/

RUN yarn install --frozen-lockfile --non-interactive

ENTRYPOINT ["./reslang"]
