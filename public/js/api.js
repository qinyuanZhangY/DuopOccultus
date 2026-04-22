async function request(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data = null;
  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || "请求失败");
  }

  return data;
}

window.Api = {
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

  progress() {
    return request("/api/progress");
  },
  setCurrentCourse(courseId) {
    return request("/api/progress/course", {
      method: "PUT",
      body: JSON.stringify({ courseId }),
    });
  },
  getPoint(pointId) {
    return request(`/api/path-points/${pointId}`);
  },
  submitQuestion(pointId, questionId, response) {
    return request(`/api/path-points/${pointId}/questions/${questionId}/submit`, {
      method: "POST",
      body: JSON.stringify({ response }),
    });
  },
  completePoint(pointId, responses) {
    return request(`/api/path-points/${pointId}/complete`, {
      method: "POST",
      body: JSON.stringify({ responses }),
    });
  },

  adminData() {
    return request("/api/admin/data");
  },
  createPoint(payload) {
    return request("/api/admin/points", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updatePoint(pointId, payload) {
    return request(`/api/admin/points/${pointId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  deletePoint(pointId) {
    return request(`/api/admin/points/${pointId}`, {
      method: "DELETE",
    });
  },
};
