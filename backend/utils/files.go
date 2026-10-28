package utils

import (
    "errors"
    "fmt"
    "io"
    "mime/multipart"
    "net/http"
    "os"
    "path/filepath"
    // "strings"

    "github.com/google/uuid"
)

const (
    // MaxUploadSize est la taille maximale autorisée pour un upload (5 Mo)
    MaxUploadSize = 5 << 20 // 5 MB
)

// UploadConfig contient la configuration pour l'upload de fichiers
type UploadConfig struct {
    MaxSize      int64    // Taille maximale en bytes
    AllowedTypes []string // Types MIME autorisés (ex: "image/jpeg")
    UploadPath   string   // Chemin de destination (ex: "uploads/avatars")
}

// DefaultImageUploadConfig retourne une config par défaut pour les images
func DefaultImageUploadConfig(uploadPath string) UploadConfig {
    return UploadConfig{
        MaxSize:      MaxUploadSize,
        AllowedTypes: []string{"image/jpeg", "image/png", "image/webp", "image/gif"},
        UploadPath:   uploadPath,
    }
}

// HandleOptionalFileUpload gère l'upload d'un fichier optionnel
func HandleOptionalFileUpload(r *http.Request, fieldName string, config UploadConfig) (string, error) {
    file, header, err := r.FormFile(fieldName)
    if err != nil {
        // Si aucun fichier n'est fourni, ce n'est pas une erreur
        if err == http.ErrMissingFile {
            return "", nil
        }
        return "", fmt.Errorf("failed to get file: %v", err)
    }
    defer file.Close()

    return saveFile(file, header, config)
}

// saveFile sauvegarde un fichier sur le disque après validation
func saveFile(file io.Reader, header *multipart.FileHeader, config UploadConfig) (string, error) {
    // 1. Vérifier la taille
    if header.Size > config.MaxSize {
        return "", errors.New("file size exceeds maximum allowed size (max 5MB)")
    }

    // 2. Lire les premiers bytes pour détecter le type MIME
    buffer := make([]byte, 512)
    bytesRead, err := io.ReadFull(file, buffer)
    if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
        return "", fmt.Errorf("failed to read file: %v", err)
    }

    // 3. Détecter le type MIME
    fileType := http.DetectContentType(buffer[:bytesRead])

    // 4. Vérifier que le type est autorisé
    if !isAllowedType(fileType, config.AllowedTypes) {
        return "", fmt.Errorf("file type %s not allowed. Allowed types: %v", fileType, config.AllowedTypes)
    }

    // 5. Créer le répertoire de destination s'il n'existe pas
    if err := os.MkdirAll(config.UploadPath, os.ModePerm); err != nil {
        return "", fmt.Errorf("failed to create upload directory: %v", err)
    }

    // 6. Générer un nom de fichier unique avec UUID
    fileName := uuid.New().String() + filepath.Ext(header.Filename)
    filePath := filepath.Join(config.UploadPath, fileName)

    // 7. Créer le fichier de destination
    dst, err := os.Create(filePath)
    if err != nil {
        return "", fmt.Errorf("failed to create file: %v", err)
    }
    defer dst.Close()

    // 8. Écrire le contenu du fichier (y compris les bytes déjà lus)
    if _, err := dst.Write(buffer[:bytesRead]); err != nil {
        return "", fmt.Errorf("failed to write file: %v", err)
    }

    // 9. Copier le reste du fichier
    if _, err := io.Copy(dst, file); err != nil {
        return "", fmt.Errorf("failed to copy file: %v", err)
    }

    return filePath, nil
}

// isAllowedType vérifie si un type MIME est autorisé
func isAllowedType(fileType string, allowedTypes []string) bool {
    for _, allowed := range allowedTypes {
        if fileType == allowed {
            return true
        }
    }
    return false
}