package utils

import (
	// "crypto/rand"
	// "encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	// "time"
)

const (
	// MaxUploadSize définit la taille maximale d'upload (5 MB)
	MaxUploadSize = 5 << 20 // 5 MB
)

// var (
// 	ErrNoFile          = errors.New("no file provided")
// 	ErrInvalidFileType = errors.New("invalid file type")
// 	ErrFileTooLarge    = errors.New("file too large")
// 	ErrUploadFailed    = errors.New("failed to upload file")
// )

// UploadConfig définit la configuration pour l'upload
type UploadConfig struct {
	MaxSize      int64
	AllowedTypes []string
	UploadPath    string
}

// DefaultImageUploadConfig retourne une config par défaut pour les images
func DefaultImageUploadConfig(uploadPath string) UploadConfig {
	return UploadConfig{
		MaxSize: MaxUploadSize, // 5 MB
		AllowedTypes: []string{
			"image/jpeg",
			"image/jpg",
			"image/png",
			"image/gif",
			"image/webp",
		},
		UploadPath: uploadPath,
	}
}

// HandleOptionalFileUpload gère un upload optionnel
func HandleOptionalFileUpload(r *http.Request, fieldName string, config UploadConfig) (string, error) {
	file, header, err := r.FormFile(fieldName)

	if err != nil {
		if err == http.ErrMissingFile {
			return "", nil // Pas de fichier fourni, c'est optionnel
		}
		return "", fmt.Errorf("failed to get file: %v", err)
	}
	defer file.Close()

	return saveFile(file, header, config)
}

func HandleRequiredFileUpload(r *http.Request, fieldName string, config UploadConfig) (string, error) {
	file, header, err := r.FormFile(fieldName)
	if err != nil {
		return "", fmt.Errorf("failed is required: %v", err)
	}
	defer file.Close()

	return saveFile(file, header, config)
}

// saveFile sauvegarde un fichier sur le disque après validation
func saveFile(file io.Reader, header *multipart.FileHeader, config UploadConfig) (string, error) {
    if header.Size > config.MaxSize {
        return "", errors.New("file size exceeds maximum allowed size")
    }

    buffer := make([]byte, 512)
    bytesRead, err := io.ReadFull(file, buffer)
    if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
        return "", fmt.Errorf("failed to read file: %v", err)
    }

    fileType := http.DetectContentType(buffer[:bytesRead])

    if !isAllowedType(fileType, config.AllowedTypes) {
        return "", fmt.Errorf("file type %s not allowed. Allowed types: %v", fileType, config.AllowedTypes)
    }

    if err := os.MkdirAll(config.UploadPath, os.ModePerm); err != nil {
        return "", fmt.Errorf("failed to create upload directory: %v", err)
    }

    fileName := fmt.Sprintf("%s%s", GenerateUUID(), filepath.Ext(header.Filename))
    filePath := filepath.Join(config.UploadPath, fileName)

    dst, err := os.Create(filePath)
    if err != nil {
        return "", fmt.Errorf("failed to create file: %v", err)
    }
    defer dst.Close()

    if _, err := dst.Write(buffer[:bytesRead]); err != nil {
        return "", fmt.Errorf("failed to write file: %v", err)
    }

    if _, err := io.Copy(dst, file); err != nil {
        return "", fmt.Errorf("failed to copy file: %v", err)
    }

    return filePath, nil
}

func isAllowedType(fileType string, allowedTypes []string) bool {
	for _, allowed := range allowedTypes {
		if fileType == allowed {
			return true
		}
	}
	return false
}

func GenerateUUID() string {
	// Génère un UUID simple basé sur le timestamp et un nombre aléatoire
	return fmt.Sprintf("%x-%x-%x-%x-%x",
        randInt(0, 0xffff), randInt(0, 0xffff),
        randInt(0, 0xffff), randInt(0, 0xffff),
        randInt(0, 0xffff)
	)
}

// randInt génère un nombre aléatoire (à remplacer par crypto/rand en production)
func randInt(min, max int) int {
    // TODO: Remplacer par crypto/rand pour plus de sécurité
    return min + rand.Intn(max-min)
}