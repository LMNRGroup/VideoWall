const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:4000" : "");

async function parseJson(response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

export async function uploadVideo(file, onProgress) {
  const formData = new FormData();
  formData.append("media", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/api/upload`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && typeof onProgress === "function") {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = async () => {
      try {
        const text = xhr.responseText || "{}";
        const payload = JSON.parse(text);

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(payload);
          return;
        }

        reject(new Error(payload.error || "Request failed."));
      } catch (_error) {
        reject(new Error("Upload response could not be parsed."));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed."));
    xhr.send(formData);
  });
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

export async function getJobStatus(jobId) {
  const response = await fetch(`${API_URL}/api/jobs/${jobId}`);
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
