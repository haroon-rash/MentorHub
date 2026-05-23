import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchCmsPageBySlug } from '../../services/authApi.js';
import AnimatedSection from '../../components/ui/AnimatedSection.jsx';
import { resolvePublicAssetUrl } from '../../utils/urls.js';

export default function StaticPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPage = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCmsPageBySlug(slug);
        setPage(data);
      } catch (err) {
        setError(err.message || 'Page not found');
      } finally {
        setLoading(false);
      }
    };
    loadPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 text-3xl text-rose-500">
          ⚠️
        </div>
        <h1 className="font-heading text-3xl font-bold text-slate-900">Content Not Available</h1>
        <p className="mt-4 text-slate-600">
          The page you are looking for doesn't exist or is still being drafted.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
        >
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <AnimatedSection className="text-center" delay={0.05}>
        <h1 className="font-heading text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
          {page.title}
        </h1>
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
          <span>Last updated: {new Date(page.updatedAtUtc || page.createdAtUtc).toLocaleDateString()}</span>
        </div>
      </AnimatedSection>

      {page.imageUrl && (
        <AnimatedSection className="overflow-hidden rounded-[2.5rem] shadow-2xl" delay={0.1}>
          <img
            src={page.imageUrl.startsWith('http') ? page.imageUrl : resolvePublicAssetUrl(page.imageUrl)}
            alt={page.title}
            className="h-auto w-full object-cover"
          />
        </AnimatedSection>
      )}

      <AnimatedSection className="glass-panel rounded-[2.5rem] p-8 sm:p-12" delay={0.15}>
        <div 
          className="prose prose-slate max-w-none prose-headings:font-heading prose-headings:font-bold prose-a:text-indigo-600"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </AnimatedSection>

      <AnimatedSection className="text-center pb-10" delay={0.2}>
        <p className="text-sm text-slate-400">
          &copy; {new Date().getFullYear()} MentorHub Platform. All rights reserved.
        </p>
      </AnimatedSection>
    </div>
  );
}
