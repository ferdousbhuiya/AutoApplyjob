import { useState } from 'react';
import LoadingSpinner from './LoadingSpinner.jsx';
import ResumePreview from './ResumePreview.jsx';
import CoverLetterPreview from './CoverLetterPreview.jsx';
import { approveJob, skipJob, generateApplication, getJob } from '../api/client.js';

function fitColor(score) {
  if (score == null) return { bar: 'bg-gray-200', text: 'text-gray-500', badge: 'bg-gray-100 text-gray-500' };
  if (score >= 80) return { bar: 'bg-green-500', text: 'text-green-600', badge: 'bg-green-50 text-green-700 border-green-200' };
  if (score >= 60) return { bar: 'bg-yellow-400', text: 'text-yellow-600', badge: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
  return { bar: 'bg-red-400', text: 'text-red-600', badge: 'bg-red-50 text-red-700 border-red-200' };
}

function Avatar({ name }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
  const color = colors[initials.charCodeAt(0) % colors.length];
  return (
    <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
      <span className="text-white font-bold text-sm">{initials}</span>
    </div>
  );
}

export default function JobCard({ job, onChange, onError }) {
  const [loadingAction, setLoadingAction] = useState(null);
  const [showResume, setShowResume] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [editedLetter, setEditedLetter] = useState('');

  const colors = fitColor(job.fit_score);

  async function ensureDraft() {
    if (draft) return draft;
    setLoadingAction('loading-draft');
    try {
      const full = await getJob(job.id);
      if (full.draft) {
        setDraft(full.draft);
        return full.draft;
      }
      const generated = await generateApplication(job.id);
      const newDraft = {
        tailored_resume: generated.tailored_resume,
        cover_letter: generated.cover_letter
      };
      setDraft(newDraft);
      onChange?.();
      return newDraft;
    } catch (err) {
      onError?.(err.message);
      return null;
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleViewResume() {
    const d = await ensureDraft();
    if (d) setShowResume(true);
  }

  async function handleViewCoverLetter() {
    const d = await ensureDraft();
    if (d) setShowCoverLetter(true);
  }

  async function handleApprove() {
    setLoadingAction('approve');
    try {
      await ensureDraft();
      await approveJob(job.id);
      onChange?.();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleEdit() {
    const d = await ensureDraft();
    if (!d) return;
    setEditedLetter(d.cover_letter || '');
    setEditing(true);
  }

  function handleSaveEdit() {
    setDraft((prev) => ({ ...prev, cover_letter: editedLetter }));
    setEditing(false);
  }

  async function handleSkip() {
    setLoadingAction('skip');
    try {
      await skipJob(job.id);
      onChange?.();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoadingAction(null);
    }
  }

  const busy = Boolean(loadingAction);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Top accent bar based on fit score */}
      <div className={`h-1 w-full ${job.fit_score != null ? colors.bar : 'bg-gray-200'}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar name={job.company} />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-base leading-tight truncate">
              {job.job_title || 'Untitled Role'}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">{job.company || 'Unknown Company'}</p>
          </div>

          {/* Fit score badge */}
          <div className={`flex flex-col items-end gap-1 flex-shrink-0`}>
            {job.fit_score != null ? (
              <>
                <span className={`text-xs font-bold border rounded-full px-2.5 py-0.5 ${colors.badge}`}>
                  {job.fit_score}% fit
                </span>
                <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${colors.bar} transition-all`}
                    style={{ width: `${job.fit_score}%` }}
                  />
                </div>
              </>
            ) : (
              <span className="text-xs border rounded-full px-2.5 py-0.5 bg-gray-100 text-gray-400 border-gray-200">
                Not scored
              </span>
            )}
          </div>
        </div>

        {/* Fit reason */}
        {job.fit_reason && (
          <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-4 border border-gray-100">
            {job.fit_reason}
          </p>
        )}

        {/* Source + date */}
        <div className="flex items-center gap-3 mb-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {job.source || 'gmail'}
          </span>
          {job.detected_at && (
            <span>{new Date(job.detected_at).toLocaleDateString()}</span>
          )}
          <span className={`ml-auto capitalize font-medium px-2 py-0.5 rounded-full text-xs ${
            job.status === 'approved' ? 'bg-green-50 text-green-600' :
            job.status === 'skipped' ? 'bg-gray-100 text-gray-500' :
            'bg-blue-50 text-blue-600'
          }`}>
            {job.status}
          </span>
        </div>

        {/* Preview buttons */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={handleViewResume}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View Resume
          </button>
          <button
            onClick={handleViewCoverLetter}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Cover Letter
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleApprove}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 shadow-sm transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Approve & Send
          </button>
          <button
            onClick={handleEdit}
            disabled={busy}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button
            onClick={handleSkip}
            disabled={busy}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Skip
          </button>
          {busy && (
            <LoadingSpinner label={loadingAction === 'approve' ? 'Sending...' : 'Working...'} />
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-semibold">Edit Cover Letter</h2>
              <button onClick={() => setEditing(false)} className="text-white/70 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <textarea
                className="h-72 w-full rounded-lg border border-gray-200 p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                value={editedLetter}
                onChange={(e) => setEditedLetter(e.target.value)}
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResume && (
        <ResumePreview resumeText={draft?.tailored_resume} onClose={() => setShowResume(false)} />
      )}
      {showCoverLetter && (
        <CoverLetterPreview coverLetter={draft?.cover_letter} onClose={() => setShowCoverLetter(false)} />
      )}
    </div>
  );
}
