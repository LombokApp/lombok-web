FROM golang:1.22-alpine AS builder

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /tunnel-agent .

FROM scratch
COPY --from=builder /tunnel-agent /tunnel-agent
ENTRYPOINT ["/tunnel-agent"]
