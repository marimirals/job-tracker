-- +goose Up
CREATE TABLE vacancies (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    url         TEXT        NOT NULL UNIQUE,
    source      TEXT        NOT NULL CHECK (source IN ('hh', 'other')),
    title       TEXT        NOT NULL,
    company     TEXT,
    salary_from INTEGER,
    salary_to   INTEGER,
    currency    TEXT,
    work_format TEXT CHECK (work_format IN ('remote', 'hybrid', 'office')),
    grade       TEXT,
    status      TEXT        NOT NULL DEFAULT 'saved'
        CHECK (status IN ('saved', 'applied', 'responded', 'interview', 'offer', 'rejected')),
    notes       TEXT        NOT NULL DEFAULT '',
    raw_text    TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE skills (
    id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE UNIQUE INDEX skills_name_lower_idx ON skills (lower(name));

CREATE TABLE vacancy_skills (
    vacancy_id BIGINT NOT NULL REFERENCES vacancies (id) ON DELETE CASCADE,
    skill_id   BIGINT NOT NULL REFERENCES skills (id) ON DELETE CASCADE,
    type       TEXT   NOT NULL CHECK (type IN ('hard', 'soft')),
    PRIMARY KEY (vacancy_id, skill_id)
);

CREATE INDEX vacancy_skills_skill_id_idx ON vacancy_skills (skill_id);

CREATE TABLE my_skills (
    skill_id BIGINT PRIMARY KEY REFERENCES skills (id) ON DELETE CASCADE
);

-- +goose Down
DROP TABLE my_skills;
DROP TABLE vacancy_skills;
DROP TABLE skills;
DROP TABLE vacancies;