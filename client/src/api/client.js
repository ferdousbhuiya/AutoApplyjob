import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

function unwrapError(err) {
  const message = err.response?.data?.error || err.message || 'Something went wrong.';
  return new Error(message);
}

export async function getGmailStatus() {
  try {
    const res = await api.get('/auth/status');
    return res.data;
  } catch (err) {
    throw unwrapError(err);
  }
}

export async function getGmailUrl() {
  try {
    const res = await api.get('/auth/gmail-url');
    return res.data;
  } catch (err) {
    throw unwrapError(err);
  }
}

export async function getJobs(status) {
  try {
    const res = await api.get('/jobs', { params: status ? { status } : {} });
    return res.data;
  } catch (err) {
    throw unwrapError(err);
  }
}

export async function getJob(id) {
  try {
    const res = await api.get(`/jobs/${id}`);
    return res.data;
  } catch (err) {
    throw unwrapError(err);
  }
}

export async function scanGmail() {
  try {
    const res = await api.post('/jobs/scan');
    return res.data;
  } catch (err) {
    throw unwrapError(err);
  }
}

export async function createMockJob() {
  try {
    const res = await api.post('/jobs/mock');
    return res.data;
  } catch (err) {
    throw unwrapError(err);
  }
}

export async function approveJob(id) {
  try {
    const res = await api.put(`/jobs/${id}/approve`);
    return res.data;
  } catch (err) {
    throw unwrapError(err);
  }
}

export async function skipJob(id) {
  try {
    const res = await api.put(`/jobs/${id}/skip`);
    return res.data;
  } catch (err) {
    throw unwrapError(err);
  }
}

export async function deleteJob(id) {
  try {
    const res = await api.delete(`/jobs/${id}`);
    return res.data;
  } catch (err) {
    throw unwrapError(err);
  }
}

export async function generateApplication(jobId) {
  try {
    const res = await api.post('/ai/generate', { jobId });
    return res.data;
  } catch (err) {
    throw unwrapError(err);
  }
}

export default api;
