package platform

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"lombok-worker-agent/internal/types"
)

const (
	// API endpoint paths
	createPresignedURLsPath = "/api/v1/docker/jobs/%s/request-presigned-urls"
	startPath               = "/api/v1/docker/jobs/%s/start"
	completionPath          = "/api/v1/docker/jobs/%s/complete"

	// HTTP timeouts
	requestTimeout       = 30 * time.Second
	signalRequestTimeout = 5 * time.Second // Timeout for SignalStart and SignalCompletion
)

// Client handles communication with the platform API
type Client struct {
	baseURL    string
	token      string
	httpClient *http.Client
}

// NewClient creates a new platform API client
func NewClient(baseURL, token string) *Client {
	return &Client{
		baseURL: baseURL,
		token:   token,
		httpClient: &http.Client{
			Timeout: requestTimeout,
		},
	}
}

// RequestUploadURLs requests presigned URLs for uploading files
func (c *Client) RequestUploadURLs(ctx context.Context, jobID string, files []types.UploadURLRequest) (*types.UploadURLResponse, error) {
	if c.baseURL == "" || c.token == "" {
		return nil, fmt.Errorf("platform client not configured (missing baseURL or token)")
	}

	url := fmt.Sprintf(c.baseURL+createPresignedURLsPath, jobID)

	bodyBytes, err := json.Marshal(files)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("platform returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var result types.UploadURLResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}

// SignalStart signals job start to the platform
func (c *Client) SignalStart(ctx context.Context, jobID string) error {
	if c.baseURL == "" || c.token == "" {
		return fmt.Errorf("platform client not configured (missing baseURL or token)")
	}

	// Create a context with timeout for this request
	ctx, cancel := context.WithTimeout(ctx, signalRequestTimeout)
	defer cancel()

	url := fmt.Sprintf(c.baseURL+startPath, jobID)

	req, err := http.NewRequestWithContext(ctx, "POST", url, http.NoBody)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("platform returned status %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// SignalCompletion signals job completion to the platform
func (c *Client) SignalCompletion(ctx context.Context, jobID string, req *types.CompletionRequest) error {
	if c.baseURL == "" || c.token == "" {
		return fmt.Errorf("platform client not configured (missing baseURL or token)")
	}

	// Create a context with timeout for this request
	ctx, cancel := context.WithTimeout(ctx, signalRequestTimeout)
	defer cancel()

	url := fmt.Sprintf(c.baseURL+completionPath, jobID)

	bodyBytes, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(bodyBytes))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.token)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("platform returned status %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// IsConfigured returns true if the client has the necessary configuration
func (c *Client) IsConfigured() bool {
	return c.baseURL != "" && c.token != ""
}
