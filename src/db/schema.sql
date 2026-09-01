-- Azure Database for PostgreSQL - Flexible Server
-- Applied by `npm run db:migrate`.

CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'student',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courses (
  id          BIGSERIAL PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  subtitle    TEXT,
  description TEXT,
  level       TEXT,
  instructor  TEXT,
  minutes     INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lessons (
  id        BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  slug      TEXT NOT NULL,
  position  INTEGER NOT NULL,
  title     TEXT NOT NULL,
  summary   TEXT,
  body      TEXT NOT NULL,
  minutes   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (course_id, slug)
);
CREATE INDEX IF NOT EXISTS lessons_course_position_idx ON lessons (course_id, position);

CREATE TABLE IF NOT EXISTS enrollments (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id  BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id    BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS lesson_progress_user_idx ON lesson_progress (user_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id           BIGSERIAL PRIMARY KEY,
  lesson_id    BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  prompt       TEXT NOT NULL,
  options      JSONB NOT NULL,
  answer_index INTEGER NOT NULL,
  explanation  TEXT
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id    BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  correct      BOOLEAN NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
