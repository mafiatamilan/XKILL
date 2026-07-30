package pagination

import (
	"encoding/base64"
	"encoding/json"
)

type Cursor string

type PageRequest struct {
	Cursor Cursor `form:"cursor"`
	Limit  int    `form:"limit,default=20"`
}

type PageResponse[T any] struct {
	Data       []T    `json:"data"`
	NextCursor Cursor `json:"next_cursor,omitempty"`
	HasMore    bool   `json:"has_more"`
}

func EncodeCursor(v interface{}) (Cursor, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	return Cursor(base64.URLEncoding.EncodeToString(b)), nil
}

func DecodeCursor(c Cursor, v interface{}) error {
	b, err := base64.URLEncoding.DecodeString(string(c))
	if err != nil {
		return err
	}
	return json.Unmarshal(b, v)
}
