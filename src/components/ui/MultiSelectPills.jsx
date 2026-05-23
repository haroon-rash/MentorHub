import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((o) => (typeof o === 'string' ? o : o?.label || o?.value || String(o))).filter(Boolean);
}

/**
 * Multi-select pills with optional custom entries (e.g. subjects, languages).
 *
 * allowCustom + customOptionLabel="Other" → selecting "Other" opens a name field (value saved is the typed name).
 * allowCustom + addCustomLabel → always shows an add row for free-form entries.
 */
export default function MultiSelectPills({
  label,
  options = [],
  selected = [],
  onChange,
  columns = 3,
  required = false,
  allowCustom = false,
  customOptionLabel = 'Other',
  addCustomLabel = '+ Add custom',
  customPlaceholder = 'Type name and press Add',
}) {
  const [customDraft, setCustomDraft] = useState('');
  const catalogOptions = useMemo(() => normalizeOptions(options), [options]);
  const catalogSet = useMemo(() => new Set(catalogOptions), [catalogOptions]);

  const customSelected = useMemo(
    () => selected.filter((item) => !catalogSet.has(item)),
    [selected, catalogSet],
  );

  const hasOtherInCatalog = catalogOptions.includes(customOptionLabel);
  const otherModeActive = hasOtherInCatalog && selected.includes(customOptionLabel);

  const toggle = (option) => {
    if (option === customOptionLabel && allowCustom) {
      if (otherModeActive) {
        onChange(selected.filter((item) => item !== customOptionLabel));
        setCustomDraft('');
      } else {
        onChange([...selected, customOptionLabel]);
      }
      return;
    }
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const addCustomValue = () => {
    const value = customDraft.trim();
    if (!value) {
      return;
    }
    if (selected.includes(value)) {
      setCustomDraft('');
      return;
    }
    const next = [...selected.filter((item) => item !== customOptionLabel), value];
    onChange(next);
    setCustomDraft('');
  };

  const removeCustom = (value) => {
    onChange(selected.filter((item) => item !== value));
  };

  const showError = required && selected.filter((s) => s !== customOptionLabel).length === 0
    && customSelected.length === 0;

  const pillBase =
    'flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all';
  const pillActive =
    'border-indigo-500 bg-indigo-500/12 text-[var(--mh-text)] shadow-sm ring-1 ring-indigo-500/25';
  const pillInactive =
    'border-[var(--mh-border)] bg-[var(--mh-input-bg)] text-[var(--mh-text-muted)] hover:border-indigo-400/50 hover:bg-indigo-500/8';

  return (
    <motion.div className="space-y-3">
      {label ? (
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--mh-text-muted)]">
          {label}
          {required ? <span className="ml-1 text-rose-500">*</span> : null}
        </p>
      ) : null}

      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {catalogOptions.map((option) => {
          const isActive = option === customOptionLabel
            ? otherModeActive
            : selected.includes(option);
          return (
            <motion.button
              key={option}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => toggle(option)}
              className={`${pillBase} ${isActive ? pillActive : pillInactive}`}
            >
              {isActive ? (
                <svg className="h-4 w-4 shrink-0 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : null}
              <span className="truncate">{option}</span>
            </motion.button>
          );
        })}
      </div>

      {allowCustom && (otherModeActive || !hasOtherInCatalog) ? (
        <div className="rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] p-4 space-y-3">
          <p className="text-xs font-semibold text-[var(--mh-text-muted)]">
            {hasOtherInCatalog && otherModeActive
              ? `Enter custom ${label?.toLowerCase() || 'option'} name`
              : addCustomLabel}
          </p>
          <motion.div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={customDraft}
              onChange={(e) => setCustomDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomValue();
                }
              }}
              placeholder={customPlaceholder}
              className="mh-field flex-1"
            />
            <button type="button" onClick={addCustomValue} className="mh-btn-primary shrink-0 px-5 py-3 text-sm font-bold">
              Add
            </button>
          </motion.div>
        </div>
      ) : null}

      {customSelected.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--mh-text-muted)]">Custom entries</p>
          <div className="flex flex-wrap gap-2">
            {customSelected.map((item) => (
              <span key={item} className="mh-chip-custom inline-flex items-center gap-2">
                {item}
                <button type="button" onClick={() => removeCustom(item)} className="opacity-80 hover:opacity-100" aria-label="Remove">
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {showError ? (
        <p className="text-xs font-medium text-rose-500">Please select or add at least one option.</p>
      ) : null}

      {selected.filter((s) => s !== customOptionLabel).length > 0 ? (
        <p className="text-xs text-[var(--mh-text-subtle)]">
          {selected.filter((s) => s !== customOptionLabel).length} selected
        </p>
      ) : null}
    </motion.div>
  );
}
