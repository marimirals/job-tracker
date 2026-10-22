package storage

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound  = errors.New("not found")
	ErrDuplicate = errors.New("already exists")
)

const uniqueViolation = "23505"

type Storage struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Storage {
	return &Storage{pool: pool}
}

func (s *Storage) Ping(ctx context.Context) error {
	return s.pool.Ping(ctx)
}

// upsertSkill returns the ID of a skill, creating it if needed.
// Names are unique case-insensitively, so "react" finds the existing "React".
func upsertSkill(ctx context.Context, tx pgx.Tx, name string) (int64, error) {
	var id int64
	err := tx.QueryRow(ctx, `
		INSERT INTO skills (name) VALUES ($1)
		ON CONFLICT ((lower(name))) DO UPDATE SET name = skills.name
		RETURNING id`, name).Scan(&id)
	return id, err
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == uniqueViolation
}