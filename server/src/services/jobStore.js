const jobs = new Map();
const uploads = new Map();

export function saveJob(jobId, payload) {
  jobs.set(jobId, payload);
}

export function getJob(jobId) {
  return jobs.get(jobId);
}

export function deleteJob(jobId) {
  const job = jobs.get(jobId);
  if (job?.timer) {
    clearTimeout(job.timer);
  }
  jobs.delete(jobId);
}

export function saveUpload(uploadId, payload) {
  uploads.set(uploadId, payload);
}

export function getUpload(uploadId) {
  return uploads.get(uploadId);
}

export function deleteUpload(uploadId) {
  const upload = uploads.get(uploadId);
  if (upload?.timer) {
    clearTimeout(upload.timer);
  }
  uploads.delete(uploadId);
}
