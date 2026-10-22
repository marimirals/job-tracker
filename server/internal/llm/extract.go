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
  "soft_skills": string[]
}
Правила:
- Страница может содержать меню, рекламу и похожие вакансии. Используй только основную вакансию.
- Зарплата — целые числа в месяц, без пробелов и валюты. Рубли обозначай как "RUR".
- Навыки — короткие общепринятые названия: "React", "TypeScript", "Командная работа".
- Бери только навыки, которые явно упомянуты в требованиях или в «будет плюсом». Без дублей.
- Если данных нет, ставь null или пустой массив. Ничего не придумывай.`

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
}

// Extract asks the model to turn vacancy text into structured data.
// If the reply is not valid JSON, it asks once more before giving up.
func Extract(ctx context.Context, client Client, text string) (Extracted, error) {
	if client == nil {
		return Extracted{}, ErrNotConfigured
	}

	text = truncate(strings.TrimSpace(text), maxTextRunes)
	if text == "" {
		return Extracted{}, errors.New("empty vacancy text")
	}

	var lastErr error
	for attempt := 0; attempt < 2; attempt++ {
		reply, err := client.Complete(ctx, extractPrompt, text)
		if err != nil {
			return Extracted{}, err
		}

		result, err := parseExtracted(reply)
		if err == nil {
			return result, nil
		}
		lastErr = err
	}

	return Extracted{}, fmt.Errorf("LLM returned invalid JSON: %w", lastErr)
}

func parseExtracted(reply string) (Extracted, error) {
	start := strings.Index(reply, "{")
	end := strings.LastIndex(reply, "}")
	if start == -1 || end <= start {
		return Extracted{}, errors.New("no JSON object in reply")
	}

	var raw rawExtracted
	if err := json.Unmarshal([]byte(reply[start:end+1]), &raw); err != nil {
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