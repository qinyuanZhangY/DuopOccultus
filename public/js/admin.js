const state = {
  user: null,
  courses: [],
  pathPoints: [],
  editingPointId: null,
  imageDataUrl: "",
};

const screens = {
  login: document.querySelector('[data-screen="login"]'),
  dashboard: document.querySelector('[data-screen="dashboard"]'),
};

const adminLoginForm = document.querySelector("#admin-login-form");
const adminLoginError = document.querySelector("#admin-login-error");
const adminLogoutBtn = document.querySelector("#admin-logout-btn");
const adminCourseList = document.querySelector("#admin-course-list");

const pathEditorForm = document.querySelector("#path-editor-form");
const editorTitle = document.querySelector("#editor-title");
const resetEditorBtn = document.querySelector("#reset-editor-btn");
const editorError = document.querySelector("#editor-error");
const editorSuccess = document.querySelector("#editor-success");
const imageInput = document.querySelector("#pointImageInput");
const imagePreview = document.querySelector("#pointImagePreview");

function showScreen(name) {
  Object.entries(screens).forEach(([key, element]) => {
    element.classList.toggle("active", key === name);
  });
}

function showLoginError(text) {
  adminLoginError.textContent = text;
}

function setEditorMessage({ error = "", success = "" }) {
  editorError.textContent = error;
  editorSuccess.textContent = success;
}

function defaultQuestionTemplate() {
  return JSON.stringify(
    [
      {
        type: "multiple_choice",
        prompt: "示例题目",
        options: ["A", "B", "C", "D"],
        answer: "A",
      },
      {
        type: "fill_blank",
        prompt: "示例填空___",
        answer: "答案",
      },
      {
        type: "drag_match",
        prompt: "示例配对",
        leftItems: ["左1", "左2"],
        rightItems: ["右1", "右2"],
        correctMap: {
          左1: "右1",
          左2: "右2",
        },
      },
      {
        type: "flip_card",
        front: "卡片正面",
        back: "卡片背面",
        prompt: "翻卡后回答",
        options: ["选项1", "选项2"],
        answer: "选项1",
      },
      {
        type: "multiple_choice",
        prompt: "示例题 5",
        options: ["A", "B"],
        answer: "A",
      },
      {
        type: "multiple_choice",
        prompt: "示例题 6",
        options: ["A", "B"],
        answer: "B",
      },
      {
        type: "fill_blank",
        prompt: "示例题 7 ___",
        answer: "好",
      },
      {
        type: "multiple_choice",
        prompt: "示例题 8",
        options: ["A", "B"],
        answer: "A",
      },
    ],
    null,
    2,
  );
}

function renderCourseOptions() {
  const select = pathEditorForm.querySelector('select[name="courseId"]');
  select.innerHTML = state.courses
    .map((course) => `<option value="${course.id}">${course.name}</option>`)
    .join("");
}

function updateImagePreview() {
  if (!state.imageDataUrl) {
    imagePreview.classList.add("hidden");
    imagePreview.src = "";
    return;
  }
  imagePreview.classList.remove("hidden");
  imagePreview.src = state.imageDataUrl;
}

function setEditorPoint(point = null, prefill = {}) {
  const pointIdInput = pathEditorForm.querySelector('input[name="pathId"]');
  const courseSelect = pathEditorForm.querySelector('select[name="courseId"]');
  const orderInput = pathEditorForm.querySelector('input[name="order"]');
  const titleInput = pathEditorForm.querySelector('input[name="title"]');
  const readingInput = pathEditorForm.querySelector('textarea[name="readingLines"]');
  const questionsInput = pathEditorForm.querySelector('textarea[name="questionsJson"]');

  state.editingPointId = point ? point.id : null;
  pointIdInput.value = point ? point.id : "";
  editorTitle.textContent = point ? "编辑路径点" : "新增路径点";
  courseSelect.value = point ? point.courseId : prefill.courseId || state.courses[0]?.id || "";
  orderInput.value = String(point ? point.order : prefill.order || 1);
  titleInput.value = point ? point.title : "";
  readingInput.value = point ? point.learningText.join("\n") : "";
  questionsInput.value = point
    ? JSON.stringify(point.questions, null, 2)
    : defaultQuestionTemplate();
  state.imageDataUrl = point?.imageDataUrl || "";
  imageInput.value = "";
  updateImagePreview();

  setEditorMessage({
    success: "节点需满足：阅读文本 3~5 分钟 + 8 道题；可选上传 1 张图片。",
  });
}

