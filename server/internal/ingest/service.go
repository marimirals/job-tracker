package ingest

import (
	"context"
	"errors"
	"log/slog"
	"strings"

	"jobtracker/internal/hh"
	"jobtracker/internal/llm"
	"jobtracker/internal/model"
	"jobtracker/internal/skills"
	"jobtracker/internal/storage"
)

type Input struct {
	URL   string
	Title string
	Text  string
}

// Service turns a page from the extension into a saved vacancy:
// hh.ru links go through the official API, everything else through the LLM.
type Service struct {
	store *storage.Storage
	hh    *hh.Client
	llm   llm.Client
}

func NewService(store *storage.Storage, hhClient *hh.Client, llmClient llm.Client) *Service {
	return &Service{store: store, hh: hhClient, llm: llmClient}
}

// Save stores the vacancy. The boolean result is true when this URL was saved before.
func (s *Service) Save(ctx context.Context, in Input) (model.SavedVacancy, bool, error) {
	if id, found, err := s.store.FindVacancyIDByURL(ctx, in.URL); err != nil {
		return model.SavedVacancy{}, false, err
	} else if found {
		saved, err := s.saved(ctx, id)
		return saved, true, err
	}

	id, err := s.store.CreateVacancy(ctx, s.parse(ctx, in))
	if errors.Is(err, storage.ErrDuplicate) {
		// The same URL was saved by a parallel request while we were parsing.
		existingID, _, findErr := s.store.FindVacancyIDByURL(ctx, in.URL)
		if findErr != nil {
			return model.SavedVacancy{}, false, findErr
		}
		saved, err := s.saved(ctx, existingID)
		return saved, true, err
	}
	if err != nil {
		return model.SavedVacancy{}, false, err
	}

	saved, err := s.saved(ctx, id)
	return saved, false, err
}

func (s *Service) parse(ctx context.Context, in Input) model.NewVacancy {
	vacancy := model.NewVacancy{
		URL:     in.URL,
		Source:  model.SourceOther,
		Title:   pageTitle(in.Title),
		RawText: in.Text,
	}
	textForLLM := in.Text
	titleFromHH := false

	if hhID, ok := hh.ParseVacancyID(in.URL); ok {
		vacancy.Source = model.SourceHH

		data, err := s.hh.Fetch(ctx, hhID)
		if err != nil {
			slog.Warn("hh API failed, falling back to LLM", "id", hhID, "error", err)
		} else {
			applyHH(&vacancy, data)
			titleFromHH = data.Title != ""
			if len(vacancy.Skills) > 0 {
				return vacancy
			}
			// Many hh vacancies have no key skills: extract them from the description.
			textForLLM = data.Description
		}
	}

	extracted, err := llm.Extract(ctx, s.llm, textForLLM)
	if err != nil {
		slog.Warn("vacancy saved without LLM parsing", "url", in.URL, "error", err)
		return vacancy
	}
	applyExtracted(&vacancy, extracted, !titleFromHH)

	return vacancy
}

func applyHH(vacancy *model.NewVacancy, data hh.Vacancy) {
	if data.Title != "" {
		vacancy.Title = data.Title
	}
	vacancy.Company = data.Company
	vacancy.SalaryFrom = data.SalaryFrom
	vacancy.SalaryTo = data.SalaryTo
	vacancy.Currency = data.Currency
	vacancy.WorkFormat = data.WorkFormat
	vacancy.Grade = data.Grade
	if data.Description != "" {
		vacancy.RawText = data.Description
	}
	vacancy.Skills = skills.Classify(data.Skills)
}

// applyExtracted fills fields from the LLM. Data already received from hh.ru wins.
// The title is replaced unless it came from hh.ru: the page title of a browser tab
// is usually noisy ("Вакансия ... — работа в Москве").
func applyExtracted(vacancy *model.NewVacancy, data llm.Extracted, replaceTitle bool) {
	if replaceTitle && data.Title != "" {
		vacancy.Title = data.Title
	}
	fill(&vacancy.Company, data.Company)
	fill(&vacancy.SalaryFrom, data.SalaryFrom)
	fill(&vacancy.SalaryTo, data.SalaryTo)
	fill(&vacancy.Currency, data.Currency)
	fill(&vacancy.WorkFormat, data.WorkFormat)
	fill(&vacancy.Grade, data.Grade)
	vacancy.Skills = skills.Build(data.HardSkills, data.SoftSkills)
}

func fill[T any](target **T, value *T) {
	if *target == nil {
		*target = value
	}
}

func pageTitle(title string) string {
	if title = strings.TrimSpace(title); title != "" {
		return title
	}
	return "Без названия"
}

func (s *Service) saved(ctx context.Context, id int64) (model.SavedVacancy, error) {
	details, err := s.store.GetVacancy(ctx, id)
	if err != nil {
		return model.SavedVacancy{}, err
	}
	return model.SavedVacancy{
		ID:      details.ID,
		Title:   details.Title,
		Company: details.Company,
		Match:   details.Match,
	}, nil
}