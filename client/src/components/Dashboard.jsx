import { useEffect, useState, useCallback } from 'react';
import JobCard from './JobCard.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import ErrorMessage from './ErrorMessage.jsx';
import { getJobs, scanGmail, createMockJob, getGmailStatus, getGmailUrl } from '../api/client.js';

function StatCard({ label, count, color }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-4 flex flex-col gap-1">
      <span className={`text-2xl font-bold ${color}`}>{count}</span>
      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
    </div>
  );
}

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [filter, setFilter] = useState('pending');

  const showError = useCallback((message) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  }, []);

  const loadGmailStatus = useCallback(async () => {
    try {
      const { connected } = await getGmailStatus();
      setGmailConnected(connected);
    } catch (_) {}
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const [filtered, all] = await Promise.all([
        getJobs(filter),
        getJobs()
      ]);
      setJobs(filtered);
      setAllJobs(all);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter, showError]);

  useEffect(() => {
    loadGmailStatus();
    loadJobs();
  }, [loadGmailStatus, loadJobs]);

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

  async function handleConnectGmail() {
    try {
      const { url } = await getGmailUrl();
      window.open(url, '_blank');
    } catch (err) {
      showError(err.message);
    }
  }

  const pending = allJobs.filter(j => j.status === 'pending').length;
  const approved = allJobs.filter(j => j.status === 'approved').length;
  const skipped = allJobs.filter(j => j.status === 'skipped').length;

  const filterTabs = ['pending', 'approved', 'skipped', 'all'];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-gradient-to-r from-blue-700 to-blue-900 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow">
              <span className="text-blue-700 font-black text-sm">AA</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-none">AutoApply</h1>
              <p className="text-blue-200 text-xs">AI-Powered Job Application Builder</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Gmail status */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${gmailConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
              <span className="text-blue-100 text-xs hidden sm:block">
                {gmailConnected ? 'Gmail connected' : 'Gmail not connected'}
              </span>
            </div>
            <button
              onClick={handleConnectGmail}
              className="text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg px-3 py-1.5 transition"
            >
              {gmailConnected ? 'Switch Account' : 'Connect Gmail'}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <ErrorMessage message={error} onDismiss={() => setError(null)} />

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Pending Review" count={pending} color="text-blue-600" />
          <StatCard label="Approved" count={approved} color="text-green-600" />
          <StatCard label="Skipped" count={skipped} color="text-gray-400" />
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          {/* Filter tabs */}
          <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
            {filterTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab === 'all' ? undefined : tab)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition ${
                  (tab === 'all' && !filter) || filter === tab
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleMockJob}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 shadow-sm transition"
            >
              + Demo Job
            </button>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50 transition flex items-center gap-2"
            >
              {scanning ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Scanning...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Scan Gmail
                </>
              )}
            </button>
          </div>
        </div>

        {/* Job list */}
        {loading || scanning ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner label={scanning ? 'Scanning Gmail for job emails...' : 'Loading jobs...'} />
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center shadow-sm">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No jobs found</p>
            <p className="text-gray-400 text-sm mt-1">Click <strong>Scan Gmail</strong> to check your inbox, or add a <strong>Demo Job</strong> to try the AI features.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} onChange={loadJobs} onError={showError} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
