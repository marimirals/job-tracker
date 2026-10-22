package llm

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

type fakeClient struct {
	name    string
	replies []string
	err     error
	calls   int
}

func (f *fakeClient) Name() string { return f.name }

func (f *fakeClient) Complete(context.Context, string, string) (string, error) {
	f.calls++
	if f.err != nil {
		return "", f.err
	}
	reply := f.replies[0]
	if len(f.replies) > 1 {
		f.replies = f.replies[1:]
	}
	return reply, nil
}

func TestParseExtracted(t *testing.T) {
	reply := "Вот результат:\n```json\n" + `{
		"title": "Frontend-разработчик",
		"company": "  ",
		"salary_from": "150 000",
		"salary_to": 200000.0,
		"currency": "rub",
		"work_format": "удалёнка",
		"grade": "Middle",
		"hard_skills": ["React"],
		"soft_skills": ["Командная работа"]
	}` + "\n```"

	got, err := parseExtracted(reply)
	if err != nil {
		t.Fatalf("parseExtracted() error = %v", err)
	}

	if got.Title != "Frontend-разработчик" {
		t.Errorf("Title = %q", got.Title)
	}
	if got.Company != nil {
		t.Errorf("Company = %q, want nil", *got.Company)
	}
	if got.SalaryFrom == nil || *got.SalaryFrom != 150000 {
		t.Errorf("SalaryFrom = %v", got.SalaryFrom)
	}
	if got.SalaryTo == nil || *got.SalaryTo != 200000 {
		t.Errorf("SalaryTo = %v", got.SalaryTo)
	}
	if got.Currency == nil || *got.Currency != "RUR" {
		t.Errorf("Currency = %v", got.Currency)
	}
	if got.WorkFormat != nil {
		t.Errorf("WorkFormat = %q, want nil for unknown value", *got.WorkFormat)
	}
	if len(got.HardSkills) != 1 || len(got.SoftSkills) != 1 {
		t.Errorf("skills = %v / %v", got.HardSkills, got.SoftSkills)
	}
}

func TestParseExtractedInvalid(t *testing.T) {
	if _, err := parseExtracted("Извините, не могу помочь"); err == nil {
		t.Error("expected error for reply without JSON")
	}
}

func TestExtractRetriesOnInvalidJSON(t *testing.T) {
	client := &fakeClient{replies: []string{"not json", `{"title": "Dev", "hard_skills": [], "soft_skills": []}`}}

	got, err := Extract(context.Background(), client, "текст вакансии")
	if err != nil {
		t.Fatalf("Extract() error = %v", err)
	}
	if got.Title != "Dev" || client.calls != 2 {
		t.Errorf("got %+v after %d calls", got, client.calls)
	}
}

func TestExtractNilClient(t *testing.T) {
	if _, err := Extract(context.Background(), nil, "text"); !errors.Is(err, ErrNotConfigured) {
		t.Errorf("error = %v, want ErrNotConfigured", err)
	}
}

func TestFallbackUsesSecondProvider(t *testing.T) {
	primary := &fakeClient{name: "primary", err: ErrRateLimited}
	backup := &fakeClient{name: "backup", replies: []string{"ok"}}

	reply, err := NewFallback(primary, backup).Complete(context.Background(), "s", "u")
	if err != nil || reply != "ok" {
		t.Fatalf("Complete() = %q, %v", reply, err)
	}
	if primary.calls != 1 || backup.calls != 1 {
		t.Errorf("calls: primary=%d backup=%d", primary.calls, backup.calls)
	}
}

func TestFallbackAllFail(t *testing.T) {
	primary := &fakeClient{name: "primary", err: errors.New("boom")}
	backup := &fakeClient{name: "backup", err: ErrRateLimited}

	_, err := NewFallback(primary, backup).Complete(context.Background(), "s", "u")
	if !errors.Is(err, ErrRateLimited) {
		t.Errorf("error = %v, want to wrap ErrRateLimited", err)
	}
}

func TestFallbackEmpty(t *testing.T) {
	_, err := NewFallback().Complete(context.Background(), "s", "u")
	if !errors.Is(err, ErrNotConfigured) {
		t.Errorf("error = %v, want ErrNotConfigured", err)
	}
}

func chatReply(content string) string {
	data, _ := json.Marshal(map[string]any{
		"choices": []map[string]any{{"message": map[string]string{"role": "assistant", "content": content}}},
	})
	return string(data)
}

func TestOpenRouter(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/chat/completions" || r.Header.Get("Authorization") != "Bearer key" {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}
		var body chatRequest
		_ = json.NewDecoder(r.Body).Decode(&body)
		if body.Model != "test-model" || len(body.Messages) != 2 {
			http.Error(w, "bad body", http.StatusBadRequest)
			return
		}
		_, _ = w.Write([]byte(chatReply("hello")))
	}))
	defer server.Close()

	client := NewOpenRouter(server.URL+"/v1/", "key", "test-model")
	reply, err := client.Complete(context.Background(), "s", "u")
	if err != nil || reply != "hello" {
		t.Fatalf("Complete() = %q, %v", reply, err)
	}
}

func TestOpenRouterRateLimit(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer server.Close()

	_, err := NewOpenRouter(server.URL, "key", "m").Complete(context.Background(), "s", "u")
	if !errors.Is(err, ErrRateLimited) {
		t.Errorf("error = %v, want ErrRateLimited", err)
	}
}

func TestGigaChatCachesToken(t *testing.T) {
	var authCalls atomic.Int32

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/oauth":
			authCalls.Add(1)
			if r.Header.Get("Authorization") != "Basic secret" || r.Header.Get("RqUID") == "" {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			expires := time.Now().Add(30 * time.Minute).UnixMilli()
			_ = json.NewEncoder(w).Encode(map[string]any{"access_token": "token", "expires_at": expires})
		case "/api/chat/completions":
			if r.Header.Get("Authorization") != "Bearer token" {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			_, _ = w.Write([]byte(chatReply("привет")))
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client, err := NewGigaChat("secret", "GIGACHAT_API_PERS", "GigaChat", "")
	if err != nil {
		t.Fatal(err)
	}
	client.AuthURL = server.URL + "/oauth"
	client.APIURL = server.URL + "/api"

	for i := 0; i < 2; i++ {
		reply, err := client.Complete(context.Background(), "s", "u")
		if err != nil || reply != "привет" {
			t.Fatalf("Complete() = %q, %v", reply, err)
		}
	}
	if authCalls.Load() != 1 {
		t.Errorf("auth called %d times, want 1", authCalls.Load())
	}
}