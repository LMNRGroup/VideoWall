const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:4000" : "");

async function parseJson(response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

export async function uploadVideo(file) {
  const formData = new FormData();
  formData.append("media", file);

  const response = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    body: formData
  });

  return parseJson(response);
}

export async function processVideo(payload) {
  const response = await fetch(`${API_URL}/api/process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseJson(response);
}

export async function deleteUpload(uploadId) {
  if (!uploadId) {
    return;
  }

  const response = await fetch(`${API_URL}/api/upload/${uploadId}`, {
    method: "DELETE"
  });

  if (!response.ok && response.status !== 204) {
    await parseJson(response);
  }
}

export function getDownloadUrl(pathname) {
  if (!pathname) {
    return null;
  }

  if (/^https?:\/\//.test(pathname)) {
    return pathname;
  }

  return `${API_URL}${pathname.startsWith("/api/") ? pathname : `/api${pathname}`}`;
}