function renderCourseList() {
  adminCourseList.innerHTML = "";
  state.courses.forEach((course) => {
    const wrapper = document.createElement("li");
    wrapper.className = "list-group";
    const points = state.pathPoints
      .filter((point) => point.courseId === course.id)
      .sort((a, b) => a.order - b.order);

    const pointHtml =
      points.length === 0
        ? `<p class="muted tiny">暂无路径点</p>`
        : points
            .map(
              (point) => `
                <div class="list-item">
                  <div>
                    <strong>${point.order}. ${point.title}</strong>
                    <p class="muted tiny">阅读 ${point.readingMinutes} 分钟 · 总时长 ${point.estimatedMinutes} 分钟</p>
                  </div>
                  <div class="inline-actions">
                    <button type="button" class="secondary-btn tiny edit-btn" data-id="${point.id}">编辑</button>
                    <button type="button" class="secondary-btn tiny delete-btn" data-id="${point.id}">删除</button>
                  </div>
                </div>
              `,
            )
            .join("");

    const nextOrder = points.length > 0 ? Math.max(...points.map((item) => item.order)) + 1 : 1;
    wrapper.innerHTML = `
      <div class="course-list-header">
        <span>${course.name}</span>
        <button type="button" class="secondary-btn tiny add-node-btn" data-course-id="${course.id}" data-next-order="${nextOrder}">增加</button>
      </div>
      <div class="course-list-body">${pointHtml}</div>
    `;
    adminCourseList.appendChild(wrapper);
  });
}

async function loadAdminData() {
  const data = await window.Api.adminData();
  state.courses = data.courses || [];
  state.pathPoints = data.pathPoints || [];
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
    renderCourseOptions();
    renderCourseList();
    setEditorPoint();
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
    renderCourseOptions();
    renderCourseList();
    setEditorPoint();
    showScreen("dashboard");
  } catch (error) {
    showLoginError(error.message);
  }
}

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

async function handleSavePoint(event) {
  event.preventDefault();
  setEditorMessage({});
  const formData = new FormData(pathEditorForm);
  const courseId = String(formData.get("courseId") || "").trim();
  const order = Number(formData.get("order") || 1);
  const title = String(formData.get("title") || "").trim();
  const readingLines = String(formData.get("readingLines") || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const questionsJson = String(formData.get("questionsJson") || "");

  let questions;
  try {
    questions = JSON.parse(questionsJson);
  } catch (error) {
    setEditorMessage({ error: `题目 JSON 格式错误：${error.message}` });
    return;
  }

  const payload = {
    courseId,
    order,
    title,
    readingMinutes: 4,
    estimatedMinutes: 8,
    readingLines,
    imageDataUrl: state.imageDataUrl || null,
    questions,
  };

  try {
    if (state.editingPointId) {
      await window.Api.updatePoint(state.editingPointId, payload);
      setEditorMessage({ success: "路径点已更新" });
    } else {
      await window.Api.createPoint(payload);
      setEditorMessage({ success: "路径点已新增" });
    }
    await loadAdminData();
    renderCourseList();
    setEditorPoint();
  } catch (error) {
    setEditorMessage({ error: error.message });
  }
}

async function handleDeletePoint(id) {
  try {
    await window.Api.deletePoint(id);
    setEditorMessage({ success: "路径点已删除" });
    await loadAdminData();
    renderCourseList();
    setEditorPoint();
  } catch (error) {
    setEditorMessage({ error: error.message });
  }
}

imageInput.addEventListener("change", async () => {
  const [file] = imageInput.files || [];
  if (!file) {
    state.imageDataUrl = "";
    updateImagePreview();
    return;
  }
  if (!file.type.startsWith("image/")) {
    setEditorMessage({ error: "请上传图片文件" });
    imageInput.value = "";
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    setEditorMessage({ error: "图片大小不能超过 2MB" });
    imageInput.value = "";
    return;
  }
  try {
    state.imageDataUrl = await readImageAsDataUrl(file);
    updateImagePreview();
    setEditorMessage({ success: "图片已加载，保存后生效。" });
  } catch (error) {
    setEditorMessage({ error: error.message });
  }
});

adminCourseList.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) {
    return;
  }

  const addBtn = target.closest(".add-node-btn");
  if (addBtn) {
    const courseId = addBtn.dataset.courseId || state.courses[0]?.id || "";
    const order = Number(addBtn.dataset.nextOrder || 1);
    setEditorPoint(null, { courseId, order });
    editorTitle.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const editBtn = target.closest(".edit-btn");
  if (editBtn) {
    const point = state.pathPoints.find((item) => item.id === editBtn.dataset.id);
    if (point) {
      setEditorPoint(point);
    }
    return;
  }
  const deleteBtn = target.closest(".delete-btn");
  if (deleteBtn) {
    handleDeletePoint(deleteBtn.dataset.id);
  }
});

adminLoginForm.addEventListener("submit", handleLogin);
pathEditorForm.addEventListener("submit", handleSavePoint);
resetEditorBtn.addEventListener("click", () => setEditorPoint());
adminLogoutBtn.addEventListener("click", async () => {
  await window.Api.logout();
  showScreen("login");
});

ensureAdminSession();
