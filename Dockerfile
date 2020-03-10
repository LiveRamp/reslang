FROM mhart/alpine-node:12.16.1
RUN apk update
RUN apk upgrade
RUN apk add bash
RUN apk add xsel --repository=http://dl-cdn.alpinelinux.org/alpine/edge/testing

WORKDIR /app/reslang
COPY reslang .
COPY package.json .
COPY tsconfig.json .
COPY yarn.lock .
COPY src ./src/

RUN yarn install

ENTRYPOINT ["./reslang"]
