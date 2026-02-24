FROM node:18-alpine
RUN apk add --update --no-cache bash

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app/reslang
COPY reslang package.json tsconfig.json yarn.lock ./
COPY src ./src/

RUN yarn install --frozen-lockfile --non-interactive

# Change ownership and switch to non-root user
RUN chown -R appuser:appgroup /app/reslang
USER appuser

ENTRYPOINT ["./reslang"]
