import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { validateFile } from '../../utils/validation.js';

const FILE_ICONS = {
  'image/': '🖼️',
  'application/pdf': '📄',
  default: '📎',
};

function getFileIcon(file) {
  if (!file?.type) return FILE_ICONS.default;
  const match = Object.keys(FILE_ICONS).find((key) => key !== 'default' && file.type.startsWith(key));
  return FILE_ICONS[match] || FILE_ICONS.default;
}

export default function FileUpload({
  label,
  accept = 'image/*,.pdf',
  maxBytes = 10 * 1024 * 1024,
  onUpload,
  currentUrl,
  onClear,
  helperText,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [previewName, setPreviewName] = useState('');
  const [lastFile, setLastFile] = useState(null);

  const processFile = async (file) => {
    const validationError = validateFile(file, {
      maxBytes,
      allowedTypes: accept.includes('pdf') ? ['image', 'pdf'] : ['image'],
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setPreviewName(file.name);
    setLastFile(file);
    setUploading(true);
    setProgress(15);

    try {
      const interval = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? prev : prev + 12));
      }, 120);

      const url = await onUpload(file);
      clearInterval(interval);
      setProgress(100);
      if (!url) {
        setError('Upload failed');
      }
    } catch (uploadError) {
      setError(uploadError.message || 'Upload failed');
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 600);
    }
  };

  const onDrop = async (event) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  return (
    <motion.div className="space-y-2">
      {label ? <p className="text-sm font-semibold text-slate-700">{label}</p> : null}

      <motion.div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-2xl border-2 border-dashed p-5 text-center transition ${
          dragOver ? 'border-indigo-400 bg-indigo-50/60' : 'border-slate-200 bg-slate-50/50 hover:border-indigo-300'
        }`}
      >
        <p className="text-2xl">{previewName ? getFileIcon({ type: previewName.endsWith('.pdf') ? 'application/pdf' : 'image/' }) : '📤'}</p>
        <p className="mt-2 text-sm font-semibold text-slate-700">
          {uploading ? 'Uploading...' : 'Drag & drop or click to browse'}
        </p>
        <p className="mt-1 text-xs text-slate-500">{helperText || `Max ${Math.round(maxBytes / (1024 * 1024))}MB`}</p>

        {uploading || progress > 0 ? (
          <div className="mx-auto mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-200">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}

        {currentUrl ? (
          <motion.div className="mt-3 flex items-center justify-center gap-2 text-xs">
            <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">Uploaded</span>
            {onClear ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClear(); setPreviewName(''); }}
                className="rounded-full bg-rose-100 px-3 py-1 font-semibold text-rose-600"
              >
                Remove
              </button>
            ) : null}
          </motion.div>
        ) : null}
      </motion.div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
          e.target.value = '';
        }}
      />

      {error ? (
        <motion.div layout className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-rose-600">{error}</p>
          {lastFile ? (
            <button
              type="button"
              onClick={() => processFile(lastFile)}
              disabled={uploading}
              className="shrink-0 rounded-lg bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200"
            >
              Retry
            </button>
          ) : null}
        </motion.div>
      ) : null}
    </motion.div>
  );
}
