package utils

import (
    "errors"
    "net/http"
)

const (
    // MaxMultipartFormSize est la taille maximale autorisée pour les formulaires multipart (10 Mo)
    MaxMultipartFormSize = 10 << 20 // 10 MB
)

// ParseMultipartFormSafe parse un formulaire multipart avec une limite de taille
func ParseMultipartFormSafe(r *http.Request, maxMemory int64) error {
    // Limiter la taille du formulaire
    if err := r.ParseMultipartForm(maxMemory); err != nil {
        return errors.New("request too large")
    }
    return nil
}