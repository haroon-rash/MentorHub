import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  createCatalogItem,
  deleteCatalogItem,
  fetchAdminCatalogItems,
  updateCatalogItem,
} from '../../services/authApi.js';

const CATEGORIES = ['subject', 'language', 'grade_level', 'time_slot', 'day_of_week', 'interest', 'skill'];

const emptyItem = {
  value: '',
  label: '',
  sortOrder: 0,
  isActive: true,
  allowCustomEntry: true,
};

export default function PlatformCatalogAdmin() {
  const { token } = useAuth();
  const [category, setCategory] = useState('subject');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyItem);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchAdminCatalogItems(token, category);
      const list = Array.isArray(data)
        ? data
        : data?.items ?? data?.data ?? [];
      setItems(Array.isArray(list) ? list : []);
    } catch (error) {
      toast.error(error.message || 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token, category]);

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.value.trim()) {
      toast.error('Value is required');
      return;
    }

    try {
      const payload = {
        ...form,
        category,
        value: form.value.trim(),
        label: form.label.trim() || form.value.trim(),
      };
      if (editingId) {
        await updateCatalogItem({ token, id: editingId, payload });
        toast.success('Catalog item updated');
      } else {
        await createCatalogItem({ token, payload });
        toast.success('Catalog item created');
      }
      setForm(emptyItem);
      setEditingId(null);
      load();
    } catch (error) {
      toast.error(error.message || 'Save failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-3xl p-6">
        <h1 className="font-heading text-3xl font-bold text-slate-900">Platform Catalog</h1>
        <p className="mt-2 text-sm text-slate-600">Manage subjects, languages, grades, time slots, and skills dynamically.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`rounded-full px-4 py-2 text-xs font-bold uppercase ${
              category === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="glass-panel grid gap-4 rounded-3xl p-6 md:grid-cols-2">
        <input
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          placeholder="Value"
          value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })}
        />
        <input
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          placeholder="Label (optional)"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
        />
        <input
          type="number"
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          placeholder="Sort order"
          value={form.sortOrder}
          onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
        />
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={form.allowCustomEntry}
            onChange={(e) => setForm({ ...form, allowCustomEntry: e.target.checked })}
          />
          Allow custom entries
        </label>
        <button type="submit" className="md:col-span-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white">
          {editingId ? 'Update item' : 'Add item'}
        </button>
      </form>

      <div className="glass-panel rounded-3xl p-6">
        {loading ? <p className="text-slate-500">Loading...</p> : null}
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white/70 px-4 py-3">
              <div>
                <p className="font-semibold text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-500">{item.value} · order {item.sortOrder}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(item.id);
                    setForm({
                      value: item.value,
                      label: item.label,
                      sortOrder: item.sortOrder,
                      isActive: item.isActive,
                      allowCustomEntry: item.allowCustomEntry,
                    });
                  }}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await deleteCatalogItem({ token, id: item.id });
                      toast.success('Item disabled');
                      load();
                    } catch (error) {
                      toast.error(error.message);
                    }
                  }}
                  className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-600"
                >
                  Disable
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
