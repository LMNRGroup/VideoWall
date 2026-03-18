const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function parseJson(response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

export async function uploadVideo(file) {
  const formData = new FormData();
  formData.append("video", file);

  const response = await fetch(`${API_URL}/upload`, {
    method: "POST",
    body: formData
  });

  return parseJson(response);
}

export async function processVideo(payload) {
  const response = await fetch(`${API_URL}/process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseJson(response);
}

export function getDownloadUrl(pathname) {
  if (!pathname) {
    return null;
  }

  if (/^https?:\/\//.test(pathname)) {
    return pathname;
  }

  return `${API_URL}${pathname}`;
}
