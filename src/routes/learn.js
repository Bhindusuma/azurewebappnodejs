'use strict';

const express = require('express');
const store = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

async function courseWithProgress(course, userId) {
  const lessons = await store.listLessons(course.id);
  const doneIds = userId ? new Set((await store.completedLessonIds(userId, course.id)).map(Number)) : new Set();
  const marked = lessons.map((l) => ({ ...l, done: doneIds.has(Number(l.id)) }));
  const completed = marked.filter((l) => l.done).length;
  return {
    course,
    lessons: marked,
    completed,
    total: marked.length,
    percent: marked.length ? Math.round((completed / marked.length) * 100) : 0,
    nextLesson: marked.find((l) => !l.done) || marked[0] || null
  };
}

router.get('/', async (req, res, next) => {
  try {
    if (req.user) return res.redirect('/dashboard');
    const courses = await store.listCourses();
    res.render('home', { title: 'Kiln', courses });
  } catch (err) { next(err); }
});

router.get('/catalog', async (req, res, next) => {
  try {
    const courses = await store.listCourses();
    res.render('catalog', { title: 'Courses', courses });
  } catch (err) { next(err); }
});

router.get('/dashboard', requireAuth, async (req, res, next) => {
  try {
    const enrolled = await store.listEnrolledCourses(req.user.id);
    const cards = await Promise.all(enrolled.map((c) => courseWithProgress(c, req.user.id)));
    const catalog = await store.listCourses();
    const enrolledIds = new Set(enrolled.map((c) => Number(c.id)));
    res.render('dashboard', {
      title: 'Your learning',
      cards,
      suggestions: catalog.filter((c) => !enrolledIds.has(Number(c.id))).slice(0, 2)
    });
  } catch (err) { next(err); }
});

router.get('/courses/:slug', async (req, res, next) => {
  try {
    const course = await store.getCourseBySlug(req.params.slug);
    if (!course) return next();
    const view = await courseWithProgress(course, req.user?.id);
    const enrolled = req.user ? await store.isEnrolled(req.user.id, course.id) : false;
    res.render('course', { title: course.title, ...view, enrolled });
  } catch (err) { next(err); }
});

router.post('/courses/:slug/enroll', requireAuth, async (req, res, next) => {
  try {
    const course = await store.getCourseBySlug(req.params.slug);
    if (!course) return next();
    await store.enroll(req.user.id, course.id);
    const lessons = await store.listLessons(course.id);
    const first = lessons[0];
    res.redirect(first ? `/courses/${course.slug}/lessons/${first.slug}` : `/courses/${course.slug}`);
  } catch (err) { next(err); }
});

router.get('/courses/:slug/lessons/:lessonSlug', requireAuth, async (req, res, next) => {
  try {
    const course = await store.getCourseBySlug(req.params.slug);
    if (!course) return next();
    if (!(await store.isEnrolled(req.user.id, course.id))) {
      return res.redirect(`/courses/${course.slug}`);
    }

    const lesson = await store.getLesson(course.id, req.params.lessonSlug);
    if (!lesson) return next();

    const view = await courseWithProgress(course, req.user.id);
    const index = view.lessons.findIndex((l) => Number(l.id) === Number(lesson.id));
    const question = await store.getQuestion(lesson.id);

    res.render('lesson', {
      title: lesson.title,
      ...view,
      lesson: view.lessons[index],
      paragraphs: String(lesson.body).split('\n\n'),
      prev: view.lessons[index - 1] || null,
      next: view.lessons[index + 1] || null,
      question: question ? { id: question.id, prompt: question.prompt, options: question.options } : null,
      result: null
    });
  } catch (err) { next(err); }
});

router.post('/lessons/:id/complete', requireAuth, async (req, res, next) => {
  try {
    const lesson = await store.getLessonById(req.params.id);
    if (!lesson) return next();
    const course = await store.getCourseById(lesson.course_id);
    if (!(await store.isEnrolled(req.user.id, course.id))) return res.status(403).send('Not enrolled');

    await store.markComplete(req.user.id, lesson.id);

    const lessons = await store.listLessons(course.id);
    const index = lessons.findIndex((l) => Number(l.id) === Number(lesson.id));
    const next_ = lessons[index + 1];
    res.redirect(next_ ? `/courses/${course.slug}/lessons/${next_.slug}` : `/courses/${course.slug}`);
  } catch (err) { next(err); }
});

router.post('/lessons/:id/quiz', requireAuth, async (req, res, next) => {
  try {
    const lesson = await store.getLessonById(req.params.id);
    if (!lesson) return next();
    const question = await store.getQuestion(lesson.id);
    if (!question) {
      const c = await store.getCourseById(lesson.course_id);
      return res.redirect(`/courses/${c.slug}/lessons/${lesson.slug}`);
    }

    const choice = Number(req.body.choice);
    const correct = choice === Number(question.answer_index);
    await store.recordAttempt(req.user.id, lesson.id, correct);

    const course = await store.getCourseById(lesson.course_id);
    const view = await courseWithProgress(course, req.user.id);
    const index = view.lessons.findIndex((l) => Number(l.id) === Number(lesson.id));

    res.render('lesson', {
      title: lesson.title,
      ...view,
      lesson: view.lessons[index],
      paragraphs: String(lesson.body).split('\n\n'),
      prev: view.lessons[index - 1] || null,
      next: view.lessons[index + 1] || null,
      question: { id: question.id, prompt: question.prompt, options: question.options },
      result: { correct, choice, explanation: question.explanation }
    });
  } catch (err) { next(err); }
});

// Small JSON surface, handy for a future mobile client or a progress widget.
router.get('/api/me/progress', requireAuth, async (req, res, next) => {
  try {
    const enrolled = await store.listEnrolledCourses(req.user.id);
    const data = await Promise.all(enrolled.map(async (c) => {
      const v = await courseWithProgress(c, req.user.id);
      return { slug: c.slug, title: c.title, completed: v.completed, total: v.total, percent: v.percent };
    }));
    res.json({ user: { id: req.user.id, name: req.user.name }, courses: data });
  } catch (err) { next(err); }
});

module.exports = router;
