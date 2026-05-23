import React, { useMemo, useState } from 'react';

export default function TagSelect({
  label,
  options = [],
  value = [],
  onChange,
  allowCustom = true,
  required = false,
  placeholder = 'Search or add...',
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((opt) => opt.toLowerCase().includes(term));
  }, [options, search]);

  const toggle = (item) => {
    if (value.includes(item)) {
      onChange(value.filter((v) => v !== item));
    } else {
      onChange([...value, item]);
    }
  };

  const addCustom = () => {
    const custom = search.trim();
    if (!custom || value.includes(custom)) return;
    onChange([...value, custom]);
    setSearch('');
  };

  return (
    <div className="space-y-2">
      {label ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mh-text)]">
          {label}
          {required ? <span className="ml-1 text-rose-400">*</span> : null}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {value.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => toggle(item)}
            className="rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm ring-1 ring-indigo-400/50"
          >
            {item} ×
          </button>
        ))}
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && allowCustom) {
            e.preventDefault();
            addCustom();
          }
        }}
        placeholder={placeholder}
        className="mh-input w-full"
      />

      <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-xl border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] p-3">
        {filtered.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              value.includes(opt)
                ? 'bg-indigo-500/35 text-indigo-100 ring-2 ring-indigo-400/60'
                : 'border border-[var(--mh-border)] bg-[var(--mh-input-bg)] text-[var(--mh-text)] hover:border-indigo-400/50 hover:text-indigo-200'
            }`}
          >
            {opt}
          </button>
        ))}
        {allowCustom && search.trim() && !options.includes(search.trim()) && !value.includes(search.trim()) ? (
          <button
            type="button"
            onClick={addCustom}
            className="rounded-full bg-emerald-500/25 px-3 py-1.5 text-xs font-bold text-emerald-200 ring-1 ring-emerald-400/40"
          >
            + Add &quot;{search.trim()}&quot;
          </button>
        ) : null}
      </div>
    </div>
  );
}
