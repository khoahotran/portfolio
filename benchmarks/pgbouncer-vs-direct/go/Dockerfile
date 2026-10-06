FROM golang:1.22-alpine
WORKDIR /app
COPY go.mod main.go ./
RUN go get github.com/lib/pq@v1.10.9 && go mod tidy
RUN go build -o harness .
ENTRYPOINT ["./harness"]
