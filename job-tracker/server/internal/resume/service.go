package resume

import (
	"context"
	"strings"

	"jobtracker/internal/llm"
	"jobtracker/internal/model"
	"jobtracker/internal/storage"
)

const (
	maxResumeSkills  = 14
	maxMissingSkills = 8
	maxRequested     = 12
	maxTitles        = 10
)

// Service builds resumes for directions: skills are picked by code from
// vacancy statistics, the LLM only writes the position and "about me".
type Service struct {
	store *storage.Storage
	llm   llm.Client
}

func NewService(store *storage.Storage, llmClient llm.Client) *Service {
	return &Service{store: store, llm: llmClient}
}

// Get returns the saved resume with fresh "missing" skills and vacancy count.
func (s *Service) Get(ctx context.Context, directionID int64) (model.Resume, error) {
	direction, err := s.store.GetDirection(ctx, directionID)
	if err != nil {
		return model.Resume{}, err
	}

	resume, err := s.store.GetResume(ctx, directionID)
	if err != nil {
		return model.Resume{}, err
	}

	counts, err := s.store.SkillCounts(ctx, &directionID)
	if err != nil {
		return model.Resume{}, err
	}

	resume.VacancyCount = direction.VacancyCount
	resume.Missing = MissingSkills(counts, resume.Skills)
	return resume, nil
}

func (s *Service) Save(ctx context.Context, directionID int64, update model.ResumeUpdate) (model.Resume, error) {
	if _, err := s.store.GetDirection(ctx, directionID); err != nil {
		return model.Resume{}, err
	}
	if err := s.store.SaveResume(ctx, directionID, update, false); err != nil {
		return model.Resume{}, err
	}
	return s.Get(ctx, directionID)
}

// Generate picks skills for the direction, asks the LLM for the text and
// saves the result. background is a short description of the candidate
// (name, experience, education) sent by the client.
func (s *Service) Generate(ctx context.Context, directionID int64, background string) (model.Resume, error) {
	direction, err := s.store.GetDirection(ctx, directionID)
	if err != nil {
		return model.Resume{}, err
	}

	counts, err := s.store.SkillCounts(ctx, &directionID)
	if err != nil {
		return model.Resume{}, err
	}

	mySkills, err := s.store.ListMySkills(ctx)
	if err != nil {
		return model.Resume{}, err
	}

	titles, err := s.store.VacancyTitles(ctx, directionID, maxTitles)
	if err != nil {
		return model.Resume{}, err
	}

	resumeSkills := PickSkills(counts, mySkills)
	text, err := llm.GenerateResumeText(ctx, s.llm, llm.ResumeInput{
		Direction:       direction.Name,
		Background:      background,
		Skills:          resumeSkills,
		RequestedSkills: topNames(counts, maxRequested),
		VacancyTitles:   titles,
	})
	if err != nil {
		return model.Resume{}, err
	}

	update := model.ResumeUpdate{Position: text.Position, About: text.About, Skills: resumeSkills}
	if err := s.store.SaveResume(ctx, directionID, update, true); err != nil {
		return model.Resume{}, err
	}
	return s.Get(ctx, directionID)
}

// PickSkills returns the user's skills ordered by how often the direction's
// vacancies ask for them. If no vacancy mentions any of the user's skills
// (for example, the direction has no vacancies yet), all user skills are used.
func PickSkills(counts []model.SkillCount, mySkills []string) []string {
	has := make(map[string]string, len(mySkills))
	for _, skill := range mySkills {
		has[strings.ToLower(skill)] = skill
	}

	picked := make([]string, 0, maxResumeSkills)
	for _, count := range counts {
		if name, ok := has[strings.ToLower(count.Name)]; ok {
			picked = append(picked, name)
		}
		if len(picked) == maxResumeSkills {
			return picked
		}
	}

	if len(picked) == 0 {
		picked = append(picked, mySkills...)
		if len(picked) > maxResumeSkills {
			picked = picked[:maxResumeSkills]
		}
	}
	return picked
}

// MissingSkills returns the most requested hard skills of the direction that
// are neither in the user's skills nor already in the resume.
func MissingSkills(counts []model.SkillCount, resumeSkills []string) []string {
	inResume := make(map[string]bool, len(resumeSkills))
	for _, skill := range resumeSkills {
		inResume[strings.ToLower(skill)] = true
	}

	missing := make([]string, 0, maxMissingSkills)
	for _, count := range counts {
		if count.Has || count.Type != model.SkillHard || inResume[strings.ToLower(count.Name)] {
			continue
		}
		missing = append(missing, count.Name)
		if len(missing) == maxMissingSkills {
			break
		}
	}
	return missing
}

func topNames(counts []model.SkillCount, limit int) []string {
	names := make([]string, 0, limit)
	for _, count := range counts {
		if len(names) == limit {
			break
		}
		names = append(names, count.Name)
	}
	return names
}
