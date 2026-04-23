const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const { gradeLesson, gradeQuestion } = require("./grading");

const DB_PATH = path.join(__dirname, "..", "data", "db.json");
const COURSE_FILES_DIR = path.join(__dirname, "..", "courses");
const NODE_COUNT_PER_SKILL = 4;

function makeId(size = 10) {
  return crypto.randomUUID().replace(/-/g, "").slice(0, size);
}

function normalizeMaybeString(value) {
  const text = String(value || "").trim();
  return text ? text : null;
}

function normalizeQuestion(question, index) {
  return {
    ...question,
    id: `q${index + 1}`,
  };
}

function sanitizeQuestion(question) {
  const clone = { ...question };
  delete clone.answer;
  delete clone.correctMap;
  return clone;
}

function byOrder(a, b) {
  return a.order - b.order;
}

function defaultSkills() {
  return [
    {
      id: "tarot",
      name: "塔罗",
      description: "从牌义关键词到牌阵解读结构",
      color: "#4a72ff",
      order: 1,
    },
    {
      id: "zodiac",
      name: "星座",
      description: "元素模式与星盘基础",
      color: "#2f9bff",
      order: 2,
    },
    {
      id: "yijing",
      name: "周易",
      description: "阴阳卦象与变化思维",
      color: "#1f78b4",
      order: 3,
    },
    {
      id: "shaman",
      name: "萨满",
      description: "自然连接与象征体验",
      color: "#155fa0",
      order: 4,
    },
  ];
}

function createCourses(skills) {
  return [...skills]
    .sort(byOrder)
    .map((skill) => ({
      id: skill.id,
      skillId: skill.id,
      title: skill.name,
      name: skill.name,
      color: skill.color,
      order: skill.order,
    }));
}

function buildNodeQuestions(skillName, nodeOrder) {
  return [
    {
      type: "multiple_choice",
      prompt: `${skillName}学习中，节点 ${nodeOrder} 最推荐的学习策略是？`,
      options: ["死记硬背", "先理解核心概念再练习", "只看结论", "只做题不看文本"],
      answer: "先理解核心概念再练习",
    },
    {
      type: "fill_blank",
      prompt: `${skillName}练习中，记录自己的感受有助于形成___。`,
      answer: "理解",
    },
    {
      type: "drag_match",
      prompt: `将 ${skillName} 关键词与对应含义配对`,
      leftItems: ["观察", "联想", "复盘"],
      rightItems: ["建立情境连接", "回看过程与结果", "先看信息细节"],
      correctMap: {
        观察: "先看信息细节",
        联想: "建立情境连接",
        复盘: "回看过程与结果",
      },
    },
    {
      type: "flip_card",
      front: `${skillName}提醒`,
      back: "先看上下文，再给出判断",
      prompt: "翻卡后，正确的学习顺序是？",
      options: ["先猜答案", "先看上下文", "先否定自己", "先复制别人结论"],
      answer: "先看上下文",
    },
    {
      type: "multiple_choice",
      prompt: `${skillName}节点练习最核心的目标是？`,
      options: ["制造神秘感", "提升理解与表达能力", "追求唯一答案", "忽略现实情境"],
      answer: "提升理解与表达能力",
    },
    {
      type: "fill_blank",
      prompt: "连续学习时，保持节奏比一次冲刺更___。",
      answer: "稳定",
    },
    {
      type: "multiple_choice",
      prompt: "当出现矛盾信息时，最好怎么做？",
      options: ["直接跳过", "回到题干与语境核对", "随机选择", "立即重置全部进度"],
      answer: "回到题干与语境核对",
    },
    {
      type: "multiple_choice",
      prompt: "你完成本节点后最应该做的是？",
      options: ["停止学习", "继续进入下一节点", "删掉记录", "忽略反馈"],
      answer: "继续进入下一节点",
    },
  ].map(normalizeQuestion);
}

function buildSeedPoint(skill, order) {
  return {
    id: makeId(10),
    courseId: skill.id,
    skillId: skill.id,
    title: `${skill.name} 节点 ${order}`,
    order,
    estimatedMinutes: 8,
    readingMinutes: 4,
    chapterText: [
      `${skill.name}节点 ${order}：先完成 3~5 分钟文本学习，再进入 8 道题挑战。`,
      "学习时建议按“概念理解 -> 情境判断 -> 复盘记录”的顺序推进。",
      "如果答错，请立即查看反馈并重试，直到答对再进入下一题。",
      "本应用用于兴趣学习与自我观察，不替代专业建议。",
    ],
    imageDataUrl: null,
    questions: buildNodeQuestions(skill.name, order),
    color: skill.color,
  };
}

