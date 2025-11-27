package upload

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"lombok-worker-agent/internal/config"
	"lombok-worker-agent/internal/platform"
	"lombok-worker-agent/internal/types"
)

const (
	// Upload timeout per file
	uploadTimeout = 5 * time.Minute
)

// UploadResult contains the result of uploading a single file
type UploadResult struct {
	FolderID  string
	ObjectKey string
	Success   bool
	Error     error
}

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

// UploadFiles uploads all files from the manifest
func (u *Uploader) UploadFiles(ctx context.Context, jobID string, manifest *types.OutputManifest) ([]types.UploadedFile, error) {
	if manifest == nil || len(manifest.Files) == 0 {
		return nil, nil
	}

	// Build the request for presigned URLs
	fileRequests := make([]types.UploadFileRequest, len(manifest.Files))
	for i, f := range manifest.Files {
		fileRequests[i] = types.UploadFileRequest{
			FolderID:    f.FolderID,
			ObjectKey:   f.ObjectKey,
			ContentType: f.ContentType,
		}
	}

	// Request presigned URLs from platform
	urlResp, err := u.platformClient.RequestUploadURLs(ctx, jobID, fileRequests)
	if err != nil {
		return nil, fmt.Errorf("failed to get upload URLs: %w", err)
	}

	// Build a map of (folder_id, object_key) -> presigned_url
	urlMap := make(map[string]string)
	for _, upload := range urlResp.Uploads {
		key := upload.FolderID + ":" + upload.ObjectKey
		urlMap[key] = upload.PresignedURL
	}

	// Upload each file
	outputDir := config.JobOutputDir(jobID)
	var uploaded []types.UploadedFile

	for _, f := range manifest.Files {
		key := f.FolderID + ":" + f.ObjectKey
		presignedURL, ok := urlMap[key]
		if !ok {
			return uploaded, fmt.Errorf("no presigned URL for %s/%s", f.FolderID, f.ObjectKey)
		}

		localPath := filepath.Join(outputDir, f.LocalPath)
		if err := u.uploadFile(ctx, presignedURL, localPath, f.ContentType); err != nil {
			return uploaded, fmt.Errorf("failed to upload %s: %w", f.LocalPath, err)
		}

		uploaded = append(uploaded, types.UploadedFile{
			FolderID:  f.FolderID,
			ObjectKey: f.ObjectKey,
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
