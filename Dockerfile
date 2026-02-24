FROM node:18-alpine

# Install bash and create non-root user for security
RUN apk add --update --no-cache bash \
    && addgroup -S appgroup \
    && adduser -S appuser -G appgroup

WORKDIR /app/reslang
COPY reslang package.json tsconfig.json yarn.lock ./
COPY src ./src/

# Install dependencies and change ownership to non-root user
RUN yarn install --frozen-lockfile --non-interactive \
    && chown -R appuser:appgroup /app/reslang

USER appuser

ENTRYPOINT ["./reslang"]
