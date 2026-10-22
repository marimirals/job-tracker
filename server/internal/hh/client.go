package hh

import (
	"context"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

const defaultBaseURL = "https://api.hh.ru"

var (
	vacancyPathRe = regexp.MustCompile(`/vacancy/(\d+)`)
	blockTagRe    = regexp.MustCompile(`(?i)<\s*(br|/p|/li|/div|/h[1-6])\s*/?>`)
	tagRe         = regexp.MustCompile(`<[^>]+>`)
	spacesRe      = regexp.MustCompile(`[ \t]+`)
	blankLinesRe  = regexp.MustCompile(`\n\s*\n+`)
)

type Client struct {
	BaseURL    string
	UserAgent  string
	HTTPClient *http.Client
}

func NewClient(userAgent string) *Client {
	return &Client{
		BaseURL:    defaultBaseURL,
		UserAgent:  userAgent,
		HTTPClient: &http.Client{Timeout: 15 * time.Second},
	}
}

type Vacancy struct {
	Title       string
	Company     *string
	SalaryFrom  *int
	SalaryTo    *int
	Currency    *string
	WorkFormat  *string
	Grade       *string
	Skills      []string
	Description string
}

type apiSalary struct {
	From     *int   `json:"from"`
	To       *int   `json:"to"`
	Currency string `json:"currency"`
}

type apiID struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type apiVacancy struct {
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Employer    *apiID     `json:"employer"`
	Salary      *apiSalary `json:"salary"`
	SalaryRange *apiSalary `json:"salary_range"`
	KeySkills   []apiID    `json:"key_skills"`
	Experience  *apiID     `json:"experience"`
	Schedule    *apiID     `json:"schedule"`
	WorkFormat  []apiID    `json:"work_format"`
}

// ParseVacancyID extracts the vacancy ID from links like
// https://hh.ru/vacancy/123456 or https://spb.hh.ru/vacancy/123456?from=search.
func ParseVacancyID(rawURL string) (string, bool) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return "", false
	}

	host := strings.ToLower(parsed.Hostname())
	if host != "hh.ru" && !strings.HasSuffix(host, ".hh.ru") {
		return "", false
	}

	match := vacancyPathRe.FindStringSubmatch(parsed.Path)
	if match == nil {
		return "", false
	}
	return match[1], true
}

func (c *Client) Fetch(ctx context.Context, id string) (Vacancy, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.BaseURL+"/vacancies/"+id, nil)
	if err != nil {
		return Vacancy{}, err
	}
	req.Header.Set("User-Agent", c.UserAgent)
	req.Header.Set("HH-User-Agent", c.UserAgent)

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return Vacancy{}, fmt.Errorf("hh request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return Vacancy{}, fmt.Errorf("hh responded %d: %s", resp.StatusCode, body)
	}

	var data apiVacancy
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return Vacancy{}, fmt.Errorf("decode hh response: %w", err)
	}

	return convert(data), nil
}

func convert(data apiVacancy) Vacancy {
	result := Vacancy{
		Title:       strings.TrimSpace(data.Name),
		WorkFormat:  workFormat(data.WorkFormat, data.Schedule),
		Description: htmlToText(data.Description),
	}

	if data.Employer != nil {
		result.Company = nonEmpty(data.Employer.Name)
	}

	salary := data.SalaryRange
	if salary == nil {
		salary = data.Salary
	}
	if salary != nil {
		result.SalaryFrom = salary.From
		result.SalaryTo = salary.To
		result.Currency = nonEmpty(salary.Currency)
	}

	if data.Experience != nil {
		result.Grade = nonEmpty(data.Experience.Name)
	}

	for _, skill := range data.KeySkills {
		result.Skills = append(result.Skills, skill.Name)
	}

	return result
}

func workFormat(formats []apiID, schedule *apiID) *string {
	var remote, office, hybrid bool
	for _, format := range formats {
		switch format.ID {
		case "REMOTE":
			remote = true
		case "ON_SITE", "FIELD_WORK":
			office = true
		case "HYBRID":
			hybrid = true
		}
	}

	switch {
	case hybrid || (remote && office):
		return ptr("hybrid")
	case remote:
		return ptr("remote")
	case office:
		return ptr("office")
	}

	if schedule != nil {
		switch schedule.ID {
		case "remote":
			return ptr("remote")
		case "fullDay", "shift":
			return ptr("office")
		}
	}
	return nil
}

func htmlToText(source string) string {
	text := blockTagRe.ReplaceAllString(source, "\n")
	text = tagRe.ReplaceAllString(text, "")
	text = html.UnescapeString(text)
	text = spacesRe.ReplaceAllString(text, " ")
	text = blankLinesRe.ReplaceAllString(text, "\n")
	return strings.TrimSpace(text)
}

func nonEmpty(value string) *string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return &value
}

func ptr(value string) *string {
	return &value
}