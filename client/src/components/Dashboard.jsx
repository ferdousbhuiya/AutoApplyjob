import { useEffect, useState, useCallback } from 'react';
import JobCard from './JobCard.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import ErrorMessage from './ErrorMessage.jsx';
import { getJobs, scanGmail, createMockJob } from '../api/client.js';

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  const showError = useCallback((message) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const data = await getJobs('pending');
      setJobs(data);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  async function handleScan() {
    setScanning(true);
    try {
      await scanGmail();
      await loadJobs();
    } catch (err) {
      showError(err.message);
    } finally {
      setScanning(false);
    }
  }

  async function handleMockJob() {
    try {
      await createMockJob();
      await loadJobs();
    } catch (err) {
      showError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">AutoApply Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={handleMockJob}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Add Demo Job
          </button>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {scanning ? 'Scanning...' : 'Scan Gmail'}
          </button>
        </div>
      </div>

      <ErrorMessage message={error} onDismiss={() => setError(null)} />

      <p className="my-4 text-sm text-gray-600">
        {jobs.length} job{jobs.length === 1 ? '' : 's'} waiting for review
      </p>

      {loading || scanning ? (
        <LoadingSpinner label={scanning ? 'Scanning Gmail...' : 'Loading jobs...'} />
      ) : jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-500">
          No new job emails found. Click Scan Gmail to check.
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onChange={loadJobs} onError={showError} />
          ))}
        </div>
      )}
    </div>
  );
}
