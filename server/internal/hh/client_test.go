package hh

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestParseVacancyID(t *testing.T) {
	tests := []struct {
		url    string
		wantID string
		wantOK bool
	}{
		{"https://hh.ru/vacancy/123456", "123456", true},
		{"https://spb.hh.ru/vacancy/987?from=search", "987", true},
		{"https://hh.ru/employer/123", "", false},
		{"https://nothh.ru/vacancy/123", "", false},
		{"https://career.habr.com/vacancies/123", "", false},
		{"not a url %%", "", false},
	}

	for _, tt := range tests {
		id, ok := ParseVacancyID(tt.url)
		if id != tt.wantID || ok != tt.wantOK {
			t.Errorf("ParseVacancyID(%q) = (%q, %v), want (%q, %v)", tt.url, id, ok, tt.wantID, tt.wantOK)
		}
	}
}

const sampleResponse = `{
  "name": "Frontend-разработчик",
  "description": "<p>Мы ищем <strong>разработчика</strong>.</p><ul><li>React</li><li>TypeScript &amp; тесты</li></ul>",
  "employer": {"name": "Ромашка"},
  "salary_range": {"from": 150000, "to": 200000, "currency": "RUR"},
  "key_skills": [{"name": "React"}, {"name": "TypeScript"}],
  "experience": {"id": "between1And3", "name": "От 1 года до 3 лет"},
  "work_format": [{"id": "REMOTE"}]
}`

func TestFetch(t *testing.T) {
	var gotUserAgent string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotUserAgent = r.Header.Get("HH-User-Agent")
		if r.URL.Path != "/vacancies/42" {
			http.NotFound(w, r)
			return
		}
		_, _ = w.Write([]byte(sampleResponse))
	}))
	defer server.Close()

	client := NewClient("Test/1.0")
	client.BaseURL = server.URL

	vacancy, err := client.Fetch(context.Background(), "42")
	if err != nil {
		t.Fatalf("Fetch() error = %v", err)
	}

	if gotUserAgent != "Test/1.0" {
		t.Errorf("HH-User-Agent = %q", gotUserAgent)
	}
	if vacancy.Title != "Frontend-разработчик" || *vacancy.Company != "Ромашка" {
		t.Errorf("unexpected title/company: %+v", vacancy)
	}
	if *vacancy.SalaryFrom != 150000 || *vacancy.SalaryTo != 200000 || *vacancy.Currency != "RUR" {
		t.Errorf("unexpected salary: %+v", vacancy)
	}
	if *vacancy.WorkFormat != "remote" || *vacancy.Grade != "От 1 года до 3 лет" {
		t.Errorf("unexpected format/grade: %+v", vacancy)
	}
	if len(vacancy.Skills) != 2 {
		t.Errorf("Skills = %v", vacancy.Skills)
	}

	wantDescription := "Мы ищем разработчика.\nReact\nTypeScript & тесты"
	if vacancy.Description != wantDescription {
		t.Errorf("Description = %q, want %q", vacancy.Description, wantDescription)
	}
}

func TestFetchError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "forbidden", http.StatusForbidden)
	}))
	defer server.Close()

	client := NewClient("Test/1.0")
	client.BaseURL = server.URL

	if _, err := client.Fetch(context.Background(), "1"); err == nil {
		t.Fatal("expected error for 403 response")
	}
}

func TestWorkFormat(t *testing.T) {
	tests := []struct {
		formats  []apiID
		schedule *apiID
		want     string
	}{
		{[]apiID{{ID: "REMOTE"}, {ID: "ON_SITE"}}, nil, "hybrid"},
		{[]apiID{{ID: "HYBRID"}}, nil, "hybrid"},
		{[]apiID{{ID: "ON_SITE"}}, nil, "office"},
		{nil, &apiID{ID: "remote"}, "remote"},
		{nil, &apiID{ID: "flexible"}, ""},
	}

	for _, tt := range tests {
		got := workFormat(tt.formats, tt.schedule)
		gotValue := ""
		if got != nil {
			gotValue = *got
		}
		if gotValue != tt.want {
			t.Errorf("workFormat(%v, %v) = %q, want %q", tt.formats, tt.schedule, gotValue, tt.want)
		}
	}
}