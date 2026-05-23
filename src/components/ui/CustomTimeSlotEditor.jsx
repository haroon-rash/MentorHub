import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

const TIME_PATTERN = /^(\d{1,2}):(\d{2})\s*(AM|PM)\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

function parseSlotMinutes(label) {
  const match = String(label).trim().match(TIME_PATTERN);
  if (!match) return null;
  const toMin = (h, m, ap) => {
    let hour = parseInt(h, 10) % 12;
    if (ap.toUpperCase() === 'PM') hour += 12;
    return hour * 60 + parseInt(m, 10);
  };
  return { start: toMin(match[1], match[2], match[3]), end: toMin(match[4], match[5], match[6]) };
}

function slotsOverlap(a, b) {
  const pa = parseSlotMinutes(a);
  const pb = parseSlotMinutes(b);
  if (!pa || !pb) return false;
  return pa.start < pb.end && pb.start < pa.end;
}

function formatCustomSlot(startTime, endTime) {
  const fmt = (t) => {
    const [h, m] = t.split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`;
  };
  return `${fmt(startTime)} - ${fmt(endTime)}`;
}

export default function CustomTimeSlotEditor({
  label = 'Available Time Slots',
  catalogSlots = [],
  selected = [],
  onChange,
  required = false,
}) {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [customLabel, setCustomLabel] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);

  const timeToMinutes = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (mins) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const generateSlots = () => {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    if (end <= start) {
      toast.error('End time must be after start time');
      return;
    }
    const generated = [];
    for (let cur = start; cur + durationMinutes <= end; cur += durationMinutes) {
      generated.push(formatCustomSlot(minutesToTime(cur), minutesToTime(cur + durationMinutes)));
    }
    if (generated.length === 0) {
      toast.error('No slots fit in this range with the selected duration');
      return;
    }
    const merged = [...selected];
    generated.forEach((slot) => {
      if (merged.some((s) => s.toLowerCase() === slot.toLowerCase())) return;
      if (merged.some((s) => slotsOverlap(s, slot))) return;
      merged.push(slot);
    });
    onChange(merged);
    toast.success(`Generated ${generated.length} slot(s)`);
  };

  const catalogSet = useMemo(() => new Set(catalogSlots), [catalogSlots]);

  const toggleCatalog = (slot) => {
    if (selected.includes(slot)) {
      onChange(selected.filter((s) => s !== slot));
    } else {
      onChange([...selected, slot]);
    }
  };

  const addCustomSlot = () => {
    const labelText = customLabel.trim() || formatCustomSlot(startTime, endTime);
    if (selected.some((s) => s.toLowerCase() === labelText.toLowerCase())) {
      toast.error('This slot is already added');
      return;
    }
    const conflict = selected.find((s) => slotsOverlap(s, labelText));
    if (conflict) {
      toast.error(`Overlaps with existing slot: ${conflict}`);
      return;
    }
    onChange([...selected, labelText]);
    setCustomLabel('');
    toast.success('Custom slot added');
  };

  const removeSlot = (slot) => onChange(selected.filter((s) => s !== slot));
  const customOnly = selected.filter((s) => !catalogSet.has(s));

  const pillBase =
    'rounded-xl border px-3 py-2.5 text-sm font-semibold transition min-h-[44px]';
  const pillActive =
    'border-indigo-500 bg-indigo-500/12 text-[var(--mh-text)] ring-1 ring-indigo-500/25';
  const pillInactive =
    'border-[var(--mh-border)] bg-[var(--mh-input-bg)] text-[var(--mh-text-muted)] hover:border-indigo-400/50';

  return (
    <div className="space-y-4">
      {label ? (
        <p className="mh-field-label mb-0">
          {label}
          {required ? <span className="ml-1 text-rose-500">*</span> : null}
        </p>
      ) : null}

      {catalogSlots.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {catalogSlots.map((slot) => {
            const active = selected.includes(slot);
            return (
              <button
                key={slot}
                type="button"
                onClick={() => toggleCatalog(slot)}
                className={`${pillBase} ${active ? pillActive : pillInactive}`}
              >
                {active ? '✓ ' : ''}{slot}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="mh-panel-muted space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--mh-accent)]">Add custom time slot</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mh-field-label">Start</span>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mh-field" />
          </label>
          <label className="block">
            <span className="mh-field-label">End</span>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mh-field" />
          </label>
          <label className="block">
            <span className="mh-field-label">Duration</span>
            <select value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} className="mh-field">
              {[15, 30, 45, 60, 90, 120].map((m) => (
                <option key={m} value={m}>{m} min</option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2 lg:col-span-4">
            <span className="mh-field-label">Label (optional)</span>
            <input
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="e.g. 08:00 AM - 09:00 AM"
              className="mh-field"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={addCustomSlot} className="mh-btn-primary px-5 py-2.5 text-sm">
            + Add one slot
          </button>
          <button
            type="button"
            onClick={generateSlots}
            className="rounded-xl border border-[var(--mh-border)] bg-[var(--mh-input-bg)] px-5 py-2.5 text-sm font-bold text-[var(--mh-text)] hover:border-indigo-400"
          >
            Auto-generate range
          </button>
        </div>
      </div>

      {selected.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--mh-text-muted)]">{selected.length} slot(s) selected</p>
          <div className="flex flex-wrap gap-2">
            {selected.map((slot) => (
              <span
                key={slot}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                  catalogSet.has(slot) ? 'mh-badge-indigo' : 'mh-badge-emerald'
                }`}
              >
                {slot}
                {!catalogSet.has(slot) ? <span className="text-[10px] font-semibold opacity-80">custom</span> : null}
                <button type="button" onClick={() => removeSlot(slot)} className="ml-0.5 opacity-80 hover:opacity-100" aria-label="Remove">
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {customOnly.length > 0 ? (
        <p className="text-xs text-[var(--mh-text-subtle)]">{customOnly.length} custom slot(s) saved with your profile.</p>
      ) : null}
    </div>
  );
}
