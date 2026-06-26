export default function CoverLetterPreview({ coverLetter, onClose }) {
  if (!coverLetter) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #312e81, #1e1b4b)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-none">Cover Letter</h2>
              <p className="text-indigo-300 text-xs mt-0.5">AI-generated for this role</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <p className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed">{coverLetter}</p>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 flex justify-end flex-shrink-0"
          style={{ background: 'rgba(0,0,0,0.2)' }}>
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition shadow-lg"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
