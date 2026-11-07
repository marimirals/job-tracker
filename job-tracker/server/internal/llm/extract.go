package llm

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"

	"jobtracker/internal/model"
)

const maxTextRunes = 12000

const extractPrompt = `Ты извлекаешь данные из текста страницы с вакансией.
Верни ТОЛЬКО JSON, без пояснений и без markdown, строго такой структуры:
{
  "title": string,
  "company": string | null,
  "salary_from": number | null,
  "salary_to": number | null,
  "currency": "RUR" | "USD" | "EUR" | "KZT" | null,
  "work_format": "remote" | "hybrid" | "office" | null,
  "grade": "Intern" | "Junior" | "Middle" | "Senior" | "Lead" | null,
  "hard_skills": string[],
  "soft_skills": string[],
  "direction": string | null
}
Правила:
- Страница может содержать меню, рекламу и похожие вакансии. Используй только основную вакансию.
- Зарплата — целые числа в месяц, без пробелов и валюты. Рубли обозначай как "RUR".
- Навыки — короткие общепринятые названия: "React", "TypeScript", "Командная работа".
- Бери только навыки, которые явно упомянуты в требованиях или в «будет плюсом». Без дублей.
- Если данных нет, ставь null или пустой массив. Ничего не придумывай.
- direction — направление вакансии, ровно одно название из списка ниже, без изменений.
  Если вакансия не подходит ни к одному, ставь null.`

type Extracted struct {
	Title      string
	Company    *string
	SalaryFrom *int
	SalaryTo   *int
	Currency   *string
	WorkFormat *string
	Grade      *string
	HardSkills []string
	SoftSkills []string
	Direction  *string
}

type rawExtracted struct {
	Title      string   `json:"title"`
	Company    *string  `json:"company"`
	SalaryFrom flexInt  `json:"salary_from"`
	SalaryTo   flexInt  `json:"salary_to"`
	Currency   *string  `json:"currency"`
	WorkFormat *string  `json:"work_format"`
	Grade      *string  `json:"grade"`
	HardSkills []string `json:"hard_skills"`
	SoftSkills []string `json:"soft_skills"`
	Direction  *string  `json:"direction"`
}

// Extract asks the model to turn vacancy text into structured data and to
// pick one of the given directions. If the reply is not valid JSON, it asks
// once more before giving up.
func Extract(ctx context.Context, client Client, text string, directions []string) (Extracted, error) {
	if client == nil {
		return Extracted{}, ErrNotConfigured
	}

	text = truncate(strings.TrimSpace(text), maxTextRunes)
	if text == "" {
		return Extracted{}, errors.New("empty vacancy text")
	}

	prompt := extractPrompt + "\nНаправления: " + quoteList(directions)

	var lastErr error
	for attempt := 0; attempt < 2; attempt++ {
		reply, err := client.Complete(ctx, prompt, text)
		if err != nil {
			return Extracted{}, err
		}

		result, err := parseExtracted(reply, directions)
		if err == nil {
			return result, nil
		}
		lastErr = err
	}

	return Extracted{}, fmt.Errorf("LLM returned invalid JSON: %w", lastErr)
}

func parseExtracted(reply string, directions []string) (Extracted, error) {
	var raw rawExtracted
	if err := decodeJSONObject(reply, &raw); err != nil {
		return Extracted{}, err
	}

	result := Extracted{
		Title:      strings.TrimSpace(raw.Title),
		Company:    cleanString(raw.Company),
		SalaryFrom: positive(raw.SalaryFrom.value),
		SalaryTo:   positive(raw.SalaryTo.value),
		Currency:   cleanString(raw.Currency),
		WorkFormat: cleanString(raw.WorkFormat),
		Grade:      cleanString(raw.Grade),
		HardSkills: raw.HardSkills,
		SoftSkills: raw.SoftSkills,
		Direction:  matchName(cleanString(raw.Direction), directions),
	}

	if result.WorkFormat != nil && !model.IsValidWorkFormat(*result.WorkFormat) {
		result.WorkFormat = nil
	}
	if result.Currency != nil {
		currency := strings.ToUpper(*result.Currency)
		if currency == "RUB" {
			currency = "RUR"
		}
		result.Currency = &currency
	}

	return result, nil
}

// decodeJSONObject cuts the first {...} block out of a model reply (models
// like to wrap JSON in markdown or add a sentence) and decodes it.
func decodeJSONObject(reply string, target any) error {
	start := strings.Index(reply, "{")
	end := strings.LastIndex(reply, "}")
	if start == -1 || end <= start {
		return errors.New("no JSON object in reply")
	}
	return json.Unmarshal([]byte(reply[start:end+1]), target)
}

// matchName returns the list item equal to value ignoring case, so a model
// answer like "devops" maps to the stored "DevOps". Unknown values become nil.
func matchName(value *string, names []string) *string {
	if value == nil {
		return nil
	}
	for _, name := range names {
		if strings.EqualFold(name, *value) {
			match := name
			return &match
		}
	}
	return nil
}

func quoteList(items []string) string {
	quoted := make([]string, 0, len(items))
	for _, item := range items {
		quoted = append(quoted, `"`+item+`"`)
	}
	return strings.Join(quoted, ", ")
}

// flexInt accepts numbers in any form models tend to produce:
// 150000, 150000.0, "150000" or "150 000".
type flexInt struct {
	value *int
}

func (f *flexInt) UnmarshalJSON(data []byte) error {
	text := strings.Trim(strings.TrimSpace(string(data)), `"`)
	if text == "" || text == "null" {
		f.value = nil
		return nil
	}

	cleaned := strings.Map(func(r rune) rune {
		if (r >= '0' && r <= '9') || r == '.' {
			return r
		}
		return -1
	}, text)
	if cleaned == "" {
		f.value = nil
		return nil
	}

	number, err := strconv.ParseFloat(cleaned, 64)
	if err != nil {
		f.value = nil
		return nil
	}

	value := int(math.Round(number))
	f.value = &value
	return nil
}

func cleanString(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" || strings.EqualFold(trimmed, "null") {
		return nil
	}
	return &trimmed
}

func positive(value *int) *int {
	if value == nil || *value <= 0 {
		return nil
	}
	return value
}

func truncate(text string, limit int) string {
	runes := []rune(text)
	if len(runes) <= limit {
		return text
	}
	return string(runes[:limit])
}
