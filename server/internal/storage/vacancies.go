package storage

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"jobtracker/internal/model"
	"jobtracker/internal/stats"
)

const vacancyColumns = `v.id, v.url, v.source, v.title, v.company, v.salary_from, v.salary_to,
	v.currency, v.work_format, v.grade, v.status, v.created_at`

func scanVacancyColumns(v *model.Vacancy) []any {
	return []any{
		&v.ID, &v.URL, &v.Source, &v.Title, &v.Company, &v.SalaryFrom, &v.SalaryTo,
		&v.Currency, &v.WorkFormat, &v.Grade, &v.Status, &v.CreatedAt,
	}
}

func (s *Storage) FindVacancyIDByURL(ctx context.Context, url string) (int64, bool, error) {
	var id int64
	err := s.pool.QueryRow(ctx, `SELECT id FROM vacancies WHERE url = $1`, url).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	return id, true, nil
}

func (s *Storage) CreateVacancy(ctx context.Context, v model.NewVacancy) (int64, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	var id int64
	err = tx.QueryRow(ctx, `
		INSERT INTO vacancies
			(url, source, title, company, salary_from, salary_to, currency, work_format, grade, raw_text)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id`,
		v.URL, v.Source, v.Title, v.Company, v.SalaryFrom, v.SalaryTo,
		v.Currency, v.WorkFormat, v.Grade, v.RawText,
	).Scan(&id)
	if isUniqueViolation(err) {
		return 0, ErrDuplicate
	}
	if err != nil {
		return 0, fmt.Errorf("insert vacancy: %w", err)
	}

	for _, skill := range v.Skills {
		skillID, err := upsertSkill(ctx, tx, skill.Name)
		if err != nil {
			return 0, fmt.Errorf("upsert skill %q: %w", skill.Name, err)
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO vacancy_skills (vacancy_id, skill_id, type) VALUES ($1, $2, $3)
			ON CONFLICT DO NOTHING`, id, skillID, skill.Type)
		if err != nil {
			return 0, fmt.Errorf("link skill %q: %w", skill.Name, err)
		}
	}

	return id, tx.Commit(ctx)
}

func (s *Storage) ListVacancies(ctx context.Context) ([]model.Vacancy, error) {
	hasMySkills, err := s.hasMySkills(ctx)
	if err != nil {
		return nil, err
	}

	rows, err := s.pool.Query(ctx, `
		SELECT `+vacancyColumns+`,
			count(vs.skill_id) AS skills_total,
			count(ms.skill_id) AS skills_covered
		FROM vacancies v
		LEFT JOIN vacancy_skills vs ON vs.vacancy_id = v.id
		LEFT JOIN my_skills ms ON ms.skill_id = vs.skill_id
		GROUP BY v.id
		ORDER BY v.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	vacancies := make([]model.Vacancy, 0)
	for rows.Next() {
		var v model.Vacancy
		var total, covered int
		if err := rows.Scan(append(scanVacancyColumns(&v), &total, &covered)...); err != nil {
			return nil, err
		}
		v.Match = stats.Match(covered, total, hasMySkills)
		vacancies = append(vacancies, v)
	}
	return vacancies, rows.Err()
}

func (s *Storage) GetVacancy(ctx context.Context, id int64) (model.VacancyDetails, error) {
	var details model.VacancyDetails
	err := s.pool.QueryRow(ctx, `
		SELECT `+vacancyColumns+`, v.notes, v.raw_text
		FROM vacancies v
		WHERE v.id = $1`, id,
	).Scan(append(scanVacancyColumns(&details.Vacancy), &details.Notes, &details.RawText)...)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.VacancyDetails{}, ErrNotFound
	}
	if err != nil {
		return model.VacancyDetails{}, err
	}

	rows, err := s.pool.Query(ctx, `
		SELECT s.name, vs.type, ms.skill_id IS NOT NULL AS has
		FROM vacancy_skills vs
		JOIN skills s ON s.id = vs.skill_id
		LEFT JOIN my_skills ms ON ms.skill_id = vs.skill_id
		WHERE vs.vacancy_id = $1
		ORDER BY vs.type, lower(s.name)`, id)
	if err != nil {
		return model.VacancyDetails{}, err
	}
	defer rows.Close()

	details.Skills = make([]model.VacancySkill, 0)
	covered := 0
	for rows.Next() {
		var skill model.VacancySkill
		if err := rows.Scan(&skill.Name, &skill.Type, &skill.Has); err != nil {
			return model.VacancyDetails{}, err
		}
		if skill.Has {
			covered++
		}
		details.Skills = append(details.Skills, skill)
	}
	if err := rows.Err(); err != nil {
		return model.VacancyDetails{}, err
	}

	hasMySkills, err := s.hasMySkills(ctx)
	if err != nil {
		return model.VacancyDetails{}, err
	}
	details.Match = stats.Match(covered, len(details.Skills), hasMySkills)

	return details, nil
}

func (s *Storage) UpdateVacancy(ctx context.Context, id int64, patch model.VacancyPatch) error {
	tag, err := s.pool.Exec(ctx, `
		UPDATE vacancies
		SET status = COALESCE($2, status),
			notes = COALESCE($3, notes),
			updated_at = now()
		WHERE id = $1`, id, patch.Status, patch.Notes)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Storage) DeleteVacancy(ctx context.Context, id int64) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM vacancies WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Storage) hasMySkills(ctx context.Context) (bool, error) {
	var exists bool
	err := s.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM my_skills)`).Scan(&exists)
	return exists, err
}