package hub

import (
	"encoding/json"
	"net/http"
	"sync"

	"github.com/golang-jwt/jwt/v5"
	"github.com/nats-io/nats.go"
	"github.com/rs/zerolog/log"
)

type Client struct {
	ID       string
	UserID   string
	RoomID   string
	Send     chan []byte
	Conn     interface{}
}

type Message struct {
	Type    string          `json:"type"`
	Room    string          `json:"room"`
	Payload json.RawMessage `json:"payload"`
	UserID  string          `json:"user_id"`
}

type Hub struct {
	clients    map[*Client]bool
	rooms      map[string]map[*Client]bool
	register   chan *Client
	unregister chan *Client
	broadcast  chan Message
	nc         *nats.Conn
	mu         sync.RWMutex
	stopCh     chan struct{}
}

func New(nc *nats.Conn) *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		rooms:      make(map[string]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan Message, 256),
		nc:         nc,
		stopCh:     make(chan struct{}),
	}
}

func (h *Hub) Run() {
	sub, err := h.nc.Subscribe("realtime.*", func(msg *nats.Msg) {
		var message Message
		if err := json.Unmarshal(msg.Data, &message); err != nil {
			log.Error().Err(err).Msg("failed to unmarshal nats message")
			return
		}
		h.BroadcastToRoom(message.Room, message)
	})
	if err != nil {
		log.Fatal().Err(err).Msg("failed to subscribe to nats")
	}
	defer sub.Unsubscribe()

	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			if client.RoomID != "" {
				if h.rooms[client.RoomID] == nil {
					h.rooms[client.RoomID] = make(map[*Client]bool)
				}
				h.rooms[client.RoomID][client] = true
			}
			h.mu.Unlock()
			log.Info().Str("user_id", client.UserID).Str("room", client.RoomID).Msg("client connected")

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				if client.RoomID != "" && h.rooms[client.RoomID] != nil {
					delete(h.rooms[client.RoomID], client)
					if len(h.rooms[client.RoomID]) == 0 {
						delete(h.rooms, client.RoomID)
					}
				}
				close(client.Send)
			}
			h.mu.Unlock()
			log.Info().Str("user_id", client.UserID).Msg("client disconnected")

		case message := <-h.broadcast:
			h.BroadcastToRoom(message.Room, message)

		case <-h.stopCh:
			return
		}
	}
}

func (h *Hub) BroadcastToRoom(room string, message Message) {
	h.mu.RLock()
	clients, ok := h.rooms[room]
	h.mu.RUnlock()

	if !ok {
		return
	}

	data, err := json.Marshal(message)
	if err != nil {
		log.Error().Err(err).Msg("failed to marshal broadcast message")
		return
	}

	h.mu.RLock()
	for client := range clients {
		select {
		case client.Send <- data:
		default:
			h.mu.RUnlock()
			h.mu.Lock()
			delete(h.clients, client)
			if client.RoomID != "" && h.rooms[client.RoomID] != nil {
				delete(h.rooms[client.RoomID], client)
			}
			close(client.Send)
			h.mu.Unlock()
			h.mu.RLock()
		}
	}
	h.mu.RUnlock()
}

func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	log.Warn().Msg("WebSocket upgrade not yet implemented - returns 501")
	http.Error(w, "WebSocket not yet implemented", http.StatusNotImplemented)
}

func extractUserIDFromRequest(r *http.Request) string {
	tokenStr := r.URL.Query().Get("token")
	if tokenStr == "" {
		return "anonymous"
	}
	token, _, err := new(jwt.Parser).ParseUnverified(tokenStr, jwt.MapClaims{})
	if err != nil {
		return "anonymous"
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "anonymous"
	}
	sub, _ := claims["sub"].(string)
	return sub
}

func (h *Hub) Stop() {
	close(h.stopCh)
}
