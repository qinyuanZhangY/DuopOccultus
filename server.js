const path = require("node:path");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { DataStore } = require("./src/dataStore");

const app = express();
const store = new DataStore();

const QUESTION_TYPES = new Set([
  "multiple_choice",
  "drag_match",
  "fill_blank",
  "flip_card",
]);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "duop-occultus-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

app.use((req, _res, next) => {
  if (!req.session.userId) {
    req.currentUser = null;
    return next();
  }
  req.currentUser = store.getUserById(req.session.userId) || null;
  return next();
});

app.use(express.static(path.join(__dirname, "public")));

function requireAuth(req, res, next) {
  if (!req.currentUser) {
    return res.status(401).json({ error: "请先登录" });
  }
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.currentUser) {
    return res.status(401).json({ error: "请先登录" });
  }
  if (req.currentUser.role !== "admin") {
    return res.status(403).json({ error: "仅管理员可访问" });
  }
  return next();
}

function normalizeString(value) {
  return String(value || "").trim();
}

function validateQuestion(question, index) {
  if (!question || typeof question !== "object") {
    return `第 ${index + 1} 题格式错误`;
  }

  const type = normalizeString(question.type);
  if (!QUESTION_TYPES.has(type)) {
    return `第 ${index + 1} 题类型不支持`;
  }

  if (type === "multiple_choice") {
    if (!normalizeString(question.prompt)) {
      return `第 ${index + 1} 题缺少题干`;
    }
    if (!Array.isArray(question.options) || question.options.length < 2) {
      return `第 ${index + 1} 题选项至少 2 个`;
    }
    if (!normalizeString(question.answer)) {
      return `第 ${index + 1} 题缺少答案`;
    }
    return null;
  }

  if (type === "fill_blank") {
    if (!normalizeString(question.prompt) || !normalizeString(question.answer)) {
      return `第 ${index + 1} 题填空题配置不完整`;
    }
    return null;
  }

  if (type === "flip_card") {
    if (
      !normalizeString(question.front) ||
      !normalizeString(question.back) ||
      !normalizeString(question.prompt)
    ) {
      return `第 ${index + 1} 题翻转卡片配置不完整`;
    }
    if (!Array.isArray(question.options) || question.options.length < 2) {
      return `第 ${index + 1} 题翻转卡片选项至少 2 个`;
    }
    if (!normalizeString(question.answer)) {
      return `第 ${index + 1} 题翻转卡片缺少答案`;
    }
    return null;
  }

  if (type === "drag_match") {
    if (!normalizeString(question.prompt)) {
      return `第 ${index + 1} 题拖拽配对缺少题干`;
    }
    if (!Array.isArray(question.leftItems) || question.leftItems.length < 2) {
      return `第 ${index + 1} 题拖拽配对左侧至少 2 项`;
    }
    if (
      !Array.isArray(question.rightItems) ||
      question.rightItems.length !== question.leftItems.length
    ) {
      return `第 ${index + 1} 题拖拽配对左右项数量不一致`;
    }
    if (!question.correctMap || typeof question.correctMap !== "object") {
      return `第 ${index + 1} 题拖拽配对缺少正确映射`;
    }
  }

  return null;
}

function normalizePointPayload(payload) {
  const courseId = normalizeString(payload.courseId);
  const title = normalizeString(payload.title);
  const order = Number(payload.order);
  const readingMinutes = Number(payload.readingMinutes || 4);
  const estimatedMinutes = Number(payload.estimatedMinutes || 8);
  const chapterText = Array.isArray(payload.readingLines)
    ? payload.readingLines.map(normalizeString).filter(Boolean)
    : [];
  const questions = Array.isArray(payload.questions) ? payload.questions : [];

  if (!courseId) {
    return { error: "courseId 不能为空" };
  }
  if (!title) {
    return { error: "路径点标题不能为空" };
  }
  if (!Number.isFinite(order) || order < 1) {
    return { error: "序号必须大于 0" };
  }
  if (!Number.isFinite(readingMinutes) || readingMinutes < 3 || readingMinutes > 5) {
    return { error: "文本时长需在 3 到 5 分钟之间" };
  }
  if (!Number.isFinite(estimatedMinutes) || estimatedMinutes < 5 || estimatedMinutes > 8) {
    return { error: "路径点总时长需在 5 到 8 分钟之间" };
  }
  if (chapterText.length < 2) {
    return { error: "学习文本至少 2 段" };
  }
  if (questions.length !== 8) {
    return { error: "每个路径点必须配置 8 道题" };
  }

  for (let i = 0; i < questions.length; i += 1) {
    const message = validateQuestion(questions[i], i);
    if (message) {
      return { error: message };
    }
  }

  return {
    value: {
      courseId,
      title,
      order,
      readingMinutes,
      estimatedMinutes,
      chapterText,
      questions,
    },
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/disclaimer", (_req, res) => {
  res.json({ disclaimer: store.getDisclaimer() });
});

