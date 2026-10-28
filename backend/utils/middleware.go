package utils

import (
	"context"
	"net/http"
	"net/url"
	"os"
	"social/services"
	"strings"
	"net/http"
    "time"

    "github.com/ulule/limiter/v3"
    "github.com/ulule/limiter/v3/drivers/store/memory"
)

// CorsMiddleware gère les CORS pour permettre les requêtes depuis le frontend
func CorsMiddleware(next http.Handler) http.Handler {
    // Origines autorisées (configurable via variable d'environnement)
    allowedOriginsRaw := os.Getenv("CORS_ALLOWED_ORIGINS")
    var allowedOrigins []string

    if allowedOriginsRaw == "" {
        // Origines par défaut (à adapter selon ton environnement)
        allowedOrigins = []string{
            "http://localhost:3000",
            "https://localhost:3000",
            "http://127.0.0.1:3000",
            "https://social-network-frontend-helbadao.fly.dev",
            "https://social-network.houssam-elbadaoui.tech",
        }
    } else {
        // Parser les origines depuis la variable d'environnement
        allowedOrigins = strings.Split(allowedOriginsRaw, ",")
        for i, origin := range allowedOrigins {
            allowedOrigins[i] = strings.TrimSpace(origin)
        }
    }

    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        origin := r.Header.Get("Origin")

        // Vérifier si l'origine est autorisée
        if !isOriginAllowed(origin, allowedOrigins) {
            // Ne pas autoriser les CORS si l'origine n'est pas dans la liste
            w.Header().Set("Vary", "Origin")
            next.ServeHTTP(w, r)
            return
        }

        // Autoriser l'origine
        w.Header().Set("Access-Control-Allow-Origin", origin)
        w.Header().Set("Access-Control-Allow-Credentials", "true")
        w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, PATCH")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        w.Header().Set("Access-Control-Expose-Headers", "Content-Length, X-RateLimit-Limit, X-RateLimit-Remaining")
        w.Header().Set("Access-Control-Max-Age", "86400") // Cache pendant 24h
        w.Header().Set("Vary", "Origin")

        // Gérer les requêtes OPTIONS (preflight)
        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }

        next.ServeHTTP(w, r)
    })
}

func normalizeOrigin(origin string) string {
	origin = strings.TrimSpace(origin)
	if origin == "" {
		return ""
	}

	u, err := url.Parse(origin)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return ""
	}

	return strings.ToLower(u.Scheme + "://" + u.Host)
}

func isOriginAllowed(origin string, allowedOrigins []string) bool {
    if origin == "" {
        return false
    }

    for _, allowed := range allowedOrigins {
        if strings.EqualFold(origin, allowed) {
            return true
        }
    }

    return false
}

// AuthMiddleware vérifie l'authentification et injecte l'userID dans le contexte
func AuthMiddleware(sessionService *services.SessionService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, err := sessionService.GetUserIDFromSession(r)
			if err != nil {
				WriteError(w, http.StatusUnauthorized, "Unauthorized")
				return
			}

			ctx := context.WithValue(r.Context(), "userID", userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetUserIDFromContext récupère l'userID depuis le contexte
func GetUserIDFromContext(ctx context.Context) (int, bool) {
	userID, ok := ctx.Value("userID").(int)
	return userID, ok
}

// RateLimitMiddleware limite le nombre de requêtes par IP
func RateLimitMiddleware(next http.Handler) http.Handler {
    // Configuration : 100 requêtes par minute par IP
    rate := limiter.Rate{
        Period: 1 * time.Minute,
        Limit:  100,
    }

    // Stocker les requêtes en mémoire (pour le dev)
    // En production, utiliser Redis : limiter.NewRedisStore(redisClient)
    store := memory.NewStore()

    limiterInstance := limiter.New(store, rate)

    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Récupérer l'IP du client
        ip := getClientIP(r)

        // Vérifier le rate limit pour cette IP
        context, err := limiterInstance.Get(r.Context(), ip)
        if err != nil {
            WriteError(w, http.StatusInternalServerError, "rate limiter error")
            return
        }

        // Ajouter les headers pour informer le client
        w.Header().Add("X-RateLimit-Limit", fmt.Sprintf("%d", context.Limit))
        w.Header().Add("X-RateLimit-Remaining", fmt.Sprintf("%d", context.Remaining))

        // Si la limite est atteinte
        if context.Reached {
            WriteError(w, http.StatusTooManyRequests, "too many requests, please try again later")
            return
        }

        // Sinon, continuer
        next.ServeHTTP(w, r)
    })
}

// getClientIP récupère l'IP du client (en tenant compte des proxys)
func getClientIP(r *http.Request) string {
    // Vérifier les headers courants pour les proxys
    ip := r.Header.Get("X-Real-IP")
    if ip == "" {
        ip = r.Header.Get("X-Forwarded-For")
    }
    if ip == "" {
        ip = r.RemoteAddr
    }

    // Si X-Forwarded-For contient plusieurs IPs, prendre la première
    if strings.Contains(ip, ",") {
        ip = strings.Split(ip, ",")[0]
    }

    return strings.TrimSpace(ip)
}
