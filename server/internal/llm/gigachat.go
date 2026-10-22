package llm

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

const (
	gigaChatAuthURL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth"
	gigaChatAPIURL  = "https://gigachat.devices.sberbank.ru/api/v1"
)

// GigaChat uses Sber's API. Unlike OpenAI-compatible providers it needs an
// OAuth step: the authorization key is exchanged for an access token that
// lives about 30 minutes, so the token is cached and refreshed when needed.
type GigaChat struct {
	AuthURL    string
	APIURL     string
	AuthKey    string
	Scope      string
	Model      string
	HTTPClient *http.Client

	mu        sync.Mutex
	token     string
	expiresAt time.Time
}

// NewGigaChat creates a client. caCertPath points to the Russian Trusted Root CA
// certificate in PEM format: Sber's servers use it, and it is not in the
// default certificate store of most systems.
func NewGigaChat(authKey, scope, model, caCertPath string) (*GigaChat, error) {
	httpClient := &http.Client{Timeout: 60 * time.Second}

	if caCertPath != "" {
		pem, err := os.ReadFile(caCertPath)
		if err != nil {
			return nil, fmt.Errorf("read GigaChat CA certificate: %w", err)
		}

		pool, err := x509.SystemCertPool()
		if err != nil {
			pool = x509.NewCertPool()
		}
		if !pool.AppendCertsFromPEM(pem) {
			return nil, errors.New("GigaChat CA certificate is not a valid PEM file")
		}

		httpClient.Transport = &http.Transport{
			Proxy:           http.ProxyFromEnvironment,
			TLSClientConfig: &tls.Config{RootCAs: pool, MinVersion: tls.VersionTLS12},
		}
	}

	return &GigaChat{
		AuthURL:    gigaChatAuthURL,
		APIURL:     gigaChatAPIURL,
		AuthKey:    authKey,
		Scope:      scope,
		Model:      model,
		HTTPClient: httpClient,
	}, nil
}

func (c *GigaChat) Name() string {
	return "gigachat"
}

func (c *GigaChat) Complete(ctx context.Context, system, user string) (string, error) {
	token, err := c.accessToken(ctx)
	if err != nil {
		return "", err
	}

	body, err := json.Marshal(newChatRequest(c.Model, system, user))
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.APIURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("gigachat request: %w", err)
	}
	defer resp.Body.Close()

	switch {
	case resp.StatusCode == http.StatusTooManyRequests:
		return "", ErrRateLimited
	case resp.StatusCode == http.StatusUnauthorized:
		c.resetToken()
		return "", errors.New("gigachat token rejected")
	case resp.StatusCode != http.StatusOK:
		snippet, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return "", fmt.Errorf("gigachat responded %d: %s", resp.StatusCode, snippet)
	}

	var data chatResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return "", fmt.Errorf("decode gigachat response: %w", err)
	}
	return data.content()
}

func (c *GigaChat) accessToken(ctx context.Context) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.token != "" && time.Until(c.expiresAt) > time.Minute {
		return c.token, nil
	}

	form := url.Values{"scope": {c.Scope}}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.AuthURL, strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Basic "+c.AuthKey)
	req.Header.Set("RqUID", newUUID())

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("gigachat auth request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		snippet, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return "", fmt.Errorf("gigachat auth responded %d: %s", resp.StatusCode, snippet)
	}

	var data struct {
		AccessToken string `json:"access_token"`
		ExpiresAt   int64  `json:"expires_at"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return "", fmt.Errorf("decode gigachat token: %w", err)
	}
	if data.AccessToken == "" {
		return "", errors.New("gigachat returned an empty token")
	}

	c.token = data.AccessToken
	c.expiresAt = time.UnixMilli(data.ExpiresAt)
	return c.token, nil
}

func (c *GigaChat) resetToken() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.token = ""
}

// newUUID returns a random UUID v4, which GigaChat requires in the RqUID header.
func newUUID() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}