// Package gen is the single source of truth for what a "user" record looks like — shared by both
// the gRPC and REST handlers in server/main.go, so a given id produces byte-for-byte identical
// *content* on both protocols. Anything else would make a throughput or wire-size difference
// between them ambiguous: is it the protocol, or did one path just serve a different payload?
package gen

import "fmt"

type UserData struct {
	ID            int64
	Name          string
	Email         string
	Tags          []string
	CreatedAtUnix int64
	Bio           string
}

// ~210 bytes — long enough that serialization cost and wire size are actually worth measuring,
// short enough to stay a "user profile blurb," not an outlier payload no real API would ship.
const bioFiller = "Backend engineer focused on distributed systems, queues, and the trade-offs nobody puts in the README. Writes benchmarks instead of taking claims about them on faith."

func MakeUser(id int64) UserData {
	return UserData{
		ID:            id,
		Name:          fmt.Sprintf("User %d", id),
		Email:         fmt.Sprintf("user%d@example.com", id),
		Tags:          []string{"go", "distributed-systems", fmt.Sprintf("cohort-%d", id%5)},
		CreatedAtUnix: 1700000000 + id*3600,
		Bio:           bioFiller,
	}
}
