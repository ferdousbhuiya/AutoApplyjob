import { useEffect, useState, useCallback } from 'react';
import JobCard from './JobCard.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import ErrorMessage from './ErrorMessage.jsx';
import { getJobs, scanGmail, createMockJob, getGmailStatus, getGmailUrl } from '../api/client.js';

function StatCard({ label, count, icon, gradient, textColor }) {
  return (
    <div className={`rounded-2xl p-5 text-white shadow-lg ${gradient} relative overflow-hidden`}>
      <div className="absolute right-4 top-4 opacity-20 text-5xl">{icon}</div>
      <div className="relative">
        <p className="text-3xl font-black">{count}</p>
        <p className="text-sm font-medium opacity-80 mt-1">{label}</p>
      </div>
    </div>
  );
}

const TABS = ['pending', 'approved', 'skipped', 'all'];

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState(null);
  const [filter, setFilter] = useState('pending');

  const showError = useCallback((message) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  }, []);

  const loadGmailStatus = useCallback(async () => {
    try {
      const data = await getGmailStatus();
      setGmailConnected(data.connected);
      setGmailEmail(data.email || null);
    } catch (_) {}
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const [filtered, all] = await Promise.all([
        getJobs(filter === 'all' ? undefined : filter),
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

  return (
    <div className="min-h-screen" style={{ background: '#0f172a' }}>
      {/* Top Navbar */}
      <header style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e40af 100%)' }}
        className="shadow-2xl border-b border-indigo-900/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <span className="text-white font-black text-base tracking-tight">AA</span>
            </div>
            <div>
              <h1 className="text-white font-black text-xl tracking-tight leading-none">AutoApply</h1>
              <p className="text-indigo-300 text-xs mt-0.5">AI-Powered Job Application Builder</p>
            </div>
          </div>

          {/* Gmail connection pill */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-2 backdrop-blur-sm">
              <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${gmailConnected ? 'bg-emerald-400 shadow-emerald-400/50' : 'bg-red-400 shadow-red-400/50'}`}
                style={{ boxShadow: gmailConnected ? '0 0 6px #34d399' : '0 0 6px #f87171' }} />
              <div className="hidden sm:block">
                {gmailConnected && gmailEmail ? (
                  <div>
                    <p className="text-white text-xs font-semibold leading-none">{gmailEmail}</p>
                    <p className="text-indigo-300 text-xs mt-0.5">Gmail connected</p>
                  </div>
                ) : (
                  <p className="text-white/70 text-sm">{gmailConnected ? 'Gmail connected' : 'No Gmail connected'}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleConnectGmail}
              className="text-sm font-semibold text-white rounded-xl px-4 py-2 transition shadow-lg border border-indigo-400/30"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            >
              {gmailConnected ? '⇄ Switch Account' : '+ Connect Gmail'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <ErrorMessage message={error} onDismiss={() => setError(null)} />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Pending Review"
            count={pending}
            icon="📋"
            gradient="bg-gradient-to-br from-indigo-500 to-blue-600"
          />
          <StatCard
            label="Approved & Sent"
            count={approved}
            icon="✅"
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          />
          <StatCard
            label="Skipped"
            count={skipped}
            icon="⏭️"
            gradient="bg-gradient-to-br from-slate-500 to-slate-700"
          />
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          {/* Filter tabs */}
          <div className="flex gap-1 p-1 rounded-xl border border-white/10"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                  filter === tab
                    ? 'text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
                style={filter === tab ? { background: 'linear-gradient(135deg, #6366f1, #4f46e5)' } : {}}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleMockJob}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:border-white/40 transition backdrop-blur-sm"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              + Demo Job
            </button>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="rounded-xl px-5 py-2 text-sm font-bold text-white shadow-lg disabled:opacity-50 transition flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 4px 15px rgba(99,102,241,0.4)' }}
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
          <div className="flex justify-center py-20">
            <LoadingSpinner label={scanning ? 'Scanning Gmail for job emails...' : 'Loading jobs...'} />
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-white/10 p-16 text-center"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-white font-semibold text-lg">No jobs found</p>
            <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
              Click <span className="text-indigo-400 font-semibold">Scan Gmail</span> to check your inbox, or add a <span className="text-indigo-400 font-semibold">Demo Job</span> to try the AI features.
            </p>
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
