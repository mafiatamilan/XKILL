package search

import "context"

type Repository interface {
	Search(ctx context.Context, query SearchQuery) (*SearchResponse, error)
	Index(ctx context.Context, id, docType string, doc interface{}) error
	Delete(ctx context.Context, id string) error
}
