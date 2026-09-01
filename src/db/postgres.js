'use strict';

const { Pool } = require('pg');

// Postgres driver for Azure Database for PostgreSQL - Flexible Server.
// Keep the pool small: App Service scales out by adding instances, and each one
// opens its own pool, so max * instances must stay under the server's limit.
function createPostgresStore(connectionString) {
  const pool = new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX) || 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: { rejectUnauthorized: true }
  });

  pool.on('error', (err) => {
    console.error(JSON.stringify({ msg: 'pg pool error', error: err.message }));
  });

  const one = async (sql, params) => (await pool.query(sql, params)).rows[0] || null;
  const many = async (sql, params) => (await pool.query(sql, params)).rows;

  return {
    driver: 'postgres',
    pool,
    async init() { await pool.query('SELECT 1'); },
    async close() { await pool.end(); },
    async ping() { await pool.query('SELECT 1'); return true; },

    getUserByEmail: (email) =>
      one('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]),
    getUserById: (id) =>
      one('SELECT * FROM users WHERE id = $1', [id]),
    createUser: ({ email, name, passwordHash, role = 'student' }) =>
      one(
        `INSERT INTO users (email, name, password_hash, role)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [email.toLowerCase(), name, passwordHash, role]
      ),

    listCourses: () =>
      many(`SELECT c.*, COUNT(l.id)::int AS lesson_count
              FROM courses c LEFT JOIN lessons l ON l.course_id = c.id
             GROUP BY c.id ORDER BY c.id`),
    getCourseBySlug: (slug) => one('SELECT * FROM courses WHERE slug = $1', [slug]),
    getCourseById: (id) => one('SELECT * FROM courses WHERE id = $1', [id]),

    listLessons: (courseId) =>
      many('SELECT * FROM lessons WHERE course_id = $1 ORDER BY position', [courseId]),
    getLesson: (courseId, slug) =>
      one('SELECT * FROM lessons WHERE course_id = $1 AND slug = $2', [courseId, slug]),
    getLessonById: (id) => one('SELECT * FROM lessons WHERE id = $1', [id]),

    isEnrolled: async (userId, courseId) =>
      Boolean(await one('SELECT 1 FROM enrollments WHERE user_id = $1 AND course_id = $2', [userId, courseId])),
    enroll: async (userId, courseId) => {
      await pool.query(
        `INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [userId, courseId]
      );
    },
    listEnrolledCourses: (userId) =>
      many(
        `SELECT c.* FROM courses c
           JOIN enrollments e ON e.course_id = c.id
          WHERE e.user_id = $1
          ORDER BY e.created_at DESC`,
        [userId]
      ),

    completedLessonIds: async (userId, courseId) => {
      const rows = await many(
        `SELECT p.lesson_id FROM lesson_progress p
           JOIN lessons l ON l.id = p.lesson_id
          WHERE p.user_id = $1 AND l.course_id = $2`,
        [userId, courseId]
      );
      return rows.map((r) => Number(r.lesson_id));
    },
    markComplete: async (userId, lessonId) => {
      await pool.query(
        `INSERT INTO lesson_progress (user_id, lesson_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [userId, lessonId]
      );
    },
    lastActivity: (userId) =>
      one(
        `SELECT lesson_id, completed_at FROM lesson_progress
          WHERE user_id = $1 ORDER BY completed_at DESC LIMIT 1`,
        [userId]
      ),

    getQuestion: (lessonId) =>
      one('SELECT * FROM quiz_questions WHERE lesson_id = $1 LIMIT 1', [lessonId]),
    recordAttempt: async (userId, lessonId, correct) => {
      await pool.query(
        'INSERT INTO quiz_attempts (user_id, lesson_id, correct) VALUES ($1, $2, $3)',
        [userId, lessonId, correct]
      );
    }
  };
}

module.exports = { createPostgresStore };
