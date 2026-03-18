const jobs = new Map();

export function saveJob(jobId, payload) {
  jobs.set(jobId, payload);
}

export function getJob(jobId) {
  return jobs.get(jobId);
}

export function deleteJob(jobId) {
  jobs.delete(jobId);
}
