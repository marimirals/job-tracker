package storage

import (
	"context"
	"strings"

	"jobtracker/internal/model"
)

func (s *Storage) ListDirections(ctx context.Context) ([]model.Direction, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT d.id, d.name, count(v.id) AS vacancy_count
		FROM directions d
		LEFT JOIN vacancies v ON v.direction_id = d.id
		GROUP BY d.id
		ORDER BY d.created_at, d.id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	directions := make([]model.Direction, 0)
	for rows.Next() {
		var direction model.Direction
		if err := rows.Scan(&direction.ID, &direction.Name, &direction.VacancyCount); err != nil {
			return nil, err
		}
		directions = append(directions, direction)
	}
	return directions, rows.Err()
}

// DirectionNames returns the names of all directions, for the LLM prompt.
func (s *Storage) DirectionNames(ctx context.Context) ([]string, error) {
	directions, err := s.ListDirections(ctx)
	if err != nil {
		return nil, err
	}
	names := make([]string, 0, len(directions))
	for _, direction := range directions {
		names = append(names, direction.Name)
	}
	return names, nil
}

func (s *Storage) GetDirection(ctx context.Context, id int64) (model.Direction, error) {
	directions, err := s.ListDirections(ctx)
	if err != nil {
		return model.Direction{}, err
	}
	for _, direction := range directions {
		if direction.ID == id {
			return direction, nil
		}
	}
	return model.Direction{}, ErrNotFound
}

func (s *Storage) CreateDirection(ctx context.Context, name string) (model.Direction, error) {
	direction := model.Direction{Name: strings.TrimSpace(name)}
	err := s.pool.QueryRow(ctx, `INSERT INTO directions (name) VALUES ($1) RETURNING id`, direction.Name).
		Scan(&direction.ID)
	if isUniqueViolation(err) {
		return model.Direction{}, ErrDuplicate
	}
	return direction, err
}

// DeleteDirection removes a direction and its resume. Vacancies stay
// and simply lose their direction (ON DELETE SET NULL).
func (s *Storage) DeleteDirection(ctx context.Context, id int64) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM directions WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
