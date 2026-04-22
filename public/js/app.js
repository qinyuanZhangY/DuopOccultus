const state = {
  user: null,
  disclaimer: "",
  courses: [],
  selectedCourseId: null,
  activePoint: null,
  currentQuestionIndex: 0,
  responses: {},
  completionResult: null,
};

const views = {
  auth: document.querySelector("#authView"),
  course: document.querySelector("#courseView"),
  path: document.querySelector("#pathView"),
  content: document.querySelector("#contentView"),
  quiz: document.querySelector("#quizView"),
  finish: document.querySelector("#finishView"),
};

const authForm = document.querySelector("#authForm");
const usernameInput = document.querySelector("#usernameInput");
const passwordInput = document.querySelector("#passwordInput");
const registerBtn = document.querySelector("#registerBtn");
const authMessage = document.querySelector("#authMessage");
const logoutBtn = document.querySelector("#logoutBtn");

const welcomeTitle = document.querySelector("#welcomeTitle");
const xpValue = document.querySelector("#xpValue");
const disclaimerText = document.querySelector("#disclaimerText");
const courseTabs = document.querySelector("#courseTabs");
const resumeHint = document.querySelector("#resumeHint");

const pathCourseTitle = document.querySelector("#pathCourseTitle");
const pathCourseMeta = document.querySelector("#pathCourseMeta");
const pathTimeline = document.querySelector("#pathTimeline");
const changeCourseBtn = document.querySelector("#changeCourseBtn");

const pointTitle = document.querySelector("#pointTitle");
const pointMeta = document.querySelector("#pointMeta");
const pointCover = document.querySelector("#pointCover");
const pointConcept = document.querySelector("#pointConcept");
const backToPathBtn = document.querySelector("#backToPathBtn");
const startQuizBtn = document.querySelector("#startQuizBtn");

const quizProgress = document.querySelector("#quizProgress");
const quizTypeTag = document.querySelector("#quizTypeTag");
const quizPrompt = document.querySelector("#quizPrompt");
const quizBody = document.querySelector("#quizBody");
const quizFeedback = document.querySelector("#quizFeedback");
const submitAnswerBtn = document.querySelector("#submitAnswerBtn");
const nextQuestionBtn = document.querySelector("#nextQuestionBtn");

const finishText = document.querySelector("#finishText");
const finishXp = document.querySelector("#finishXp");
const continuePathBtn = document.querySelector("#continuePathBtn");
const backToPathFromFinishBtn = document.querySelector("#backToPathFromFinishBtn");

function showView(name) {
  Object.entries(views).forEach(([key, element]) => {
    element.classList.toggle("hidden", key !== name);
  });
  logoutBtn.classList.toggle("hidden", name === "auth");
}

function showAuthMessage(message, isError = true) {
  authMessage.textContent = message;
  authMessage.className = isError ? "message status-bad" : "message status-ok";
}

function typeLabel(type) {
  const map = {
    multiple_choice: "选择题",
    drag_match: "拖拽配对",
    fill_blank: "填空题",
    flip_card: "卡片翻转",
  };
  return map[type] || "题目";
}

function formatCorrectAnswer(result) {
  if (!result || result.correctAnswer == null) {
    return "";
  }

  if (result.questionType === "drag_match" && typeof result.correctAnswer === "object") {
    return Object.entries(result.correctAnswer)
      .map(([left, right]) => `${left} -> ${right}`)
      .join("；");
  }

  return String(result.correctAnswer);
}

function getSelectedCourse() {
  return state.courses.find((course) => course.id === state.selectedCourseId) || null;
}

function updateHeader() {
  if (!state.user) {
    return;
  }
  welcomeTitle.textContent = `欢迎，${state.user.username}`;
  xpValue.textContent = String(state.user.xp);
  disclaimerText.textContent = state.disclaimer;
}

async function changeCourse(courseId) {
  await window.Api.setCurrentCourse(courseId);
  await refreshHomeAndRenderPath();
}

function renderCourseTabs() {
  courseTabs.innerHTML = "";
  state.courses.forEach((course) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "course-tab";
    if (course.id === state.selectedCourseId) {
      button.classList.add("active");
    }
    button.textContent = course.name;
    button.addEventListener("click", async () => {
      if (state.selectedCourseId === course.id) {
        return;
      }
      await changeCourse(course.id);
    });
    courseTabs.appendChild(button);
  });
}