function normalizeQuestionList(questions, skillName, order) {
  if (!Array.isArray(questions) || questions.length !== 8) {
    return buildNodeQuestions(skillName, order);
  }
  return questions.map(normalizeQuestion);
}

function ensureSkillPoints(points, skills) {
  const result = [...points];
  skills.forEach((skill) => {
    const skillPoints = result.filter((point) => point.courseId === skill.id);
    if (skillPoints.length >= NODE_COUNT_PER_SKILL) {
      return;
    }
    for (let i = skillPoints.length + 1; i <= NODE_COUNT_PER_SKILL; i += 1) {
      result.push(buildSeedPoint(skill, i));
    }
  });
  return result;
}

function reorderPoints(points) {
  const grouped = new Map();
  points.forEach((point) => {
    if (!grouped.has(point.courseId)) {
      grouped.set(point.courseId, []);
    }
    grouped.get(point.courseId).push(point);
  });

  const next = [];
  grouped.forEach((groupPoints) => {
    groupPoints
      .sort((a, b) => {
        if (a.order === b.order) {
          return a.id.localeCompare(b.id, "zh-Hans-CN");
        }
        return a.order - b.order;
      })
      .forEach((point, index) => {
        next.push({
          ...point,
          order: index + 1,
        });
      });
  });
  return next;
}

function deriveSkillId(rawValue, skills) {
  const value = String(rawValue || "").trim();
  if (!value) {
    return null;
  }
  if (skills.some((skill) => skill.id === value)) {
    return value;
  }
  const [first] = value.split("-");
  if (skills.some((skill) => skill.id === first)) {
    return first;
  }
  return null;
}

function deriveSkillIdFromText(rawValue, skills) {
  const value = String(rawValue || "")
    .trim()
    .toLowerCase();
  if (!value) {
    return null;
  }
  const normalized = value.replace(/[^a-z0-9]+/g, "");
  if (!normalized) {
    return null;
  }
  const aliases = {
    tarot: "tarot",
    zodiac: "zodiac",
    horoscope: "zodiac",
    yijing: "yijing",
    iching: "yijing",
    shaman: "shaman",
    shamanism: "shaman",
  };
  const direct = aliases[normalized];
  if (direct && skills.some((skill) => skill.id === direct)) {
    return direct;
  }
  const containsAlias = Object.entries(aliases).find(([alias]) => normalized.includes(alias));
  if (containsAlias && skills.some((skill) => skill.id === containsAlias[1])) {
    return containsAlias[1];
  }
  return null;
}

