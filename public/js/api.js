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

  learnHome() {
    return request("/api/progress");
  },
  resumeCourse(courseId) {
    return request("/api/progress/course", {
      method: "PUT",
      body: JSON.stringify({ courseId }),
    });
  },
  learnPoint(_courseId, pointId) {
    return request(`/api/path-points/${pointId}`);
  },
  answerQuestion(pointId, questionId, response) {
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
  createNode(payload) {
    return request("/api/admin/points", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateNode(nodeId, payload) {
    return request(`/api/admin/points/${nodeId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  deleteNode(nodeId) {
    return request(`/api/admin/points/${nodeId}`, {
      method: "DELETE",
    });
  },
};
