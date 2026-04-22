const state = {
  user: null,
  skills: [],
  disclaimer: "",
  currentLesson: null,
  questionIndex: 0,
  responses: {},
};

const views = {
  auth: document.querySelector("#authView"),
  dashboard: document.querySelector("#dashboardView"),
  lesson: document.querySelector("#lessonView"),
  quiz: document.querySelector("#quizView"),
  result: document.querySelector("#resultView"),
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
const skillTree = document.querySelector("#skillTree");

const backToDashboardBtn = document.querySelector("#backToDashboardBtn");
const lessonTitle = document.querySelector("#lessonTitle");
const lessonMeta = document.querySelector("#lessonMeta");
const coverPlaceholder = document.querySelector("#coverPlaceholder");
const conceptContent = document.querySelector("#conceptContent");
const startQuizBtn = document.querySelector("#startQuizBtn");

const quizProgress = document.querySelector("#quizProgress");
const quizTypeTag = document.querySelector("#quizTypeTag");
const quizPrompt = document.querySelector("#quizPrompt");
const quizBody = document.querySelector("#quizBody");
const prevQuestionBtn = document.querySelector("#prevQuestionBtn");
const nextQuestionBtn = document.querySelector("#nextQuestionBtn");
const submitQuizBtn = document.querySelector("#submitQuizBtn");

const resultScore = document.querySelector("#resultScore");
const resultXp = document.querySelector("#resultXp");
const resultBackBtn = document.querySelector("#resultBackBtn");

function showView(name) {
  Object.entries(views).forEach(([key, node]) => {
    node.classList.toggle("hidden", key !== name);
  });
  logoutBtn.classList.toggle("hidden", name === "auth");
}

function showAuthMessage(text, isError = true) {
  authMessage.textContent = text;
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

function renderDashboard() {
  welcomeTitle.textContent = `欢迎，${state.user.username}`;
  xpValue.textContent = String(state.user.xp);
  disclaimerText.textContent = state.disclaimer;
  skillTree.innerHTML = "";

  state.skills.forEach((skill) => {
    const skillCard = document.createElement("article");
    skillCard.className = "card skill-card";
    skillCard.style.borderLeftColor = skill.color;
    skillCard.innerHTML = `
      <h4>${skill.name}</h4>
      <p class="muted">${skill.description}</p>
      <div class="text-blue-placeholder">蓝底文字占位图：${skill.name}</div>
    `;

    skill.lessons.forEach((lesson) => {
      const lessonItem = document.createElement("div");
      lessonItem.className = "lesson-item";
      lessonItem.innerHTML = `
        <div class="lesson-meta">
          <span class="tag ${lesson.level}">${lesson.level === "beginner" ? "入门" : "进阶"}</span>
          <strong>${lesson.title}</strong>
          <small class="muted">${lesson.estimatedMinutes} 分钟 · ${lesson.completed ? `已完成 ${lesson.score}` : "未完成"}</small>
        </div>
      `;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "primary-btn small-btn";
      btn.textContent = "开始";
      btn.addEventListener("click", () => openLesson(lesson.id));
      lessonItem.appendChild(btn);
      skillCard.appendChild(lessonItem);
    });

    skillTree.appendChild(skillCard);
  });
}

function buildOptions(question, selectedValue) {
  const grid = document.createElement("div");
  grid.className = "options-grid";
  question.options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-btn";
    if (selectedValue === option) {
      button.classList.add("active");
    }
    button.textContent = option;
    button.addEventListener("click", () => {
      state.responses[question.id] = option;
      renderCurrentQuestion();
    });
    grid.appendChild(button);
  });
  return grid;
}