function deriveExternalNodeOrder(node, fallbackOrder) {
  const fromOrder = Number(node.order || node.nodeOrder || node.sequence);
  if (Number.isFinite(fromOrder) && fromOrder > 0) {
    return fromOrder;
  }
  const idText = String(node.id || "");
  const matched = idText.match(/(\d+)$/);
  if (matched) {
    const parsed = Number(matched[1]);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return fallbackOrder;
}

async function loadExternalCoursePoints(skills) {
  let files = [];
  try {
    files = await fs.readdir(COURSE_FILES_DIR);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const jsonFiles = files.filter((name) => name.toLowerCase().endsWith(".json"));
  const importedPoints = [];

  for (const fileName of jsonFiles) {
    const filePath = path.join(COURSE_FILES_DIR, fileName);
    let parsed;
    try {
      const raw = await fs.readFile(filePath, "utf8");
      parsed = JSON.parse(raw);
    } catch (_error) {
      continue;
    }

    const nodes = Array.isArray(parsed.course_nodes)
      ? parsed.course_nodes
      : Array.isArray(parsed.nodes)
        ? parsed.nodes
        : [];
    if (nodes.length === 0) {
      continue;
    }

    const fileHint = fileName.replace(/\.json$/i, "");
    const defaultCourseId = deriveSkillIdFromText(fileHint, skills);

    nodes.forEach((node, index) => {
      if (!node || typeof node !== "object") {
        return;
      }
      const sourceNodeId = String(node.id || "").trim() || `${fileHint}-${index + 1}`;
      const courseId =
        deriveSkillId(node.courseId || node.skillId, skills) ||
        deriveSkillIdFromText(sourceNodeId, skills) ||
        defaultCourseId;
      if (!courseId) {
        return;
      }
      const skill = skills.find((item) => item.id === courseId);
      if (!skill) {
        return;
      }
      const order = deriveExternalNodeOrder(node, index + 1);
      const title = String(node.title || "").trim() || `${skill.name} 节点 ${order}`;
      const learningGoal = String(node.learning_goal || node.description || "").trim();
      const chapterText = [
        `${skill.name}路径节点 ${order}：${title}`,
        learningGoal ? `学习目标：${learningGoal}` : "学习目标：建立核心概念并完成实战练习。",
        "学习建议：先阅读文本，再完成 8 道题，错题会延后到本组末尾继续练习。",
        "本应用用于兴趣学习与自我观察，不替代专业建议。",
      ];
      importedPoints.push({
        id: makeId(10),
        sourceNodeId,
        courseId,
        skillId: courseId,
        title,
        order,
        estimatedMinutes: 8,
        readingMinutes: 4,
        chapterText,
        imageDataUrl: null,
        questions: buildNodeQuestions(skill.name, order),
        color: skill.color,
      });
    });
  }

  return importedPoints;
}

function mergeExternalPoints(points, externalPoints) {
  if (!Array.isArray(externalPoints) || externalPoints.length === 0) {
    return points;
  }
  const merged = [...points];

  externalPoints.forEach((externalPoint) => {
    const bySourceIndex = merged.findIndex(
      (item) =>
        item.courseId === externalPoint.courseId &&
        item.sourceNodeId &&
        item.sourceNodeId === externalPoint.sourceNodeId,
    );
    if (bySourceIndex >= 0) {
      const existing = merged[bySourceIndex];
      merged[bySourceIndex] = {
        ...existing,
        ...externalPoint,
        id: existing.id,
        imageDataUrl: existing.imageDataUrl || externalPoint.imageDataUrl,
      };
      return;
    }

    merged.push(externalPoint);
  });

  return merged;
}

async function createSeedData() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const learnerHash = await bcrypt.hash("demo123", 10);
  const skills = defaultSkills();
  const courses = createCourses(skills);
  const seedPoints = skills.flatMap((skill) =>
    Array.from({ length: NODE_COUNT_PER_SKILL }, (_unused, index) => buildSeedPoint(skill, index + 1)),
  );
  const externalPoints = await loadExternalCoursePoints(skills);
  const points = reorderPoints(ensureSkillPoints(mergeExternalPoints(seedPoints, externalPoints), skills));
  const firstCourseId = courses[0]?.id ?? null;
  const firstPointId = points.find((point) => point.courseId === firstCourseId)?.id ?? null;

  return {
    disclaimer:
      "本应用仅用于文化兴趣学习与娱乐体验，不构成医疗、法律、投资或人生决策建议。",
    skills,
    courses,
    points,
    users: [
      {
        id: makeId(10),
        username: "admin",
        passwordHash: adminHash,
        role: "admin",
        xp: 0,
        completedPoints: {},
        lastSession: {
          courseId: firstCourseId,
          pointId: firstPointId,
        },
      },
      {
        id: makeId(10),
        username: "demo",
        passwordHash: learnerHash,
        role: "learner",
        xp: 0,
        completedPoints: {},
        lastSession: {
          courseId: firstCourseId,
          pointId: firstPointId,
        },
      },
    ],
  };
}

class DataStore {
  constructor() {
    this.db = null;
  }

  async init() {
    try {
      const raw = await fs.readFile(DB_PATH, "utf8");
      this.db = JSON.parse(raw);
      await this.migrateIfNeeded();
      await this.save();
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
      this.db = await createSeedData();
      await this.save();
    }
  }

  async migrateIfNeeded() {
    const skills = Array.isArray(this.db.skills) && this.db.skills.length > 0 ? this.db.skills : defaultSkills();
    const normalizedSkills = defaultSkills().map((skill) => {
      const existing = skills.find((item) => item.id === skill.id);
      return existing ? { ...skill, ...existing, id: skill.id, name: skill.name } : skill;
    });
    const courses = createCourses(normalizedSkills);

    const sourcePoints = Array.isArray(this.db.points)
      ? this.db.points
      : Array.isArray(this.db.lessons)
        ? this.db.lessons
        : [];

    const normalizedPoints = sourcePoints
      .map((point) => {
        const skillId = deriveSkillId(point.skillId || point.courseId, normalizedSkills);
        if (!skillId) {
          return null;
        }
        const skill = normalizedSkills.find((item) => item.id === skillId);
        const roughOrder = Number(point.order || point.nodeOrder || 1);
        const order = Number.isFinite(roughOrder) && roughOrder > 0 ? roughOrder : 1;
        const chapterText = Array.isArray(point.chapterText)
          ? point.chapterText
          : Array.isArray(point.concept)
            ? point.concept
            : Array.isArray(point.learningText)
              ? point.learningText
              : [];
        return {
          id: point.id || makeId(10),
          sourceNodeId: normalizeMaybeString(point.sourceNodeId || point.externalNodeId),
          courseId: skillId,
          skillId,
          title: point.title || `${skill.name} 节点 ${order}`,
          order,
          estimatedMinutes: Number(point.estimatedMinutes || 8),
          readingMinutes: Number(point.readingMinutes || point.textDurationMinutes || 4),
          chapterText: chapterText.map((line) => String(line || "").trim()).filter(Boolean),
          imageDataUrl: normalizeMaybeString(point.imageDataUrl || point.pointImage),
          questions: normalizeQuestionList(point.questions, skill.name, order),
          color: skill.color,
        };
      })
      .filter(Boolean);

    const externalPoints = await loadExternalCoursePoints(normalizedSkills);
    const points = reorderPoints(
      ensureSkillPoints(mergeExternalPoints(normalizedPoints, externalPoints), normalizedSkills),
    );

    const validPointIds = new Set(points.map((point) => point.id));
    const users = (Array.isArray(this.db.users) ? this.db.users : []).map((user) => {
      const completedPointsRaw = user.completedPoints || user.completedLessons || {};
      const completedPoints = {};
      Object.entries(completedPointsRaw).forEach(([pointId, value]) => {
        if (validPointIds.has(pointId)) {
          completedPoints[pointId] = value;
        }
      });

      const fallbackCourseId = courses[0]?.id || null;
      const mappedCourseId =
        deriveSkillId(user.lastSession?.courseId, normalizedSkills) || fallbackCourseId;
      const coursePoints = points.filter((point) => point.courseId === mappedCourseId);
      const mappedPointId = validPointIds.has(user.lastSession?.pointId)
        ? user.lastSession.pointId
        : coursePoints[0]?.id || null;

      return {
        ...user,
        xp: Number(user.xp || 0),
        completedPoints,
        lastSession: {
          courseId: mappedCourseId,
          pointId: mappedPointId,
        },
      };
    });

    this.db = {
      disclaimer:
        this.db.disclaimer ||
        "本应用仅用于文化兴趣学习与娱乐体验，不构成医疗、法律、投资或人生决策建议。",
      skills: normalizedSkills,
      courses,
      points,
      users,
    };
  }

  async save() {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(this.db, null, 2), "utf8");
  }

  getDisclaimer() {
    return this.db.disclaimer;
  }

  getUserByUsername(username) {
    return this.db.users.find((user) => user.username === username);
  }

  getUserById(userId) {
    return this.db.users.find((user) => user.id === userId);
  }

  getSafeUser(user) {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      xp: user.xp,
      completedPoints: user.completedPoints,
      lastSession: user.lastSession,
    };
  }

  async createUser({ username, password, role = "learner" }) {
    const passwordHash = await bcrypt.hash(password, 10);
    const firstCourseId = this.db.courses[0]?.id ?? null;
    const firstPointId = this.getCoursePoints(firstCourseId)[0]?.id ?? null;
    const user = {
      id: makeId(10),
      username,
      passwordHash,
      role,
      xp: 0,
      completedPoints: {},
      lastSession: {
        courseId: firstCourseId,
        pointId: firstPointId,
      },
    };
    this.db.users.push(user);
    await this.save();
    return user;
  }

  getCourseById(courseId) {
    return this.db.courses.find((course) => course.id === courseId) || null;
  }

  getCoursePoints(courseId) {
    return this.db.points
      .filter((point) => point.courseId === courseId)
      .sort((a, b) => a.order - b.order);
  }

  isPointUnlocked(user, pointId) {
    const point = this.getPointById(pointId);
    if (!point) {
      return false;
    }
    const points = this.getCoursePoints(point.courseId);
    const currentIndex = points.findIndex((item) => item.id === pointId);
    if (currentIndex <= 0) {
      return true;
    }
    for (let i = 0; i < currentIndex; i += 1) {
      if (!user.completedPoints[points[i].id]) {
        return false;
      }
    }
    return true;
  }

  getFirstActivePoint(user, courseId) {
    const points = this.getCoursePoints(courseId);
    return points.find((point) => !user.completedPoints[point.id]) || points[0] || null;
  }

  getLearningHome(user) {
    const courses = [...this.db.courses].sort(byOrder);
    const selectedCourseId =
      courses.find((course) => course.id === user.lastSession?.courseId)?.id || courses[0]?.id || null;
    const resumePointId = user.lastSession?.pointId || this.getFirstActivePoint(user, selectedCourseId)?.id || null;

    const mappedCourses = courses.map((course) => {
      const points = this.getCoursePoints(course.id);
      let foundCurrent = false;
      const mappedPoints = points.map((point) => {
        if (user.completedPoints[point.id]) {
          return {
            id: point.id,
            title: point.title,
            order: point.order,
            estimatedMinutes: point.estimatedMinutes,
            readingMinutes: point.readingMinutes,
            state: "completed",
            status: "completed",
          };
        }
        if (!foundCurrent) {
          foundCurrent = true;
          return {
            id: point.id,
            title: point.title,
            order: point.order,
            estimatedMinutes: point.estimatedMinutes,
            readingMinutes: point.readingMinutes,
            state: "current",
            status: "current",
          };
        }
        return {
          id: point.id,
          title: point.title,
          order: point.order,
          estimatedMinutes: point.estimatedMinutes,
          readingMinutes: point.readingMinutes,
          state: "locked",
          status: "locked",
        };
      });

      const courseResumePoint =
        user.lastSession?.courseId === course.id
          ? this.getPointById(user.lastSession?.pointId)
          : this.getFirstActivePoint(user, course.id);

      return {
        ...course,
        name: course.title,
        resumePointId: courseResumePoint?.id || null,
        resumePointTitle: courseResumePoint?.title || null,
        points: mappedPoints,
      };
    });

    return {
      selectedCourseId,
      resumePointId,
      courses: mappedCourses,
    };
  }

  async updateLastSession(userId, { courseId, pointId }) {
    const user = this.getUserById(userId);
    if (!user) {
      return;
    }
    user.lastSession = {
      courseId: courseId || user.lastSession?.courseId || null,
      pointId: pointId || user.lastSession?.pointId || null,
    };
    await this.save();
  }

  getPointById(pointId) {
    return this.db.points.find((point) => point.id === pointId) || null;
  }

  getPublicPoint(courseId, pointId) {
    const point = this.db.points.find((item) => item.id === pointId && item.courseId === courseId);
    if (!point) {
      return null;
    }
    return {
      id: point.id,
      courseId: point.courseId,
      title: point.title,
      order: point.order,
      estimatedMinutes: point.estimatedMinutes,
      readingMinutes: point.readingMinutes,
      chapterText: point.chapterText,
      imageDataUrl: point.imageDataUrl || null,
      questions: point.questions.map(sanitizeQuestion),
    };
  }

  getPointWithAnswers(pointId) {
    return this.getPointById(pointId);
  }

  checkPointQuestion(pointId, questionId, response) {
    const point = this.getPointWithAnswers(pointId);
    if (!point) {
      return { error: "路径点不存在" };
    }
    const question = point.questions.find((item) => item.id === questionId);
    if (!question) {
      return { error: "题目不存在" };
    }
    return {
      correct: gradeQuestion(question, response),
      question,
      point,
    };
  }

  async completePoint({ userId, pointId, responses }) {
    const point = this.getPointWithAnswers(pointId);
    if (!point) {
      return { error: "路径点不存在" };
    }
    const user = this.getUserById(userId);
    if (!this.isPointUnlocked(user, point.id)) {
      return { error: "当前路径点尚未解锁" };
    }
    const grade = gradeLesson(point, responses || {});
    if (grade.correct !== grade.total) {
      return { error: "请先答对全部 8 题", grade };
    }
    const hadCompletion = Boolean(user.completedPoints[point.id]);
    const xpGain = hadCompletion ? 0 : 80;
    user.completedPoints[point.id] = {
      score: `${grade.correct}/${grade.total}`,
      timestamp: Date.now(),
      xpGain,
    };
    user.xp += xpGain;
    const nextPoint = this.getCoursePoints(point.courseId).find((item) => !user.completedPoints[item.id]) || null;
    user.lastSession = {
      courseId: point.courseId,
      pointId: nextPoint ? nextPoint.id : point.id,
    };
    await this.save();
    return {
      grade,
      xpGain,
      totalXp: user.xp,
      nextPointId: nextPoint?.id || null,
      finishedCourse: !nextPoint,
      firstCompletion: !hadCompletion,
    };
  }

  getAdminOverview() {
    return {
      courses: [...this.db.courses].sort(byOrder),
      pathPoints: [...this.db.points]
        .sort((a, b) => {
          if (a.courseId === b.courseId) {
            return a.order - b.order;
          }
          return a.courseId.localeCompare(b.courseId, "zh-Hans-CN");
        })
        .map((point) => ({
          id: point.id,
          courseId: point.courseId,
          order: point.order,
          title: point.title,
          estimatedMinutes: point.estimatedMinutes,
          readingMinutes: point.readingMinutes,
          learningText: point.chapterText,
          imageDataUrl: point.imageDataUrl || null,
          questions: point.questions,
        })),
    };
  }

  reorderCoursePoints(courseId) {
    const sorted = this.getCoursePoints(courseId);
    sorted.forEach((point, index) => {
      point.order = index + 1;
    });
  }

  async createPoint(payload) {
    const point = {
      id: makeId(10),
      courseId: payload.courseId,
      skillId: payload.courseId,
      title: payload.title,
      order: Number(payload.order || 1),
      estimatedMinutes: Number(payload.estimatedMinutes || 8),
      readingMinutes: Number(payload.readingMinutes || 4),
      chapterText: Array.isArray(payload.chapterText) ? payload.chapterText : [],
      imageDataUrl: normalizeMaybeString(payload.imageDataUrl),
      questions: payload.questions.map(normalizeQuestion),
      color: this.getCourseById(payload.courseId)?.color || "#4a72ff",
    };
    this.db.points.push(point);
    this.reorderCoursePoints(point.courseId);
    await this.save();
    return point;
  }

  async updatePoint(pointId, payload) {
    const point = this.getPointById(pointId);
    if (!point) {
      return null;
    }
    const oldCourseId = point.courseId;
    point.courseId = payload.courseId;
    point.skillId = payload.courseId;
    point.title = payload.title;
    point.order = Number(payload.order || 1);
    point.estimatedMinutes = Number(payload.estimatedMinutes || 8);
    point.readingMinutes = Number(payload.readingMinutes || 4);
    point.chapterText = Array.isArray(payload.chapterText) ? payload.chapterText : [];
    point.imageDataUrl = normalizeMaybeString(payload.imageDataUrl);
    point.questions = payload.questions.map(normalizeQuestion);
    point.color = this.getCourseById(payload.courseId)?.color || "#4a72ff";
    this.reorderCoursePoints(oldCourseId);
    this.reorderCoursePoints(point.courseId);
    await this.save();
    return point;
  }

  async deletePoint(pointId) {
    const point = this.getPointById(pointId);
    if (!point) {
      return false;
    }
    this.db.points = this.db.points.filter((item) => item.id !== pointId);
    this.reorderCoursePoints(point.courseId);

    this.db.users.forEach((user) => {
      delete user.completedPoints[pointId];
      if (user.lastSession?.pointId === pointId) {
        const fallback = this.getCoursePoints(user.lastSession.courseId)[0] || this.db.points[0] || null;
        user.lastSession = {
          courseId: fallback?.courseId || this.db.courses[0]?.id || null,
          pointId: fallback?.id || null,
        };
      }
    });

    await this.save();
    return true;
  }
}

module.exports = {
  DataStore,
};
