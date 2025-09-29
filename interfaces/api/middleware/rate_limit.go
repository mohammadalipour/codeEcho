package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimiter holds the rate limiting logic
type RateLimiter struct {
	visitors map[string]*Visitor
	mu       sync.RWMutex
}

// Visitor represents a client with request limits
type Visitor struct {
	limiter  chan struct{}
	lastSeen time.Time
}

var rateLimiter = &RateLimiter{
	visitors: make(map[string]*Visitor),
}

// RateLimit middleware to prevent API abuse
func RateLimit() gin.HandlerFunc {
	// Clean up old visitors every minute
	go func() {
		for range time.Tick(time.Minute) {
			rateLimiter.mu.Lock()
			for ip, v := range rateLimiter.visitors {
				if time.Since(v.lastSeen) > 3*time.Minute {
					delete(rateLimiter.visitors, ip)
				}
			}
			rateLimiter.mu.Unlock()
		}
	}()

	return func(c *gin.Context) {
		ip := c.ClientIP()

		rateLimiter.mu.Lock()
		v, exists := rateLimiter.visitors[ip]
		if !exists {
			// Allow 50 concurrent requests per IP for frontend apps
			v = &Visitor{
				limiter:  make(chan struct{}, 50),
				lastSeen: time.Now(),
			}
			rateLimiter.visitors[ip] = v
		} else {
			v.lastSeen = time.Now()
		}
		rateLimiter.mu.Unlock()

		// Try to acquire a slot
		select {
		case v.limiter <- struct{}{}:
			defer func() {
				<-v.limiter
			}()
			c.Next()
		default:
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded. Please slow down your requests.",
			})
			c.Abort()
		}
	}
}
