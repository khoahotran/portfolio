FROM golang:1.22-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY go.mod main.go ./
RUN go get github.com/gorilla/websocket@v1.5.3 && go mod tidy
RUN go build -o harness .
ENTRYPOINT ["./harness"]
