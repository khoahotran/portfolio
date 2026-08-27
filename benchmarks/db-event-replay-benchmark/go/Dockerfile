FROM golang:1.22-alpine
WORKDIR /app
COPY go.mod main.go ./
RUN go get github.com/jackc/pgx/v5@v5.7.1 cloud.google.com/go/firestore@v1.17.0 google.golang.org/api@v0.203.0 && \
    go mod tidy
RUN go build -o harness .
ENTRYPOINT ["./harness"]
