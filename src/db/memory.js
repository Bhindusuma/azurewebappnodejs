'use strict';

const seed = require('./seed');

// In-memory driver. Used when DATABASE_URL is unset so the app runs with no
// external dependency. State is per-process: fine for local work and demos,
// wrong for production or for more than one App Service instance.
function createMemoryStore() {
  const users = [];
  const enrollments = [];   // { user_id, course_id, created_at }
  const progress = [];      // { user_id, lesson_id, completed_at }
  const attempts = [];      // { user_id, lesson_id, correct, submitted_at }
  let nextUserId = 1;

  return {
    driver: 'memory',
    async init() {},
    async close() {},
    async ping() { return true; },

    async getUserByEmail(email) {
      return users.find((u) => u.email === email.toLowerCase()) || null;
    },
    async getUserById(id) {
      return users.find((u) => u.id === Number(id)) || null;
    },
    async createUser({ email, name, passwordHash, role = 'student' }) {
      const user = {
        id: nextUserId++,
        email: email.toLowerCase(),
        name,
        password_hash: passwordHash,
        role,
        created_at: new Date().toISOString()
      };
      users.push(user);
      return user;
    },

    async listCourses() {
      return seed.courses.map((c) => ({
        ...c,
        lesson_count: seed.lessons.filter((l) => l.course_id === c.id).length
      }));
    },
    async getCourseBySlug(slug) {
      return seed.courses.find((c) => c.slug === slug) || null;
    },
    async getCourseById(id) {
      return seed.courses.find((c) => c.id === Number(id)) || null;
    },

    async listLessons(courseId) {
      return seed.lessons
        .filter((l) => l.course_id === Number(courseId))
        .sort((a, b) => a.position - b.position);
    },
    async getLesson(courseId, slug) {
      return seed.lessons.find((l) => l.course_id === Number(courseId) && l.slug === slug) || null;
    },
    async getLessonById(id) {
      return seed.lessons.find((l) => l.id === Number(id)) || null;
    },

    async isEnrolled(userId, courseId) {
      return enrollments.some((e) => e.user_id === Number(userId) && e.course_id === Number(courseId));
    },
    async enroll(userId, courseId) {
      if (await this.isEnrolled(userId, courseId)) return;
      enrollments.push({ user_id: Number(userId), course_id: Number(courseId), created_at: new Date().toISOString() });
    },
    async listEnrolledCourses(userId) {
      return enrollments
        .filter((e) => e.user_id === Number(userId))
        .map((e) => seed.courses.find((c) => c.id === e.course_id))
        .filter(Boolean);
    },

    async completedLessonIds(userId, courseId) {
      const inCourse = new Set(
        seed.lessons.filter((l) => l.course_id === Number(courseId)).map((l) => l.id)
      );
      return progress
        .filter((p) => p.user_id === Number(userId) && inCourse.has(p.lesson_id))
        .map((p) => p.lesson_id);
    },
    async markComplete(userId, lessonId) {
      const done = progress.some((p) => p.user_id === Number(userId) && p.lesson_id === Number(lessonId));
      if (done) return;
      progress.push({ user_id: Number(userId), lesson_id: Number(lessonId), completed_at: new Date().toISOString() });
    },
    async lastActivity(userId) {
      const mine = progress
        .filter((p) => p.user_id === Number(userId))
        .sort((a, b) => (a.completed_at < b.completed_at ? 1 : -1));
      return mine[0] || null;
    },

    async getQuestion(lessonId) {
      return seed.questions.find((q) => q.lesson_id === Number(lessonId)) || null;
    },
    async recordAttempt(userId, lessonId, correct) {
      attempts.push({
        user_id: Number(userId),
        lesson_id: Number(lessonId),
        correct,
        submitted_at: new Date().toISOString()
      });
    }
  };
}

module.exports = { createMemoryStore };
