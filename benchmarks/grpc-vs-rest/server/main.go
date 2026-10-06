// server runs a gRPC listener (:50051) and a REST/JSON listener (:8080) side by side in the same
// process, both backed by the same internal/gen.MakeUser generator — the only variable the bench
// client's two -target modes are meant to isolate is the protocol, not the data.
package main

import (
	"context"
	"encoding/json"
	"log"
	"net"
	"net/http"
	"strconv"
	"strings"

	"google.golang.org/grpc"

	"grpc-vs-rest/internal/gen"
	pb "grpc-vs-rest/pb"
)

type userServer struct {
	pb.UnimplementedUserServiceServer
}

func toProto(u gen.UserData) *pb.User {
	return &pb.User{
		Id:            u.ID,
		Name:          u.Name,
		Email:         u.Email,
		Tags:          u.Tags,
		CreatedAtUnix: u.CreatedAtUnix,
		Bio:           u.Bio,
	}
}

func (s *userServer) GetUser(_ context.Context, req *pb.GetUserRequest) (*pb.User, error) {
	return toProto(gen.MakeUser(req.Id)), nil
}

func (s *userServer) ListUsers(_ context.Context, req *pb.ListUsersRequest) (*pb.ListUsersResponse, error) {
	count := int(req.Count)
	users := make([]*pb.User, count)
	for i := 0; i < count; i++ {
		users[i] = toProto(gen.MakeUser(int64(i)))
	}
	return &pb.ListUsersResponse{Users: users}, nil
}

// restUser mirrors gen.UserData field-for-field, with the json tags a hand-written REST API would
// actually use — not the Go-exported field names verbatim, so this is a realistic REST payload
// shape, not a reflection dump.
type restUser struct {
	ID            int64    `json:"id"`
	Name          string   `json:"name"`
	Email         string   `json:"email"`
	Tags          []string `json:"tags"`
	CreatedAtUnix int64    `json:"created_at_unix"`
	Bio           string   `json:"bio"`
}

func toRest(u gen.UserData) restUser {
	return restUser{ID: u.ID, Name: u.Name, Email: u.Email, Tags: u.Tags, CreatedAtUnix: u.CreatedAtUnix, Bio: u.Bio}
}

func main() {
	go runGRPC()
	runREST()
}

func runGRPC() {
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("grpc listen: %v", err)
	}
	s := grpc.NewServer()
	pb.RegisterUserServiceServer(s, &userServer{})
	log.Println("grpc listening on :50051")
	if err := s.Serve(lis); err != nil {
		log.Fatalf("grpc serve: %v", err)
	}
}

func runREST() {
	mux := http.NewServeMux()

	mux.HandleFunc("/users/", func(w http.ResponseWriter, r *http.Request) {
		idStr := strings.TrimPrefix(r.URL.Path, "/users/")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			http.Error(w, "invalid id", http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(toRest(gen.MakeUser(id)))
	})

	mux.HandleFunc("/users", func(w http.ResponseWriter, r *http.Request) {
		countStr := r.URL.Query().Get("count")
		count, err := strconv.Atoi(countStr)
		if err != nil || count < 1 {
			http.Error(w, "invalid count", http.StatusBadRequest)
			return
		}
		users := make([]restUser, count)
		for i := 0; i < count; i++ {
			users[i] = toRest(gen.MakeUser(int64(i)))
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(users)
	})

	log.Println("rest listening on :8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatalf("rest serve: %v", err)
	}
}
