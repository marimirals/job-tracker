package storage

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"jobtracker/internal/model"
)

// GetResume returns the saved resume of a direction. A direction without
// a saved resume yields an empty one, so the client can offer to generate it.
func (s *Storage) GetResume(ctx context.Context, directionID int64) (model.Resume, error) {
	resume := model.Resume{DirectionID: directionID, Skills: []string{}}
	err := s.pool.QueryRow(ctx, `
		SELECT position, about, skills, generated_at
		FROM resumes
		WHERE direction_id = $1`, directionID,
	).Scan(&resume.Position, &resume.About, &resume.Skills, &resume.GeneratedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return resume, nil
	}
	return resume, err
}

func (s *Storage) SaveResume(ctx context.Context, directionID int64, update model.ResumeUpdate, generated bool) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO resumes (direction_id, position, about, skills, generated_at)
		VALUES ($1, $2, $3, $4, CASE WHEN $5 THEN now() END)
		ON CONFLICT (direction_id) DO UPDATE
		SET position = EXCLUDED.position,
			about = EXCLUDED.about,
			skills = EXCLUDED.skills,
			generated_at = CASE WHEN $5 THEN now() ELSE resumes.generated_at END,
			updated_at = now()`,
		directionID, update.Position, update.About, update.Skills, generated)
	if isForeignKeyViolation(err) {
		return ErrNotFound
	}
	return err
}

// VacancyTitles returns up to limit titles of a direction's vacancies,
// newest first. They help the LLM choose a position name.
func (s *Storage) VacancyTitles(ctx context.Context, directionID int64, limit int) ([]string, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT title FROM vacancies
		WHERE direction_id = $1
		ORDER BY created_at DESC
		LIMIT $2`, directionID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	titles := make([]string, 0, limit)
	for rows.Next() {
		var title string
		if err := rows.Scan(&title); err != nil {
			return nil, err
		}
		titles = append(titles, title)
	}
	return titles, rows.Err()
}