function pointStateText(value) {
  if (value === "completed") {
    return "已完成";
  }
  if (value === "current") {
    return "当前可学";
  }
  return "未解锁";
}

function renderPathTimeline() {
  const course = getSelectedCourse();
  if (!course) {
    pathCourseTitle.textContent = "路径图";
    pathCourseMeta.textContent = "暂无课程";
    pathTimeline.innerHTML = "";
    resumeHint.textContent = "";
    return;
  }

  pathCourseTitle.textContent = `${course.name} 路径图`;
  pathCourseMeta.textContent = "每个路径点：3~5 分钟文本 + 8 题（答错重试）";
  pathTimeline.innerHTML = "";
  resumeHint.textContent = course.resumePointId
    ? `继续学习位置：${course.resumePointTitle || "当前路径点"}`
    : "当前课程暂无可学习路径点。";

  course.points.forEach((point) => {
    const node = document.createElement("article");
    node.className = `path-point state-${point.state}`;
    node.innerHTML = `
      <div class="point-main">
        <strong>${point.order}. ${point.title}</strong>
        <p class="muted">${point.readingMinutes} 分钟阅读 · 约 ${point.estimatedMinutes} 分钟学习</p>
      </div>
      <div class="point-side">
        <span class="point-status">${pointStateText(point.state)}</span>
      </div>
    `;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "small-btn primary-btn";
    button.textContent = point.state === "completed" ? "重学" : "学习";
    button.disabled = point.state === "locked";
    button.addEventListener("click", () => openPoint(point.id));
    node.querySelector(".point-side").appendChild(button);
    pathTimeline.appendChild(node);
  });
}

function renderPointContent() {
  if (!state.activePoint) {
    return;
  }
  const chapterLines = Array.isArray(state.activePoint.chapterText)
    ? state.activePoint.chapterText
    : Array.isArray(state.activePoint.textContent)
      ? state.activePoint.textContent
      : [];
  const readingMinutes =
    state.activePoint.readingMinutes ?? state.activePoint.textDurationMinutes ?? 4;
  pointTitle.textContent = state.activePoint.title;
  pointMeta.textContent = `路径点 ${state.activePoint.order} · 文本约 ${readingMinutes} 分钟`;
  pointCover.textContent = `蓝底文字占位图：${state.activePoint.title}`;
  pointConcept.innerHTML = chapterLines.map((line) => `<p>${line}</p>`).join("");
}

function buildOptions(question, selectedValue) {
  const group = document.createElement("div");
  group.className = "options-grid";
  question.options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-btn";
    button.textContent = option;
    if (selectedValue === option) {
      button.classList.add("active");
    }
    button.addEventListener("click", () => {
      state.responses[question.id] = option;
      renderQuestion();
    });
    group.appendChild(button);
  });
  return group;
}

function renderQuestion() {
  const question = state.activePoint.questions[state.currentQuestionIndex];
  quizProgress.textContent = `第 ${state.currentQuestionIndex + 1} / ${state.activePoint.questions.length} 题`;
  quizTypeTag.textContent = typeLabel(question.type);
  quizPrompt.textContent = question.prompt;
  quizBody.innerHTML = "";
  quizFeedback.textContent = "";
  quizFeedback.className = "message";
  nextQuestionBtn.classList.add("hidden");

  const response = state.responses[question.id];

  if (question.type === "multiple_choice") {
    quizBody.appendChild(buildOptions(question, response));
    return;
  }

  if (question.type === "fill_blank") {
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "请输入答案";
    input.value = response || "";
    input.addEventListener("input", () => {
      state.responses[question.id] = input.value;
    });
    quizBody.appendChild(input);
    return;
  }

  if (question.type === "flip_card") {
    const card = document.createElement("details");
    card.className = "flip-card";
    card.innerHTML = `<summary>${question.front}</summary><p>${question.back}</p>`;
    quizBody.appendChild(card);
    quizBody.appendChild(buildOptions(question, response));
    return;
  }

  if (question.type === "drag_match") {
    const container = document.createElement("div");
    container.className = "drag-grid";
    const currentMap = response && typeof response === "object" ? response : {};
    question.leftItems.forEach((leftItem) => {
      const row = document.createElement("div");
      row.className = "drag-row";
      const label = document.createElement("strong");
      label.textContent = leftItem;
      const select = document.createElement("select");
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "选择对应项";
      select.appendChild(empty);
      question.rightItems.forEach((rightItem) => {
        const option = document.createElement("option");
        option.value = rightItem;
        option.textContent = rightItem;
        option.selected = currentMap[leftItem] === rightItem;
        select.appendChild(option);
      });
      select.addEventListener("change", () => {
        state.responses[question.id] = {
          ...(state.responses[question.id] || {}),
          [leftItem]: select.value,
        };
      });
      row.append(label, select);
      container.appendChild(row);
    });
    quizBody.appendChild(container);
  }
}

