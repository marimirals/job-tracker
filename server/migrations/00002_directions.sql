-- +goose Up
CREATE TABLE directions (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX directions_name_lower_idx ON directions (lower(name));

ALTER TABLE vacancies
    ADD COLUMN direction_id BIGINT REFERENCES directions (id) ON DELETE SET NULL;

CREATE INDEX vacancies_direction_id_idx ON vacancies (direction_id);

CREATE TABLE resumes (
    direction_id BIGINT PRIMARY KEY REFERENCES directions (id) ON DELETE CASCADE,
    position     TEXT        NOT NULL DEFAULT '',
    about        TEXT        NOT NULL DEFAULT '',
    skills       TEXT[]      NOT NULL DEFAULT '{}',
    generated_at TIMESTAMPTZ,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO directions (name)
VALUES ('Фронтенд и фулстек'), ('DevOps'), ('ML-инженер');

-- +goose Down
DROP TABLE resumes;
ALTER TABLE vacancies DROP COLUMN direction_id;
DROP TABLE directions;