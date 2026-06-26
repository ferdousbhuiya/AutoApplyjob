export default function ResumePreview({ resumeText, onClose }) {
  if (!resumeText) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)', height: '88vh', maxHeight: '88vh' }}
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)', height: '88vh', maxHeight: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #312e81, #1e1b4b)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-none">Tailored Resume</h2>
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
          <pre className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed font-sans">{resumeText}</pre>
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
