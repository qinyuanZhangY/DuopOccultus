const path = require("node:path");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { DataStore } = require("./src/dataStore");
const { gradeLesson } = require("./src/grading");

const app = express();
const store = new DataStore();

const LEVELS = new Set(["beginner", "advanced"]);
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

app.use(async (req, _res, next) => {
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

function normalizeLessonPayload(payload) {
  const skillId = normalizeString(payload.skillId);
  const level = normalizeString(payload.level);
  const title = normalizeString(payload.title);
  const estimatedMinutes = Number(payload.estimatedMinutes || 6);
  const concept = Array.isArray(payload.concept)
    ? payload.concept.map(normalizeString).filter(Boolean)
    : [];

  const questions = Array.isArray(payload.questions) ? payload.questions : [];

  if (!store.db.skills.some((skill) => skill.id === skillId)) {
    return { error: "技能模块不存在" };
  }
  if (!LEVELS.has(level)) {
    return { error: "课程等级必须为 beginner 或 advanced" };
  }
  if (!title) {
    return { error: "课程标题不能为空" };
  }
  if (!Number.isFinite(estimatedMinutes) || estimatedMinutes < 5 || estimatedMinutes > 8) {
    return { error: "课程时长需在 5 到 8 分钟之间" };
  }
  if (concept.length < 2) {
    return { error: "概念课内容至少 2 段" };
  }
  if (questions.length !== 8) {
    return { error: "每章必须包含 8 道题" };
  }

  for (let i = 0; i < questions.length; i += 1) {
    const message = validateQuestion(questions[i], i);
    if (message) {
      return { error: message };
    }
  }

  const normalizedQuestions = questions.map((question, index) => ({
    id: `q${index + 1}`,
    ...question,
    type: normalizeString(question.type),
  }));

  return {
    value: {
      skillId,
      level,
      title,
      estimatedMinutes,
      concept,
      questions: normalizedQuestions,
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

app.get("/api/skills", requireAuth, (req, res) => {
  const user = store.getSafeUser(req.currentUser);
  const skills = store.getSkillsWithLessons(req.currentUser);
  return res.json({
    user,
    skills,
    disclaimer: store.getDisclaimer(),
  });
});

app.get("/api/lessons/:lessonId", requireAuth, (req, res) => {
  const lesson = store.getPublicLesson(req.params.lessonId);
  if (!lesson) {
    return res.status(404).json({ error: "课程不存在" });
  }
  return res.json({ lesson });
});

app.post("/api/lessons/:lessonId/submit", requireAuth, async (req, res) => {
  const lesson = store.getLessonWithAnswers(req.params.lessonId);
  if (!lesson) {
    return res.status(404).json({ error: "课程不存在" });
  }

  const responses = req.body.responses;
  if (!responses || typeof responses !== "object") {
    return res.status(400).json({ error: "提交内容格式错误" });
  }

  const grade = gradeLesson(lesson, responses);
  const progress = await store.updateProgress({
    userId: req.currentUser.id,
    lessonId: lesson.id,
    grade,
  });

  return res.json({
    grade,
    xpGain: progress.xpGain,
    totalXp: progress.totalXp,
    firstCompletion: progress.firstCompletion,
  });
});

app.get("/api/admin/data", requireAdmin, (req, res) => {
  return res.json({
    skills: store.db.skills,
    lessons: store.getAdminLessons(),
  });
});

app.post("/api/admin/lessons", requireAdmin, async (req, res) => {
  const normalized = normalizeLessonPayload(req.body);
  if (normalized.error) {
    return res.status(400).json({ error: normalized.error });
  }
  const lesson = await store.createLesson(normalized.value);
  return res.status(201).json({ lesson });
});

app.put("/api/admin/lessons/:lessonId", requireAdmin, async (req, res) => {
  const normalized = normalizeLessonPayload(req.body);
  if (normalized.error) {
    return res.status(400).json({ error: normalized.error });
  }
  const lesson = await store.updateLesson(req.params.lessonId, normalized.value);
  if (!lesson) {
    return res.status(404).json({ error: "课程不存在" });
  }
  return res.json({ lesson });
});

app.delete("/api/admin/lessons/:lessonId", requireAdmin, async (req, res) => {
  const deleted = await store.deleteLesson(req.params.lessonId);
  if (!deleted) {
    return res.status(404).json({ error: "课程不存在" });
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
