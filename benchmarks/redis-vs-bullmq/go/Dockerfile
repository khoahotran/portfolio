FROM golang:1.22-alpine
WORKDIR /app
COPY go.mod main.go ./
RUN go get github.com/redis/go-redis/v9@v9.7.0 && go mod tidy
RUN go build -o harness .
ENTRYPOINT ["./harness"]
