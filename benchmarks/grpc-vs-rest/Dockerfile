# Generates the protobuf/gRPC Go code from proto/users.proto at build time, rather than committing
# generated code — same "real, runnable, reproducible from source" standard the other harnesses in
# this repo hold themselves to (benchmarks/pgbouncer-vs-direct builds PgBouncer from source for the
# same reason).
FROM golang:1.25-alpine AS protoc-stage
RUN apk add --no-cache protobuf protobuf-dev
WORKDIR /app
COPY proto ./proto
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
ENV PATH="$PATH:/root/go/bin"
RUN mkdir -p pb && \
    protoc --go_out=pb --go_opt=paths=source_relative \
      --go-grpc_out=pb --go-grpc_opt=paths=source_relative \
      -I proto proto/users.proto

FROM golang:1.25-alpine AS build
WORKDIR /app
COPY go.mod ./
COPY --from=protoc-stage /app/pb ./pb
COPY internal ./internal
COPY server ./server
COPY client ./client
RUN go mod tidy
RUN go build -o /out/server ./server
RUN go build -o /out/client ./client

FROM alpine:3.20
COPY --from=build /out/server /usr/local/bin/server
COPY --from=build /out/client /usr/local/bin/client
