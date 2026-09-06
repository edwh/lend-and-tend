# Fly-optimized apiv2. Build context is the (upstream, untouched) iznik-server-go
# repo. Identical to iznik-server-go/Dockerfile EXCEPT the main API is compiled
# to a binary at BUILD time — upstream runs `go run main.go` in a loop at
# container start (~2 min compile on every cold start / restart / deploy), which
# makes scale-to-zero and fast deploys impossible. Pre-compiling gives a
# sub-second boot so this app can scale to zero.
FROM ghcr.io/freegle/freegle-base:latest

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY knn-server/go.mod knn-server/go.sum knn-server/
RUN cd knn-server && go mod download

COPY . .
RUN go mod tidy

# knn-server binary (upstream already does this) + the main API binary (new).
RUN cd knn-server && go build -o /usr/local/bin/knn-server .
RUN go build -o /usr/local/bin/iznik-api .

RUN echo "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown') $(date -u '+%Y-%m-%d %H:%M:%S UTC')" > /app/BUILD_INFO
RUN chmod +x generate-swagger.sh && ./generate-swagger.sh
RUN mkdir -p /data

ENV KNN_PORT=8194 \
    KNN_ADMIN_PORT=8195 \
    KNN_INDEX_PATH=/data/knn-locations.db

EXPOSE 8192 8194 8195

# Same supervisor-style loop as upstream, but running the pre-built binary
# instead of `go run main.go`. (Dropped upstream's CMD line that echoed the DB
# password into the logs.)
CMD (while true; do knn-server >> /tmp/knn_server.out 2>&1; sleep 1; done &) \
  && while true; do iznik-api >> /tmp/iznik_api.out 2>&1; sleep 1; done
