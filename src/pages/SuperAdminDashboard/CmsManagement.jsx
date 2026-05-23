import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { fetchCmsPages, fetchCmsPageBySlug, createCmsPage, updateCmsPage, deleteCmsPage, uploadDocument, extractUploadUrl } from '../../services/authApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

const INITIAL_PAGE = {
  slug: '',
  title: '',
  content: '',
  imageUrl: ''
};

const ESSENTIAL_SLUGS = [
  'privacy-policy',
  'about-us',
  'contact-us',
  'terms-conditions',
  'disclaimer',
  'blogs'
];

export default function CmsManagement() {
  const { token } = useAuth();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadPages = async () => {
    try {
      const data = await fetchCmsPages();
      setPages(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load CMS pages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

  const handleEdit = async (slug) => {
    try {
      const data = await fetchCmsPageBySlug(slug);
      setEditingPage(data);
      setIsModalOpen(true);
    } catch {
      toast.error('Failed to load page details');
    }
  };

  const handleCreateNew = () => {
    setEditingPage(INITIAL_PAGE);
    setIsModalOpen(true);
  };

  const handleDelete = async (slug) => {
    if (!window.confirm(`Are you sure you want to delete "${slug}"?`)) return;
    try {
      await deleteCmsPage({ token, slug });
      toast.success('Page deleted');
      loadPages();
    } catch (err) {
      toast.error(err.message || 'Failed to delete page');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isUpdate = !!editingPage.id;
      const payload = {
        slug: editingPage.slug,
        title: editingPage.title,
        content: editingPage.content,
        imageUrl: editingPage.imageUrl
      };

      if (isUpdate) {
        await updateCmsPage({ token, slug: editingPage.slug, payload });
        toast.success('Page updated');
      } else {
        await createCmsPage({ token, payload });
        toast.success('Page created');
      }
      setIsModalOpen(false);
      loadPages();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    try {
      toast.loading('Uploading image...');
      const url = extractUploadUrl(await uploadDocument(file, token));
      setEditingPage((prev) => ({ ...prev, imageUrl: url }));
      toast.dismiss();
      toast.success('Image uploaded');
    } catch {
      toast.dismiss();
      toast.error('Upload failed');
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading CMS...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold text-slate-900">CMS Management</h2>
        <button
          onClick={handleCreateNew}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
        >
          + Add New Page
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ESSENTIAL_SLUGS.map(slug => {
          const exists = pages.find(p => p.slug === slug);
          return (
            <div 
              key={slug} 
              className={`glass-panel rounded-3xl border p-5 transition-all ${exists ? 'border-emerald-100 bg-emerald-50/30' : 'border-rose-100 bg-rose-50/30'}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${exists ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {exists ? 'Active' : 'Missing'}
                  </span>
                  <h3 className="mt-1 font-bold text-slate-900 capitalize">{slug.replace(/-/g, ' ')}</h3>
                  <p className="text-xs text-slate-500">slug: {slug}</p>
                </div>
                {exists ? (
                  <button 
                    onClick={() => handleEdit(slug)}
                    className="rounded-lg bg-white p-2 shadow-sm hover:bg-indigo-50 text-indigo-600"
                  >
                    ✏️
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      setEditingPage({ ...INITIAL_PAGE, slug, title: slug.replace(/-/g, ' ').toUpperCase() });
                      setIsModalOpen(true);
                    }}
                    className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white shadow-sm"
                  >
                    Create
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-6 py-4">Title / Slug</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pages.filter(p => !ESSENTIAL_SLUGS.includes(p.slug)).map((p) => (
              <tr key={p.slug} className="hover:bg-slate-50/50">
                <td className="px-6 py-4">
                  <p className="font-bold text-slate-900">{p.title}</p>
                  <p className="text-xs text-slate-400">{p.slug}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => handleEdit(p.slug)} className="rounded-lg bg-slate-100 p-2 text-indigo-600 hover:bg-indigo-100">✏️</button>
                    <button onClick={() => handleDelete(p.slug)} className="rounded-lg bg-slate-100 p-2 text-rose-500 hover:bg-rose-100">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
            {pages.filter(p => !ESSENTIAL_SLUGS.includes(p.slug)).length === 0 && (
              <tr>
                <td colSpan={2} className="px-6 py-10 text-center text-slate-400 italic">No custom pages added yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem] bg-white p-8 shadow-2xl"
            >
              <h3 className="font-heading text-2xl font-bold text-slate-900 mb-6">
                {editingPage.id ? 'Edit Page' : 'Create Page'}
              </h3>
              
              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Page Slug</label>
                    <input 
                      disabled={!!editingPage.id}
                      placeholder="e.g. privacy-policy" 
                      value={editingPage.slug} 
                      onChange={e => setEditingPage(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                      required
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Page Title</label>
                    <input 
                      placeholder="e.g. Privacy Policy" 
                      value={editingPage.title} 
                      onChange={e => setEditingPage(p => ({ ...p, title: e.target.value }))}
                      required
                      className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Header Image (URL or Upload)</label>
                  <div className="mt-1 flex gap-3">
                    <input 
                      placeholder="https://example.com/image.jpg" 
                      value={editingPage.imageUrl || ''} 
                      onChange={e => setEditingPage(p => ({ ...p, imageUrl: e.target.value }))}
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <label className="flex cursor-pointer items-center justify-center rounded-xl bg-slate-100 px-4 hover:bg-slate-200">
                      <span className="text-xs font-bold">Upload</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e.target.files[0])} />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Content (HTML Supported)</label>
                  <textarea 
                    placeholder="<p>Write your content here...</p>" 
                    rows={12}
                    value={editingPage.content} 
                    onChange={e => setEditingPage(p => ({ ...p, content: e.target.value }))}
                    required
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="mt-2 text-[10px] text-slate-400">Tip: You can use HTML tags like &lt;p&gt;, &lt;h2&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, etc. for formatting.</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Page'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