function renderCurrentQuestion() {
  const lesson = state.currentLesson;
  const question = lesson.questions[state.questionIndex];
  const total = lesson.questions.length;
  const response = state.responses[question.id];

  quizProgress.textContent = `第 ${state.questionIndex + 1} / ${total} 题`;
  quizTypeTag.textContent = typeLabel(question.type);
  quizPrompt.textContent = question.prompt;
  quizBody.innerHTML = "";

  if (question.type === "multiple_choice") {
    quizBody.appendChild(buildOptions(question, response));
  }

  if (question.type === "fill_blank") {
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "输入你的答案";
    input.value = response || "";
    input.addEventListener("input", () => {
      state.responses[question.id] = input.value;
    });
    quizBody.appendChild(input);
  }

  if (question.type === "flip_card") {
    const card = document.createElement("details");
    card.className = "flip-card";
    card.innerHTML = `
      <summary>${question.front}</summary>
      <p>${question.back}</p>
    `;
    quizBody.appendChild(card);
    quizBody.appendChild(buildOptions(question, response));
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
        if (currentMap[leftItem] === rightItem) {
          option.selected = true;
        }
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

  prevQuestionBtn.disabled = state.questionIndex === 0;
  const isLast = state.questionIndex === total - 1;
  nextQuestionBtn.classList.toggle("hidden", isLast);
  submitQuizBtn.classList.toggle("hidden", !isLast);
}

function renderLessonView() {
  const lesson = state.currentLesson;
  lessonTitle.textContent = lesson.title;
  lessonMeta.textContent = `${lesson.level === "beginner" ? "入门" : "进阶"} · ${lesson.estimatedMinutes} 分钟`;
  coverPlaceholder.textContent = `蓝底文字占位图：${lesson.title}`;
  conceptContent.innerHTML = lesson.concept.map((line) => `<p>${line}</p>`).join("");
}

async function loadSkills() {
  const data = await window.Api.skills();
  state.user = data.user;
  state.skills = data.skills;
  state.disclaimer = data.disclaimer;
}

async function openLesson(lessonId) {
  const data = await window.Api.lesson(lessonId);
  state.currentLesson = data.lesson;
  state.questionIndex = 0;
  state.responses = {};
  renderLessonView();
  showView("lesson");
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
    const data = await action(username, password);
    state.user = data.user;
    showAuthMessage(mode === "register" ? "注册成功，已自动登录" : "登录成功", false);
    await loadSkills();
    renderDashboard();
    showView("dashboard");
  } catch (error) {
    showAuthMessage(error.message);
  }
}

async function submitQuiz() {
  const data = await window.Api.submitLesson(state.currentLesson.id, state.responses);
  resultScore.textContent = `得分：${data.grade.correct}/${data.grade.total}`;
  resultXp.textContent = `获得 XP：+${data.xpGain}，当前总 XP：${data.totalXp}`;
  await loadSkills();
  renderDashboard();
  showView("result");
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

backToDashboardBtn.addEventListener("click", () => {
  showView("dashboard");
});

startQuizBtn.addEventListener("click", () => {
  state.questionIndex = 0;
  renderCurrentQuestion();
  showView("quiz");
});

prevQuestionBtn.addEventListener("click", () => {
  if (state.questionIndex > 0) {
    state.questionIndex -= 1;
    renderCurrentQuestion();
  }
});

nextQuestionBtn.addEventListener("click", () => {
  if (state.currentLesson && state.questionIndex < state.currentLesson.questions.length - 1) {
    state.questionIndex += 1;
    renderCurrentQuestion();
  }
});

submitQuizBtn.addEventListener("click", async () => {
  submitQuizBtn.disabled = true;
  try {
    await submitQuiz();
  } catch (error) {
    alert(error.message);
  } finally {
    submitQuizBtn.disabled = false;
  }
});

resultBackBtn.addEventListener("click", () => {
  showView("dashboard");
});

async function boot() {
  try {
    const data = await window.Api.me();
    state.user = data.user;
    await loadSkills();
    renderDashboard();
    showView("dashboard");
  } catch (_error) {
    showView("auth");
  }
}

boot();
