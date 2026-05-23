import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import AnimatedSection from '../../components/ui/AnimatedSection.jsx';

const MotionDiv = motion.div;

function TutorServices() {
  const [sessionNotes, setSessionNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState(null);

  const handleGenerate = () => {
    if (!sessionNotes.trim()) {
      toast.error('Please paste your rough session notes first.');
      return;
    }
    
    setIsGenerating(true);
    // Simulate AI generation delay
    setTimeout(() => {
      setSummary({
        topics: 'Advanced Calculus, Integration by Parts',
        misconceptions: 'Student struggled with picking the correct u and dv. Kept choosing dv as ln(x) which complicated the integral.',
        homework: 'Complete practice sheet 4 (Focus on #5-10)',
        nextSession: 'Trigonometric Substitution',
        emailDraft: `Hi Student,\n\nGreat job today! We covered Integration by Parts. Remember the LIATE rule we discussed to help you pick 'u'. Your homework is Practice Sheet 4.\n\nSee you next week!`,
      });
      setIsGenerating(false);
      toast.success('AI Session Summary generated successfully!');
    }, 1800);
  };

  return (
    <div className="space-y-6">
      <AnimatedSection className="glass-panel rounded-3xl p-6 sm:p-8" delay={0.1}>
        <h1 className="font-heading text-3xl font-extrabold text-slate-900 sm:text-4xl">Tutor AI Services</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Save time and improve student outcomes using our AI Tutor toolkit. Generate session summaries, homework action plans, and structured feedback instantly.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Rough Session Notes</span>
            <textarea
              rows={4}
              placeholder="e.g. Did calculus today. They had trouble with picking u and dv for integration by parts. HW is sheet 4. Next time we do trig sub."
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white/80 p-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            ></textarea>
          </label>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="glow-button rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-3 font-semibold text-white disabled:opacity-50"
          >
            {isGenerating ? 'Generating Summary...' : 'Generate Auto-Summary'}
          </button>
        </div>
      </AnimatedSection>

      {summary && (
        <AnimatedSection className="grid gap-5 lg:grid-cols-2" delay={0.2}>
          <MotionDiv className="glass-panel rounded-3xl p-6">
            <h2 className="mb-4 font-heading text-xl font-bold text-slate-900">Structured Summary</h2>
            <div className="space-y-3 text-sm text-slate-700">
              <p><strong>Topics Covered:</strong> {summary.topics}</p>
              <p><strong>Misconceptions:</strong> {summary.misconceptions}</p>
              <p><strong>Homework Assigned:</strong> {summary.homework}</p>
              <p><strong>Next Session Focus:</strong> {summary.nextSession}</p>
            </div>
          </MotionDiv>

          <MotionDiv className="glass-panel rounded-3xl p-6 bg-indigo-50/50">
            <h2 className="mb-4 font-heading text-xl font-bold text-slate-900">Student Email Draft</h2>
            <textarea 
              readOnly 
              className="w-full h-32 rounded-xl border border-slate-200 bg-white/50 p-3 text-sm outline-none"
              value={summary.emailDraft}
            />
            <button 
              onClick={() => {
                navigator.clipboard.writeText(summary.emailDraft);
                toast.success('Draft copied to clipboard');
              }}
              className="mt-3 rounded-lg bg-indigo-100 px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-200"
            >
              Copy Draft
            </button>
          </MotionDiv>
        </AnimatedSection>
      )}
    </div>
  );
}

export default TutorServices;
