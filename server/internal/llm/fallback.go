package llm

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"
)

// Fallback tries providers in order and returns the first successful reply.
// If the primary provider fails (error, rate limit, timeout), the next one is used.
type Fallback struct {
	clients        []Client
	attemptTimeout time.Duration
}

func NewFallback(clients ...Client) *Fallback {
	return &Fallback{clients: clients, attemptTimeout: 60 * time.Second}
}

func (f *Fallback) Name() string {
	return "fallback"
}

func (f *Fallback) Complete(ctx context.Context, system, user string) (string, error) {
	if len(f.clients) == 0 {
		return "", ErrNotConfigured
	}

	var errs []error
	for _, client := range f.clients {
		attemptCtx, cancel := context.WithTimeout(ctx, f.attemptTimeout)
		reply, err := client.Complete(attemptCtx, system, user)
		cancel()

		if err == nil {
			return reply, nil
		}
		if ctx.Err() != nil {
			return "", ctx.Err()
		}

		slog.Warn("LLM provider failed, trying next", "provider", client.Name(), "error", err)
		errs = append(errs, fmt.Errorf("%s: %w", client.Name(), err))
	}

	return "", errors.Join(errs...)
}