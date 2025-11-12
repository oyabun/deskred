FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install git
RUN apk add --no-cache git

# Clone and build gosearch
RUN git clone https://github.com/ibnaleem/gosearch.git . && \
    go mod download && \
    go build -o gosearch .

# Final stage
FROM alpine:latest

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/gosearch /app/gosearch

# Create results directory
RUN mkdir -p /results

# Set the entrypoint
ENTRYPOINT ["/app/gosearch"]
