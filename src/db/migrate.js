'use strict';
require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const seed = require('./seed');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required to run migrations.');

  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: true } });
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('schema applied');

  for (const c of seed.courses) {
    await pool.query(
      `INSERT INTO courses (id, slug, title, subtitle, description, level, instructor, minutes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
      [c.id, c.slug, c.title, c.subtitle, c.description, c.level, c.instructor, c.minutes]
    );
  }
  for (const l of seed.lessons) {
    await pool.query(
      `INSERT INTO lessons (id, course_id, slug, position, title, summary, body, minutes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
      [l.id, l.course_id, l.slug, l.position, l.title, l.summary, l.body, l.minutes]
    );
  }
  for (const q of seed.questions) {
    await pool.query(
      `INSERT INTO quiz_questions (id, lesson_id, prompt, options, answer_index, explanation)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
      [q.id, q.lesson_id, q.prompt, JSON.stringify(q.options), q.answer_index, q.explanation]
    );
  }

  await pool.query("SELECT setval('courses_id_seq', (SELECT MAX(id) FROM courses))");
  await pool.query("SELECT setval('lessons_id_seq', (SELECT MAX(id) FROM lessons))");
  console.log('seed data inserted');
  await pool.end();
}

main().catch((err) => { console.error(err.message); process.exit(1); });
