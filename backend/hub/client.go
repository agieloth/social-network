package hub

import (
	"encoding/json"
	"log"
	"time"

	"social/models"

	"github.com/gorilla/websocket"
)

type Client struct {
	ID   int
	Conn *websocket.Conn
	Send chan []byte
	LastActivity time.Time
}

const (
	writeWait      = 10 * time.Second
	pongWait       = 300 * time.Second   // 5 minutes timeout
	pingPeriod     = (pongWait * 9) / 10 // ~4.5 minutes between pings
	maxMessageSize = 512 * 1024          // 512 KB max message size
)

func (c *Client) readPump(hub *Hub) {
	defer func() {
		log.Printf("🔌 Client %d disconnecting from readPump\n", c.ID)
		hub.Unregister <- c
		c.Conn.Close()
	}()

	c.LastActivity = time.Now()

	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.LastActivity = time.Now()
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	log.Printf("✅ Client %d readPump started, waiting for messages...\n", c.ID)

	for {
		_, msgBytes, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("❌ Client %d read error: %v", c.ID, err)
			} else {
				log.Printf("ℹ️ Client %d connection closed normally: %v", c.ID, err)
			}
			break
		}

		var msg models.Message
		if err := json.Unmarshal(msgBytes, &msg); err != nil {
			log.Printf("Invalid message JSON: %v, Raw: %s", err, string(msgBytes))
			continue
		}

		log.Printf("📥 Message received from client %d: Type=%s, To=%d, GroupID=%d, Content=%q",
			c.ID, msg.Type, msg.To, msg.GroupID, msg.Content)

		// Validate required fields based on message type
		if msg.Type == "" {
			log.Printf("❌ Missing message type from client %d", c.ID)
			continue
		}

		if msg.Type == "private" {
			if msg.From == 0 || msg.To == 0 || msg.Content == "" {
				log.Printf("❌ Missing required private message fields - From: %d, To: %d, Content: %q", msg.From, msg.To, msg.Content)
				continue
			}
		} else if msg.Type == "group_message" {
			if msg.From == 0 || msg.GroupID == 0 || msg.Content == "" {
				log.Printf("❌ Missing required group message fields - From: %d, GroupID: %d", msg.From, msg.GroupID)
				continue
			}
		}

		// Force correct sender ID and add timestamp
		msg.From = c.ID
		parsedTime, err := time.Parse(time.RFC3339, msg.Timestamp)
		if err != nil || parsedTime.IsZero() {
			parsedTime = time.Now()
		}
		msg.Timestamp = parsedTime.String()

		log.Printf("✅ Message validated and forwarded to hub - From: %d, Type: %s", msg.From, msg.Type)
		hub.Broadcast <- msg
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	log.Printf("✅ Client %d writePump started\n", c.ID)

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				log.Printf("🔌 Client %d Send channel closed\n", c.ID)
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				log.Printf("❌ Client %d NextWriter error: %v\n", c.ID, err)
				return
			}
			w.Write(message)

			if err := w.Close(); err != nil {
				log.Printf("❌ Client %d writer close error: %v\n", c.ID, err)
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf("❌ Client %d ping error: %v\n", c.ID, err)
				return
			}
		}
	}
}
