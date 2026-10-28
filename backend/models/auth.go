// ✅ NOUVEAU CODE (remplace tout le contenu du fichier)
package models

import (
    "regexp"
    "strings"
)

type RegisterRequest struct {
    Email       string `json:"email" validate:"required,email"`
    Password    string `json:"password" validate:"required,min=8"`
    FirstName   string `json:"first_name" validate:"required,min=2,max=50"`
    LastName    string `json:"last_name" validate:"required,min=2,max=50"`
    DateOfBirth string `json:"date_of_birth"`
    Nickname    string `json:"nickname"`
    About       string `json:"about"`
    Avatar      string `json:"avatar"`
}

type LoginRequest struct {
    Email    string `json:"email" validate:"required,email"`
    Password string `json:"password" validate:"required"`
}

type User struct {
    ID          int
    Email       string
    Password    string
    FirstName   string
    LastName    string
    DateOfBirth string
    Nickname    string
    About       string
    Avatar      string
    IsPrivate   bool
}

// Validate vérifie que les champs respectent les règles métier
func (r *RegisterRequest) Validate() error {
    // Validation de l'email (format + domaine)
    emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
    if !emailRegex.MatchString(r.Email) {
        return &ValidationError{Field: "email", Message: "invalid email format"}
    }

    // Validation du mot de passe (8+ chars, majuscule, minuscule, chiffre)
    if len(r.Password) < 8 {
        return &ValidationError{Field: "password", Message: "password must be at least 8 characters"}
    }
    if !containsUppercase(r.Password) {
        return &ValidationError{Field: "password", Message: "password must contain at least one uppercase letter"}
    }
    if !containsLowercase(r.Password) {
        return &ValidationError{Field: "password", Message: "password must contain at least one lowercase letter"}
    }
    if !containsDigit(r.Password) {
        return &ValidationError{Field: "password", Message: "password must contain at least one digit"}
    }

    // Validation des noms
    if len(strings.TrimSpace(r.FirstName)) < 2 {
        return &ValidationError{Field: "first_name", Message: "first name must be at least 2 characters"}
    }
    if len(strings.TrimSpace(r.LastName)) < 2 {
        return &ValidationError{Field: "last_name", Message: "last name must be at least 2 characters"}
    }

    return nil
}

// ValidationError représente une erreur de validation
type ValidationError struct {
    Field   string `json:"field"`
    Message string `json:"message"`
}

func (e *ValidationError) Error() string {
    return e.Field + ": " + e.Message
}

// Helpers
func containsUppercase(s string) bool {
    for _, r := range s {
        if r >= 'A' && r <= 'Z' {
            return true
        }
    }
    return false
}

func containsLowercase(s string) bool {
    for _, r := range s {
        if r >= 'a' && r <= 'z' {
            return true
        }
    }
    return false
}

func containsDigit(s string) bool {
    for _, r := range s {
        if r >= '0' && r <= '9' {
            return true
        }
    }
    return false
}