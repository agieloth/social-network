package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"social/hub"
	"social/models"
	"social/services"
	"social/utils"
	"strings"
)

type Handler struct {
	authService    *services.AuthService
	sessionService *services.SessionService
	Hub            *hub.Hub
}

func NewHandler(service *services.AuthService, sessionService *services.SessionService, hub *hub.Hub) *Handler {
	return &Handler{authService: service, sessionService: sessionService, Hub: hub}
}

func (h *Handler) RegisterHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    // Détecter le type de contenu
    contentType := r.Header.Get("Content-Type")
    var form models.RegisterRequest
    var err error

    // Cas 1: JSON (ex: Postman, requêtes sans fichier)
    if strings.Contains(contentType, "application/json") {
        err = json.NewDecoder(r.Body).Decode(&form)
        if err != nil {
            utils.WriteError(w, http.StatusBadRequest, "Invalid JSON")
            return
        }
        // Pas de fichier dans ce cas, avatar reste vide
        form.Avatar = ""

    // Cas 2: Multipart (ex: frontend avec upload d'avatar)
    } else if strings.Contains(contentType, "multipart/form-data") {
        if err := utils.ParseMultipartFormSafe(r, 10<<20); err != nil {
            utils.WriteError(w, http.StatusBadRequest, "Invalid form")
            return
        }

        form = models.RegisterRequest{
            Email:       r.FormValue("email"),
            Password:    r.FormValue("password"),
            FirstName:   r.FormValue("first_name"),
            LastName:    r.FormValue("last_name"),
            DateOfBirth: r.FormValue("date_of_birth"),
            Nickname:    r.FormValue("nickname"),
            About:       r.FormValue("about"),
        }

        // Upload avatar optionnel
        avatarPath, err := utils.HandleOptionalFileUpload(
            r,
            "avatar",
            utils.DefaultImageUploadConfig("uploads/avatars"),
        )
        if err != nil {
            utils.WriteError(w, http.StatusBadRequest, "Failed to upload avatar: "+err.Error())
            return
        }
        form.Avatar = avatarPath

    // Cas 3: Type inconnu
    } else {
        utils.WriteError(w, http.StatusUnsupportedMediaType, "Unsupported content type")
        return
    }

    // Valider les données (nouvelle validation)
    if err := form.Validate(); err != nil {
        if valErr, ok := err.(*models.ValidationError); ok {
            utils.WriteValidationError(w, valErr)
        } else {
            utils.WriteError(w, http.StatusBadRequest, err.Error())
        }
        return
    }

    // Déléguer au service
    err = h.authService.Register(form)
    if err != nil {
        utils.WriteError(w, http.StatusConflict, "Could not register: "+err.Error())
        return
    }

    utils.WriteSuccess(w, "Registered successfully")
}

func (h *Handler) LoginHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("from login")
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	user, err := h.authService.Login(req.Email, req.Password)
	if err != nil {
		utils.WriteError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	sessionID, expiration, err := h.sessionService.CreateSession(user.ID)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "Could not create session")
		return
	}

	// Set session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    sessionID,
		Expires:  expiration,
		Path:     "/",
		HttpOnly: true,
		// Secure:   true, // Toujour true (HTTPS obligatoire)
		Secure: r.TLS != nil,
		SameSite: http.SameSiteStrictMode, // Bloque les attaques CSRF
	})

	user.Avatar = utils.PrepareAvatarURL(user.Avatar)

	utils.WriteJSON(w, http.StatusOK, user)
}

func (h *Handler) LogoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	cookie, err := r.Cookie("session_id")
	if err != nil {
		utils.WriteError(w, http.StatusUnauthorized, "No session cookie found")
		return
	}

	// Utiliser le service au lieu d'accès direct à la DB
	err = h.sessionService.DeleteSession(cookie.Value)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "Failed to log out")
		return
	}

	// Clear cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		// Secure:   true,
		Secure: r.TLS != nil,
		SameSite: http.SameSiteStrictMode,
	})

	utils.WriteSuccess(w, "Logged out successfully")
}