async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = null;
  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error || "请求失败";
    throw new Error(message);
  }

  return data;
}

window.Api = {
  getDisclaimer() {
    return request("/api/disclaimer");
  },
  login(username, password) {
    return request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },
  register(username, password) {
    return request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },
  me() {
    return request("/api/auth/me");
  },
  logout() {
    return request("/api/auth/logout", { method: "POST" });
  },
  skills() {
    return request("/api/skills");
  },
  lesson(lessonId) {
    return request(`/api/lessons/${lessonId}`);
  },
  submitLesson(lessonId, responses) {
    return request(`/api/lessons/${lessonId}/submit`, {
      method: "POST",
      body: JSON.stringify({ responses }),
    });
  },
  adminData() {
    return request("/api/admin/data");
  },
  createLesson(payload) {
    return request("/api/admin/lessons", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateLesson(lessonId, payload) {
    return request(`/api/admin/lessons/${lessonId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  deleteLesson(lessonId) {
    return request(`/api/admin/lessons/${lessonId}`, {
      method: "DELETE",
    });
  },
};
