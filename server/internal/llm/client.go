package llm

import (
	"context"
	"errors"
)

var (
	ErrNotConfigured = errors.New("no LLM provider configured")
	ErrRateLimited   = errors.New("LLM rate limit exceeded")
)

// Client is any chat model that turns a system and user prompt into a text reply.
type Client interface {
	Name() string
	Complete(ctx context.Context, system, user string) (string, error)
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model       string        `json:"model"`
	Messages    []chatMessage `json:"messages"`
	Temperature float64       `json:"temperature"`
}

type chatResponse struct {
	Choices []struct {
		Message chatMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

func newChatRequest(model, system, user string) chatRequest {
	return chatRequest{
		Model: model,
		Messages: []chatMessage{
			{Role: "system", Content: system},
			{Role: "user", Content: user},
		},
		Temperature: 0,
	}
}

func (r chatResponse) content() (string, error) {
	if r.Error != nil {
		return "", errors.New(r.Error.Message)
	}
	if len(r.Choices) == 0 || r.Choices[0].Message.Content == "" {
		return "", errors.New("empty LLM response")
	}
	return r.Choices[0].Message.Content, nil
}