import { useState } from 'react';
import LoadingSpinner from './LoadingSpinner.jsx';
import ResumePreview from './ResumePreview.jsx';
import CoverLetterPreview from './CoverLetterPreview.jsx';
import { approveJob, skipJob, generateApplication, getJob } from '../api/client.js';

function fitBadgeClasses(score) {
  if (score == null) return 'bg-gray-100 text-gray-600';
  if (score >= 80) return 'bg-green-100 text-green-700';
  if (score >= 60) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
}

export default function JobCard({ job, onChange, onError }) {
  const [loadingAction, setLoadingAction] = useState(null);
  const [showResume, setShowResume] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [editedLetter, setEditedLetter] = useState('');

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
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-900">{job.job_title || 'Untitled Role'}</h3>
          <p className="text-sm text-gray-600">{job.company || 'Unknown Company'}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${fitBadgeClasses(job.fit_score)}`}>
          {job.fit_score != null ? `${job.fit_score}% fit` : 'Not scored'}
        </span>
      </div>

      {job.fit_reason && <p className="mt-2 text-sm text-gray-500">{job.fit_reason}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={handleViewResume}
          disabled={busy}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          View Resume
        </button>
        <button
          onClick={handleViewCoverLetter}
          disabled={busy}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          View Cover Letter
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handleApprove}
          disabled={busy}
          className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          Approve & Send
        </button>
        <button
          onClick={handleSkip}
          disabled={busy}
          className="rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          Skip
        </button>
        <button
          onClick={handleEdit}
          disabled={busy}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Edit
        </button>
        {busy && <LoadingSpinner label={loadingAction === 'approve' ? 'Sending...' : 'Working...'} />}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-3 text-lg font-semibold">Edit Cover Letter</h2>
            <textarea
              className="h-64 w-full rounded-md border border-gray-300 p-3 text-sm"
              value={editedLetter}
              onChange={(e) => setEditedLetter(e.target.value)}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setEditing(false)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Save
              </button>
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
