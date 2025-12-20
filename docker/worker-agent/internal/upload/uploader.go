package upload

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"lombok-worker-agent/internal/config"
	"lombok-worker-agent/internal/platform"
	"lombok-worker-agent/internal/types"
)

const (
	// Upload timeout per file
	uploadTimeout = 5 * time.Minute
)

// Uploader handles uploading files to S3 via presigned URLs
type Uploader struct {
	platformClient *platform.Client
	httpClient     *http.Client
}

// NewUploader creates a new uploader
func NewUploader(platformClient *platform.Client) *Uploader {
	return &Uploader{
		platformClient: platformClient,
		httpClient: &http.Client{
			Timeout: uploadTimeout,
		},
	}
}

// ReadManifest reads and parses the output manifest for a job
func ReadManifest(jobID string) (*types.OutputManifest, error) {
	manifestPath := config.JobManifestPath(jobID)

	data, err := os.ReadFile(manifestPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil // No manifest = no files to upload
		}
		return nil, fmt.Errorf("failed to read manifest: %w", err)
	}

	var manifest types.OutputManifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		return nil, fmt.Errorf("failed to parse manifest: %w", err)
	}

	return &manifest, nil
}

// UploadFiles uploads all files from the output manifest
func (u *Uploader) UploadFiles(ctx context.Context, jobID string, manifest *types.OutputManifest, outputLocation *types.OutputLocation) ([]types.OutputFileRef, error) {
	if manifest == nil || len(manifest.Files) == 0 {
		return nil, nil
	}
	if outputLocation == nil {
		return nil, fmt.Errorf("output location not provided")
	}

	// Build the request for presigned URLs
	fileRequests := make([]types.UploadURLRequest, len(manifest.Files))
	for i, f := range manifest.Files {
		finalObjectKey := buildObjectKey(outputLocation.Prefix, f.ObjectKey)
		fileRequests[i] = types.UploadURLRequest{
			FolderID:  outputLocation.FolderID,
			ObjectKey: finalObjectKey,
			Method:    types.SignedURLsRequestMethodPUT,
		}
	}

	// Request presigned URLs from platform
	urlResp, err := u.platformClient.RequestUploadURLs(ctx, jobID, fileRequests)
	if err != nil {
		return nil, fmt.Errorf("failed to get upload URLs: %w", err)
	}

	// Build a map of (folder_id, object_key) -> presigned_url
	urlMap := make(map[string]types.UploadURL)
	for _, upload := range urlResp.URLs {
		key := fmt.Sprintf("%s:%s:%s", upload.FolderID, upload.ObjectKey, upload.Method)
		urlMap[key] = upload
	}

	// Upload each file
	outputDir := config.JobOutputDir(jobID)
	var uploaded []types.OutputFileRef

	for _, f := range manifest.Files {
		finalObjectKey := buildObjectKey(outputLocation.Prefix, f.ObjectKey)
		key := fmt.Sprintf("%s:%s:%s", outputLocation.FolderID, finalObjectKey, types.SignedURLsRequestMethodPUT)
		uploadURL, ok := urlMap[key]
		if !ok {
			return uploaded, fmt.Errorf("no presigned URL for %s/%s", outputLocation.FolderID, finalObjectKey)
		}
		if uploadURL.Method != types.SignedURLsRequestMethodPUT {
			return uploaded, fmt.Errorf("unexpected presigned method %s for %s/%s", uploadURL.Method, outputLocation.FolderID, finalObjectKey)
		}

		localPath := filepath.Join(outputDir, f.LocalPath)
		contentType := f.ContentType
		if contentType == "" {
			contentType = guessContentType(localPath)
		}
		if err := u.uploadFile(ctx, uploadURL.URL, localPath, contentType); err != nil {
			return uploaded, fmt.Errorf("failed to upload %s: %w", f.LocalPath, err)
		}

		uploaded = append(uploaded, types.OutputFileRef{
			FolderID:  uploadURL.FolderID,
			ObjectKey: uploadURL.ObjectKey,
		})
	}

	return uploaded, nil
}

// uploadFile uploads a single file to S3 using a presigned URL
func (u *Uploader) uploadFile(ctx context.Context, presignedURL, localPath, contentType string) error {
	file, err := os.Open(localPath)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// Get file size for Content-Length header
	stat, err := file.Stat()
	if err != nil {
		return fmt.Errorf("failed to stat file: %w", err)
	}

	// Determine content type if not provided
	if contentType == "" {
		contentType = detectContentType(file)
	}

	req, err := http.NewRequestWithContext(ctx, "PUT", presignedURL, file)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", contentType)
	req.ContentLength = stat.Size()

	resp, err := u.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("upload request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("upload failed with status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

func buildObjectKey(prefix, objectKey string) string {
	if prefix == "" {
		return strings.TrimPrefix(objectKey, "/")
	}

	cleanPrefix := strings.TrimSuffix(prefix, "/")
	cleanObject := strings.TrimPrefix(objectKey, "/")

	return fmt.Sprintf("%s/%s", cleanPrefix, cleanObject)
}

func detectContentType(file *os.File) string {
	buffer := make([]byte, 512)
	n, _ := file.Read(buffer)
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "application/octet-stream"
	}
	if n > 0 {
		return http.DetectContentType(buffer[:n])
	}
	return "application/octet-stream"
}

func guessContentType(path string) string {
	ext := strings.ToLower(filepath.Ext(path))
	if ext == "" {
		return ""
	}
	if ct := mime.TypeByExtension(ext); ct != "" {
		return ct
	}
	return ""
}
