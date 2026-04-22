const state = {
  user: null,
  skills: [],
  lessons: [],
  editingLessonId: null,
};

const screens = {
  login: document.querySelector('[data-screen="login"]'),
  dashboard: document.querySelector('[data-screen="dashboard"]'),
};

const adminLoginForm = document.querySelector("#admin-login-form");
const adminLoginError = document.querySelector("#admin-login-error");
const adminLogoutBtn = document.querySelector("#admin-logout-btn");
const adminLessonList = document.querySelector("#admin-lesson-list");

const lessonEditorForm = document.querySelector("#lesson-editor-form");
const editorTitle = document.querySelector("#editor-title");
const resetEditorBtn = document.querySelector("#reset-editor-btn");
const editorError = document.querySelector("#editor-error");
const editorSuccess = document.querySelector("#editor-success");

function showScreen(name) {
  Object.entries(screens).forEach(([key, node]) => {
    node.classList.toggle("active", key === name);
  });
}

function showLoginError(message) {
  adminLoginError.textContent = message;
}

function setEditorMessage({ error = "", success = "" }) {
  editorError.textContent = error;
  editorSuccess.textContent = success;
}

function getEditorFields() {
  const formData = new FormData(lessonEditorForm);
  return {
    lessonId: String(formData.get("lessonId") || "").trim(),
    skillId: String(formData.get("skillId") || "").trim(),
    level: String(formData.get("level") || "").trim(),
    title: String(formData.get("title") || "").trim(),
    estimatedMinutes: Number(formData.get("estimatedMinutes") || 6),
    conceptLines: String(formData.get("conceptLines") || ""),
    questionsJson: String(formData.get("questionsJson") || ""),
  };
}

function setEditorLesson(lesson = null) {
  const skillSelect = lessonEditorForm.querySelector('select[name="skillId"]');
  const levelSelect = lessonEditorForm.querySelector('select[name="level"]');
  const lessonIdInput = lessonEditorForm.querySelector('input[name="lessonId"]');
  const titleInput = lessonEditorForm.querySelector('input[name="title"]');
  const minutesInput = lessonEditorForm.querySelector('input[name="estimatedMinutes"]');
  const conceptInput = lessonEditorForm.querySelector('textarea[name="conceptLines"]');
  const questionsInput = lessonEditorForm.querySelector('textarea[name="questionsJson"]');

  state.editingLessonId = lesson ? lesson.id : null;
  lessonIdInput.value = lesson ? lesson.id : "";
  editorTitle.textContent = lesson ? "编辑课程" : "新增课程";
  titleInput.value = lesson ? lesson.title : "";
  minutesInput.value = String(lesson ? lesson.estimatedMinutes : 6);
  levelSelect.value = lesson ? lesson.level : "beginner";
  skillSelect.value = lesson ? lesson.skillId : state.skills[0]?.id || "";
  conceptInput.value = lesson ? lesson.concept.join("\n") : "";
  questionsInput.value = lesson
    ? JSON.stringify(lesson.questions, null, 2)
    : JSON.stringify(
        [
          {
            type: "multiple_choice",
            prompt: "示例题目",
            options: ["A", "B", "C", "D"],
            answer: "A",
          },
        ],
        null,
        2,
      );
  setEditorMessage({
    success: "可新增或编辑课程。注意：每章必须 8 道题。",
  });
}

function renderSkillOptions() {
  const skillSelect = lessonEditorForm.querySelector('select[name="skillId"]');
  skillSelect.innerHTML = state.skills
    .map((skill) => `<option value="${skill.id}">${skill.name}</option>`)
    .join("");
}

function renderLessonList() {
  adminLessonList.innerHTML = "";
  state.lessons.forEach((lesson) => {
    const skillName = state.skills.find((skill) => skill.id === lesson.skillId)?.name || lesson.skillId;
    const item = document.createElement("li");
    item.className = "list-item";
    item.innerHTML = `
      <div>
        <strong>${lesson.title}</strong>
        <p class="muted">${skillName} · ${lesson.level} · ${lesson.estimatedMinutes} 分钟 · ${lesson.questions.length} 题</p>
      </div>
      <div class="inline-actions">
        <button type="button" class="secondary-btn tiny edit-btn" data-id="${lesson.id}">编辑</button>
        <button type="button" class="secondary-btn tiny delete-btn" data-id="${lesson.id}">删除</button>
      </div>
    `;
    adminLessonList.appendChild(item);
  });
}

async function loadAdminData() {
  const data = await window.Api.adminData();
  state.skills = data.skills || [];
  state.lessons = data.lessons || [];
}

async function ensureAdminSession() {
  try {
    const me = await window.Api.me();
    if (me.user.role !== "admin") {
      showScreen("login");
      return;
    }
    state.user = me.user;
    await loadAdminData();
    renderSkillOptions();
    renderLessonList();
    setEditorLesson();
    showScreen("dashboard");
  } catch (_error) {
    showScreen("login");
  }
}

async function handleLogin(event) {
  event.preventDefault();
  showLoginError("");
  const formData = new FormData(adminLoginForm);
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "").trim();

  try {
    const data = await window.Api.login(username, password);
    if (data.user.role !== "admin") {
      showLoginError("当前账号不是管理员，请使用 admin 登录。");
      await window.Api.logout();
      return;
    }
    state.user = data.user;
    await loadAdminData();
    renderSkillOptions();
    renderLessonList();
    setEditorLesson();
    showScreen("dashboard");
  } catch (error) {
    showLoginError(error.message);
  }
}

async function handleSaveLesson(event) {
  event.preventDefault();
  setEditorMessage({});

  const fields = getEditorFields();
  let questions;
  try {
    questions = JSON.parse(fields.questionsJson);
  } catch (error) {
    setEditorMessage({ error: `题目 JSON 格式错误：${error.message}` });
    return;
  }

  const payload = {
    skillId: fields.skillId,
    level: fields.level,
    title: fields.title,
    estimatedMinutes: fields.estimatedMinutes,
    concept: fields.conceptLines
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    questions,
  };

  try {
    if (state.editingLessonId) {
      await window.Api.updateLesson(state.editingLessonId, payload);
      setEditorMessage({ success: "课程已更新" });
    } else {
      await window.Api.createLesson(payload);
      setEditorMessage({ success: "课程已新增" });
    }
    await loadAdminData();
    renderLessonList();
    setEditorLesson();
  } catch (error) {
    setEditorMessage({ error: error.message });
  }
}

async function handleDeleteLesson(lessonId) {
  try {
    await window.Api.deleteLesson(lessonId);
    setEditorMessage({ success: "课程已删除" });
    await loadAdminData();
    renderLessonList();
    setEditorLesson();
  } catch (error) {
    setEditorMessage({ error: error.message });
  }
}

adminLessonList.addEventListener("click", (event) => {
  const editBtn = event.target.closest(".edit-btn");
  if (editBtn) {
    const lesson = state.lessons.find((item) => item.id === editBtn.dataset.id);
    if (lesson) {
      setEditorLesson(lesson);
    }
    return;
  }

  const deleteBtn = event.target.closest(".delete-btn");
  if (deleteBtn) {
    handleDeleteLesson(deleteBtn.dataset.id);
  }
});

adminLoginForm.addEventListener("submit", handleLogin);
lessonEditorForm.addEventListener("submit", handleSaveLesson);
resetEditorBtn.addEventListener("click", () => setEditorLesson());
adminLogoutBtn.addEventListener("click", async () => {
  await window.Api.logout();
  showScreen("login");
});

ensureAdminSession();
