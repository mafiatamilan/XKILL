package search

import "context"

type SearchService interface {
	Search(ctx context.Context, query SearchQuery) (*SearchResponse, error)
	IndexDocument(ctx context.Context, doc interface{}) error
	DeleteDocument(ctx context.Context, id string) error
	Reindex(ctx context.Context, docType string) error
}
