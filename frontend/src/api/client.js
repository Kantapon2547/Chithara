const BASE = "http://localhost:8000/api";

/* =========================
   TOKEN HELPERS
========================= */

function getAccessToken() {
  return localStorage.getItem("access");
}

function getRefreshToken() {
  return localStorage.getItem("refresh");
}

/* =========================
   AUTH HEADERS
========================= */

function getAuthHeaders() {
  const token = getAccessToken();

  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

// 🔐 LOGIN
export async function login(username, password) {
  const res = await fetch(`${BASE}/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || "Login failed");
  }

  return data;
}

/* =========================
   REFRESH TOKEN
========================= */

export async function refreshAccessToken() {
  const refresh = getRefreshToken();

  if (!refresh) throw new Error("No refresh token");

  const res = await fetch("http://localhost:8000/api/refresh/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error("Refresh failed");
  }

  localStorage.setItem("access", data.access);
  return data.access;
}

/* =========================
   AUTO FETCH WRAPPER
========================= */

export async function authFetch(url, options = {}) {
  let res = await fetch(url, {
    ...options,
    headers: getAuthHeaders(),
  });

  // 🔁 If token expired, try refresh
  if (res.status === 401) {
    await refreshAccessToken();

    res = await fetch(url, {
      ...options,
      headers: getAuthHeaders(),
    });
  }

  return res;
}

/* =========================
   SONGS
========================= */

export async function fetchSongs() {
  const res = await authFetch(`${BASE}/songs/`);

  if (!res.ok) throw new Error("Failed to fetch songs");

  return res.json();
}

/* =========================
   GENERATE SONG
========================= */

export async function generateSong(data) {
  const res = await authFetch(`${BASE}/generate/`, {
    method: "POST",
    body: JSON.stringify(data),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || "Generation failed");
  }

  return json;
}

/* =========================
   POLL STATUS
========================= */

export async function pollStatus(taskId) {
  const res = await authFetch(`${BASE}/status/${taskId}/`);

  if (!res.ok) throw new Error("Failed to poll status");

  return res.json();
}

/* =========================
   QUOTA
========================= */

export async function fetchQuota() {
  try {
    const res = await authFetch(`${BASE}/quota/`);

    if (!res.ok) return { used: 0, limit: 10, remaining: 10 };

    return res.json();
  } catch {
    return { used: 0, limit: 10, remaining: 10 };
  }
}

/* =========================
   LOGOUT
========================= */

export function logout() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
}