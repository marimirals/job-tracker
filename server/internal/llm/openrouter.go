package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// OpenRouter talks to any OpenAI-compatible chat completions API.
// With a different base URL it also works with Groq or other compatible providers.
type OpenRouter struct {
	BaseURL    string
	APIKey     string
	Model      string
	HTTPClient *http.Client
}

func NewOpenRouter(baseURL, apiKey, model string) *OpenRouter {
	return &OpenRouter{
		BaseURL:    strings.TrimRight(baseURL, "/"),
		APIKey:     apiKey,
		Model:      model,
		HTTPClient: &http.Client{Timeout: 60 * time.Second},
	}
}

func (c *OpenRouter) Name() string {
	return "openrouter"
}

func (c *OpenRouter) Complete(ctx context.Context, system, user string) (string, error) {
	body, err := json.Marshal(newChatRequest(c.Model, system, user))
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	req.Header.Set("X-Title", "Job Tracker")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("openrouter request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusTooManyRequests {
		return "", ErrRateLimited
	}
	if resp.StatusCode != http.StatusOK {
		snippet, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return "", fmt.Errorf("openrouter responded %d: %s", resp.StatusCode, snippet)
	}

	var data chatResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return "", fmt.Errorf("decode openrouter response: %w", err)
	}
	return data.content()
}