async function refreshHomeAndRenderPath() {
  const data = await window.Api.progress();
  state.user = data.user;
  state.disclaimer = data.disclaimer;
  state.courses = data.courses;
  state.selectedCourseId = data.selectedCourseId || data.courses[0]?.id || null;
  updateHeader();
  renderCourseTabs();
  renderPathTimeline();
  showView("path");
}

async function openPoint(pointId) {
  const data = await window.Api.getPoint(pointId);
  state.activePoint = {
    ...data.pathPoint,
    chapterText: Array.isArray(data.pathPoint.chapterText)
      ? data.pathPoint.chapterText
      : data.pathPoint.textContent,
    readingMinutes: data.pathPoint.readingMinutes ?? data.pathPoint.textDurationMinutes ?? 4,
  };
  state.currentQuestionIndex = 0;
  state.responses = {};
  renderPointContent();
  showView("content");
}

async function submitCurrentAnswer() {
  const question = state.activePoint.questions[state.currentQuestionIndex];
  const response = state.responses[question.id];
  const result = await window.Api.submitQuestion(state.activePoint.id, question.id, response);
  if (!result.correct) {
    const answerText = formatCorrectAnswer(result);
    quizFeedback.textContent = answerText
      ? `答错了，请重试本题直到答对。正确答案：${answerText}`
      : "答错了，请重试本题直到答对。";
    quizFeedback.className = "message status-bad";
    return;
  }

  quizFeedback.textContent = "回答正确。";
  quizFeedback.className = "message status-ok";
  if (state.currentQuestionIndex < state.activePoint.questions.length - 1) {
    nextQuestionBtn.classList.remove("hidden");
    return;
  }

  const completed = await window.Api.completePoint(state.activePoint.id, state.responses);
  state.completionResult = completed;
  finishText.textContent = completed.finishedCourse
    ? "本课程路径已完成，太棒了！"
    : "本路径点已完成，已解锁下一路径点。";
  finishXp.textContent = `本次 +${completed.xpGain} XP，当前总 XP：${completed.totalXp}`;
  await refreshHomeAndRenderPath();
  showView("finish");
}

async function doAuth(mode) {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if (!username || !password) {
    showAuthMessage("请填写用户名和密码");
    return;
  }
  const action = mode === "register" ? window.Api.register : window.Api.login;
  try {
    await action(username, password);
    showAuthMessage(mode === "register" ? "注册成功，已自动登录" : "登录成功", false);
    await refreshHomeAndRenderPath();
  } catch (error) {
    showAuthMessage(error.message);
  }
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await doAuth("login");
});

registerBtn.addEventListener("click", async () => {
  await doAuth("register");
});

logoutBtn.addEventListener("click", async () => {
  await window.Api.logout();
  state.user = null;
  showView("auth");
});

changeCourseBtn.addEventListener("click", () => {
  showView("course");
});

backToPathBtn.addEventListener("click", async () => {
  await refreshHomeAndRenderPath();
});

startQuizBtn.addEventListener("click", () => {
  renderQuestion();
  showView("quiz");
});

submitAnswerBtn.addEventListener("click", async () => {
  submitAnswerBtn.disabled = true;
  try {
    await submitCurrentAnswer();
  } catch (error) {
    quizFeedback.textContent = error.message;
    quizFeedback.className = "message status-bad";
  } finally {
    submitAnswerBtn.disabled = false;
  }
});

nextQuestionBtn.addEventListener("click", () => {
  state.currentQuestionIndex += 1;
  renderQuestion();
});

continuePathBtn.addEventListener("click", async () => {
  const course = getSelectedCourse();
  if (!course?.resumePointId) {
    await refreshHomeAndRenderPath();
    return;
  }
  await openPoint(course.resumePointId);
});

backToPathFromFinishBtn.addEventListener("click", async () => {
  await refreshHomeAndRenderPath();
});

async function boot() {
  try {
    await window.Api.me();
    await refreshHomeAndRenderPath();
  } catch (_error) {
    showView("auth");
  }
}

boot();
