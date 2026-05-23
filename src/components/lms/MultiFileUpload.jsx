import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

const LMS_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.zip,.jpg,.jpeg,.png,.webp,.gif';

function countUrls(csv) {
  if (!csv) return 0;
  return csv.split(',').map((x) => x.trim()).filter(Boolean).length;
}

export default function MultiFileUpload({
  label,
  accept = LMS_ACCEPT,
  maxBytes = 25 * 1024 * 1024,
  maxFiles = 10,
  fileUrlsCsv = '',
  onChange,
  onUpload,
  helperText,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const urls = fileUrlsCsv
    ? fileUrlsCsv.split(',').map((x) => x.trim()).filter(Boolean)
    : [];

  const addUrl = (url) => {
    const next = [...urls, url].slice(0, maxFiles);
    onChange(next.join(', '));
  };

  const removeUrl = (index) => {
    const next = urls.filter((_, i) => i !== index);
    onChange(next.join(', '));
  };

  const processFiles = async (fileList) => {
    const files = Array.from(fileList || []).slice(0, maxFiles - urls.length);
    if (files.length === 0) return;

    setError('');
    setUploading(true);
    setProgress(5);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > maxBytes) {
          throw new Error(`${file.name} exceeds ${Math.round(maxBytes / (1024 * 1024))}MB limit`);
        }
        setProgress(Math.round(((i + 0.5) / files.length) * 100));
        const result = await onUpload(file);
        const url = typeof result === 'string' ? result : (result?.url || result?.Url);
        if (!url) throw new Error(`Upload failed for ${file.name}`);
        addUrl(url);
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  return (
    <div className="space-y-2">
      {label ? <p className="mh-field-label">{label}</p> : null}

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!uploading) processFiles(e.dataTransfer.files);
        }}
        className={`rounded-2xl border-2 border-dashed p-5 text-center transition ${
          dragOver ? 'border-indigo-400 bg-indigo-50/40' : 'border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] hover:border-indigo-300'
        } ${uploading ? 'pointer-events-none opacity-80' : 'cursor-pointer'}`}
      >
        <p className="text-2xl">📤</p>
        <p className="mt-2 text-sm font-semibold text-[var(--mh-text)]">
          {uploading ? 'Uploading…' : 'Drag & drop files or click to browse'}
        </p>
        <p className="mt-1 text-xs text-[var(--mh-text-muted)]">
          {helperText || `PDF, DOC, PPT, ZIP, images · up to ${maxFiles} files · ${Math.round(maxBytes / (1024 * 1024))}MB each`}
        </p>
        {progress > 0 && (
          <div className="mx-auto mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          processFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {error ? <p className="text-xs font-medium text-rose-500">{error}</p> : null}

      {urls.length > 0 && (
        <ul className="space-y-2">
          {urls.map((url, i) => {
            const name = decodeURIComponent(url.split('/').pop() || `File ${i + 1}`);
            return (
              <li key={url} className="flex items-center justify-between gap-2 rounded-xl border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] px-3 py-2 text-sm">
                <a href={url} target="_blank" rel="noreferrer" className="truncate font-medium text-indigo-400 hover:underline">
                  📎 {name}
                </a>
                <button
                  type="button"
                  onClick={() => removeUrl(i)}
                  className="shrink-0 rounded-lg bg-rose-500/10 px-2 py-1 text-xs font-bold text-rose-400 hover:bg-rose-500/20"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {urls.length > 0 && (
        <p className="text-xs text-[var(--mh-text-subtle)]">{countUrls(fileUrlsCsv)} file(s) attached</p>
      )}
    </div>
  );
}

export { LMS_ACCEPT };
