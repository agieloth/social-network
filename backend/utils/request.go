package utils

import (
	"errors"
	"net/http"
    ///////////////////////
	"strconv"
	"strings"
    ////////////////////
)

////////////////////////////////////////
var (
	ErrInvalidID    = errors.New("invalid ID format")
	ErrMissingParam = errors.New("missing required parameter")
)
//////////////////////////////////////

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


/////////////////////////////////////////////////////////////////////////////////////////
func ExtractIDFromPath(path, prefix, suffix string) (int, error) {
	idStr := strings.TrimPrefix(path, prefix)

	if suffix != "" {
		idStr = strings.TrimSuffix(idStr, suffix)
	}

	idStr = strings.Trim(idStr, "/")

	id, err := strconv.Atoi(idStr)
	if err != nil {
		return 0, ErrInvalidID
	}

	return id, nil
}

// ExtractQueryInt extrait un paramètre de query integer
func ExtractQueryInt(r *http.Request, paramName string) (int, error) {
	valueStr := r.URL.Query().Get(paramName)
	if valueStr == "" {
		return 0, ErrMissingParam
	}

	value, err := strconv.Atoi(valueStr)
	if err != nil {
		return 0, ErrInvalidID
	}

	return value, nil
}

// ExtractQueryIntWithDefault extrait un paramètre de query integer avec valeur par défaut
func ExtractQueryIntWithDefault(r *http.Request, paramName string, defaultValue int) int {
	valueStr := r.URL.Query().Get(paramName)
	if valueStr == "" {
		return defaultValue
	}

	value, err := strconv.Atoi(valueStr)
	if err != nil {
		return defaultValue
	}

	return value
}

// ExtractQueryString extrait un paramètre de query string
func ExtractQueryString(r *http.Request, paramName string) (string, error) {
	value := r.URL.Query().Get(paramName)
	if value == "" {
		return "", ErrMissingParam
	}
	return value, nil
}

// ExtractQueryStringWithDefault extrait un paramètre de query string avec valeur par défaut
func ExtractQueryStringWithDefault(r *http.Request, paramName, defaultValue string) string {
	value := r.URL.Query().Get(paramName)
	if value == "" {
		return defaultValue
	}
	return value
}

/////////////////////////////////////////////////////////////////////////////////////////////