package storage

import (
	"context"
	"fmt"

	"jobtracker/internal/model"
)

func (s *Storage) ListMySkills(ctx context.Context) ([]string, error) {
	return s.queryNames(ctx, `
		SELECT s.name
		FROM my_skills ms
		JOIN skills s ON s.id = ms.skill_id
		ORDER BY lower(s.name)`)
}

// ReplaceMySkills overwrites the user's skill list in one transaction.
func (s *Storage) ReplaceMySkills(ctx context.Context, names []string) ([]string, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `DELETE FROM my_skills`); err != nil {
		return nil, err
	}

	for _, name := range names {
		id, err := upsertSkill(ctx, tx, name)
		if err != nil {
			return nil, fmt.Errorf("upsert skill %q: %w", name, err)
		}
		if _, err := tx.Exec(ctx, `INSERT INTO my_skills (skill_id) VALUES ($1) ON CONFLICT DO NOTHING`, id); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return s.ListMySkills(ctx)
}

// ListAllSkills returns skills mentioned in at least one saved vacancy.
func (s *Storage) ListAllSkills(ctx context.Context) ([]string, error) {
	return s.queryNames(ctx, `
		SELECT s.name
		FROM skills s
		WHERE EXISTS (SELECT 1 FROM vacancy_skills vs WHERE vs.skill_id = s.id)
		ORDER BY lower(s.name)`)
}

// SkillCounts returns how many vacancies mention each skill.
// If a skill is hard in some vacancies and soft in others, the more frequent type wins.
func (s *Storage) SkillCounts(ctx context.Context) ([]model.SkillCount, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT s.name,
			mode() WITHIN GROUP (ORDER BY vs.type) AS type,
			count(*) AS count,
			EXISTS (SELECT 1 FROM my_skills ms WHERE ms.skill_id = s.id) AS has
		FROM vacancy_skills vs
		JOIN skills s ON s.id = vs.skill_id
		GROUP BY s.id, s.name
		ORDER BY count DESC, lower(s.name)`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make([]model.SkillCount, 0)
	for rows.Next() {
		var count model.SkillCount
		if err := rows.Scan(&count.Name, &count.Type, &count.Count, &count.Has); err != nil {
			return nil, err
		}
		counts = append(counts, count)
	}
	return counts, rows.Err()
}

func (s *Storage) queryNames(ctx context.Context, query string) ([]string, error) {
	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	names := make([]string, 0)
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		names = append(names, name)
	}
	return names, rows.Err()
}