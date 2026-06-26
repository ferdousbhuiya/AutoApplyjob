export default function CoverLetterPreview({ coverLetter, onClose }) {
  if (!coverLetter) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Cover Letter</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            &times;
          </button>
        </div>
        <p className="whitespace-pre-wrap text-sm text-gray-800">{coverLetter}</p>
      </div>
    </div>
  );
}
