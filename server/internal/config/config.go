package config

import (
	"bufio"
	"errors"
	"os"
	"strings"
)

type Config struct {
	Port        string
	DatabaseURL string
	CORSOrigins []string

	OpenRouterBaseURL string
	OpenRouterAPIKey  string
	OpenRouterModel   string

	GigaChatAuthKey string
	GigaChatScope   string
	GigaChatModel   string
	GigaChatCACert  string

	HHUserAgent string
}

func Load() (Config, error) {
	if err := loadDotEnv(".env"); err != nil {
		return Config{}, err
	}

	cfg := Config{
		Port:        getenv("PORT", "8080"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		CORSOrigins: splitList(getenv("CORS_ORIGINS", "http://localhost:5173")),

		OpenRouterBaseURL: getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
		OpenRouterAPIKey:  os.Getenv("OPENROUTER_API_KEY"),
		OpenRouterModel:   os.Getenv("OPENROUTER_MODEL"),

		GigaChatAuthKey: os.Getenv("GIGACHAT_AUTH_KEY"),
		GigaChatScope:   getenv("GIGACHAT_SCOPE", "GIGACHAT_API_PERS"),
		GigaChatModel:   getenv("GIGACHAT_MODEL", "GigaChat"),
		GigaChatCACert:  os.Getenv("GIGACHAT_CA_CERT"),

		HHUserAgent: getenv("HH_USER_AGENT", "JobTracker/0.1"),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, errors.New("DATABASE_URL is required")
	}
	if cfg.OpenRouterAPIKey != "" && cfg.OpenRouterModel == "" {
		return Config{}, errors.New("OPENROUTER_MODEL is required when OPENROUTER_API_KEY is set")
	}

	return cfg, nil
}

func getenv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok && value != "" {
		return value
	}
	return fallback
}

func splitList(value string) []string {
	var items []string
	for _, item := range strings.Split(value, ",") {
		if item = strings.TrimSpace(item); item != "" {
			items = append(items, item)
		}
	}
	return items
}

// loadDotEnv reads KEY=VALUE lines from a file into the environment.
// Variables that are already set (for example by Docker) are not overwritten.
func loadDotEnv(path string) error {
	file, err := os.Open(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, found := strings.Cut(line, "=")
		if !found {
			continue
		}

		key = strings.TrimSpace(key)
		value = strings.Trim(strings.TrimSpace(value), `"'`)

		if _, exists := os.LookupEnv(key); !exists {
			if err := os.Setenv(key, value); err != nil {
				return err
			}
		}
	}

	return scanner.Err()
}