app.post("/api/auth/register", async (req, res) => {
  const username = normalizeString(req.body.username);
  const password = normalizeString(req.body.password);

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: "用户名需为 3-20 个字符" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "密码至少 6 位" });
  }
  if (store.getUserByUsername(username)) {
    return res.status(409).json({ error: "用户名已存在" });
  }

  const user = await store.createUser({ username, password, role: "learner" });
  req.session.userId = user.id;
  return res.json({ user: store.getSafeUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const username = normalizeString(req.body.username);
  const password = normalizeString(req.body.password);
  const user = store.getUserByUsername(username);
  if (!user) {
    return res.status(401).json({ error: "用户名或密码错误" });
  }
  const matched = await bcrypt.compare(password, user.passwordHash);
  if (!matched) {
    return res.status(401).json({ error: "用户名或密码错误" });
  }
  req.session.userId = user.id;
  return res.json({ user: store.getSafeUser(user) });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get("/api/auth/me", (req, res) => {
  if (!req.currentUser) {
    return res.status(401).json({ error: "未登录" });
  }
  return res.json({ user: store.getSafeUser(req.currentUser) });
});

app.get("/api/progress", requireAuth, (req, res) => {
  const home = store.getLearningHome(req.currentUser);
  return res.json({
    user: store.getSafeUser(req.currentUser),
    disclaimer: store.getDisclaimer(),
    courses: home.courses,
    selectedCourseId: home.selectedCourseId,
    resumePointId: home.resumePointId,
  });
});

app.put("/api/progress/course", requireAuth, async (req, res) => {
  const courseId = normalizeString(req.body.courseId);
  const course = store.getCourseById(courseId);
  if (!course) {
    return res.status(404).json({ error: "课程不存在" });
  }
  const point = store.getFirstActivePoint(req.currentUser, courseId);
  await store.updateLastSession(req.currentUser.id, {
    courseId,
    pointId: point?.id || null,
  });
  const home = store.getLearningHome(req.currentUser);
  return res.json({
    user: store.getSafeUser(req.currentUser),
    courses: home.courses,
    selectedCourseId: home.selectedCourseId,
    resumePointId: home.resumePointId,
  });
});

app.get("/api/path-points/:pointId", requireAuth, async (req, res) => {
  const point = store.getPointById(req.params.pointId);
  if (!point) {
    return res.status(404).json({ error: "路径点不存在" });
  }
  if (!store.isPointUnlocked(req.currentUser, point.id) && !req.currentUser.completedPoints[point.id]) {
    return res.status(403).json({ error: "当前路径点尚未解锁" });
  }
  const publicPoint = store.getPublicPoint(point.courseId, point.id);
  await store.updateLastSession(req.currentUser.id, {
    courseId: point.courseId,
    pointId: point.id,
  });
  return res.json({
    pathPoint: {
      id: publicPoint.id,
      courseId: publicPoint.courseId,
      title: publicPoint.title,
      order: publicPoint.order,
      estimatedMinutes: publicPoint.estimatedMinutes,
      textDurationMinutes: publicPoint.readingMinutes,
      textContent: publicPoint.chapterText,
      questions: publicPoint.questions,
    },
    status: {
      completed: Boolean(req.currentUser.completedPoints[point.id]),
      currentQuestionIndex: 0,
    },
  });
});

app.post("/api/path-points/:pointId/questions/:questionId/submit", requireAuth, (req, res) => {
  const point = store.getPointById(req.params.pointId);
  if (!point) {
    return res.status(404).json({ error: "路径点不存在" });
  }
  if (!store.isPointUnlocked(req.currentUser, point.id) && !req.currentUser.completedPoints[point.id]) {
    return res.status(403).json({ error: "当前路径点尚未解锁" });
  }
  const checked = store.checkPointQuestion(req.params.pointId, req.params.questionId, req.body.response);
  if (checked.error) {
    return res.status(400).json({ error: checked.error });
  }
  const correctAnswer =
    checked.question.type === "drag_match" ? checked.question.correctMap : checked.question.answer;
  return res.json({
    correct: checked.correct,
    questionType: checked.question.type,
    correctAnswer: checked.correct ? null : correctAnswer,
  });
});

app.post("/api/path-points/:pointId/complete", requireAuth, async (req, res) => {
  const result = await store.completePoint({
    userId: req.currentUser.id,
    pointId: req.params.pointId,
    responses: req.body.responses || {},
  });
  if (result.error) {
    return res.status(400).json({ error: result.error, grade: result.grade });
  }
  return res.json({
    ...result,
    user: store.getSafeUser(req.currentUser),
  });
});

app.get("/api/admin/data", requireAdmin, (req, res) => {
  return res.json(store.getAdminOverview());
});

app.post("/api/admin/points", requireAdmin, async (req, res) => {
  const normalized = normalizePointPayload(req.body);
  if (normalized.error) {
    return res.status(400).json({ error: normalized.error });
  }
  if (!store.getCourseById(normalized.value.courseId)) {
    return res.status(400).json({ error: "courseId 不存在" });
  }
  const point = await store.createPoint(normalized.value);
  return res.status(201).json({ point });
});

app.put("/api/admin/points/:pointId", requireAdmin, async (req, res) => {
  const normalized = normalizePointPayload(req.body);
  if (normalized.error) {
    return res.status(400).json({ error: normalized.error });
  }
  if (!store.getCourseById(normalized.value.courseId)) {
    return res.status(400).json({ error: "courseId 不存在" });
  }
  const point = await store.updatePoint(req.params.pointId, normalized.value);
  if (!point) {
    return res.status(404).json({ error: "路径点不存在" });
  }
  return res.json({ point });
});

app.delete("/api/admin/points/:pointId", requireAdmin, async (req, res) => {
  const deleted = await store.deletePoint(req.params.pointId);
  if (!deleted) {
    return res.status(404).json({ error: "路径点不存在" });
  }
  return res.json({ ok: true });
});

app.get("/app", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "app.html"));
});

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

async function start() {
  await store.init();
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`DuopOccultus running at http://localhost:${port}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  app,
  start,
};
