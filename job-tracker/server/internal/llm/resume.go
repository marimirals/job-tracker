package llm

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"
)

const MaxAboutRunes = 400

const resumePrompt = `Ты помогаешь составить резюме на русском языке.
Верни ТОЛЬКО JSON, без пояснений и без markdown:
{"position": string, "about": string}
Правила:
- position — короткое название должности для этого направления, как в заголовках вакансий,
  с учётом опыта кандидата (например, "Junior Frontend-разработчик").
- about — текст раздела «Обо мне»: 2–3 предложения, не длиннее 350 символов, от первого лица.
  Согласуй род глаголов с именем кандидата.
- Опирайся только на навыки и опыт из данных. Не приписывай кандидату навыки,
  которых нет в списке «Навыки кандидата».
- Без канцелярита и общих фраз вроде «ответственный и коммуникабельный».`

type ResumeInput struct {
	Direction       string
	Background      string
	Skills          []string
	RequestedSkills []string
	VacancyTitles   []string
}

type ResumeText struct {
	Position string `json:"position"`
	About    string `json:"about"`
}

// GenerateResumeText writes the position and the "about me" section for one
// direction. Skills are chosen by code, the model only writes text.
func GenerateResumeText(ctx context.Context, client Client, in ResumeInput) (ResumeText, error) {
	if client == nil {
		return ResumeText{}, ErrNotConfigured
	}

	var user strings.Builder
	fmt.Fprintf(&user, "Направление: %s\n", in.Direction)
	if in.Background != "" {
		fmt.Fprintf(&user, "О кандидате: %s\n", in.Background)
	}
	fmt.Fprintf(&user, "Навыки кандидата: %s\n", strings.Join(in.Skills, ", "))
	if len(in.RequestedSkills) > 0 {
		fmt.Fprintf(&user, "Чаще всего требуют в вакансиях: %s\n", strings.Join(in.RequestedSkills, ", "))
	}
	if len(in.VacancyTitles) > 0 {
		fmt.Fprintf(&user, "Названия вакансий: %s\n", strings.Join(in.VacancyTitles, "; "))
	}

	var lastErr error
	for attempt := 0; attempt < 2; attempt++ {
		reply, err := client.Complete(ctx, resumePrompt, user.String())
		if err != nil {
			return ResumeText{}, err
		}

		var text ResumeText
		if err := decodeJSONObject(reply, &text); err != nil {
			lastErr = err
			continue
		}

		text.Position = strings.TrimSpace(text.Position)
		text.About = truncateSentences(strings.TrimSpace(text.About), MaxAboutRunes)
		if text.About == "" {
			lastErr = errors.New("empty about text")
			continue
		}
		return text, nil
	}

	return ResumeText{}, fmt.Errorf("LLM returned invalid resume text: %w", lastErr)
}

// truncateSentences keeps whole sentences that fit into limit runes, so a
// model that ignored the length rule does not break the one-page resume.
func truncateSentences(text string, limit int) string {
	if utf8.RuneCountInString(text) <= limit {
		return text
	}

	runes := []rune(text)[:limit]
	cut := string(runes)
	if end := strings.LastIndexAny(cut, ".!?"); end > 0 {
		return cut[:end+1]
	}
	return strings.TrimSpace(cut)
}
