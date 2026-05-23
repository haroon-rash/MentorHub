// src/components/Footer/Footer.jsx

import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="relative z-10 px-4 pb-8 pt-12 sm:px-6 lg:px-8">
      <div className="glass-panel mx-auto grid w-full max-w-7xl gap-8 rounded-3xl p-6 sm:grid-cols-2 lg:grid-cols-4 sm:p-8">
        <div>
          <Link to="/" className="font-heading text-2xl font-bold text-slate-900">
            Mentor<span className="text-gradient">Hub</span>
          </Link>
          <p className="mt-3 max-w-sm text-sm text-slate-600">
            A playful yet professional tutor marketplace where students discover mentors, book sessions, and level up faster.
          </p>
        </div>

        <div>
          <h4 className="font-heading text-base font-semibold text-slate-900">Platform</h4>
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            <Link to="/tutors" className="transition hover:text-indigo-600">Find Tutors</Link>
            <Link to="/chat" className="transition hover:text-indigo-600">Live Chat</Link>
            <Link to="/auth?mode=register" className="transition hover:text-indigo-600">Join as Tutor</Link>
          </div>
        </div>

        <div>
          <h4 className="font-heading text-base font-semibold text-slate-900">Legal</h4>
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            <Link to="/page/privacy-policy" className="transition hover:text-indigo-600">Privacy Policy</Link>
            <Link to="/page/terms-conditions" className="transition hover:text-indigo-600">Terms & Conditions</Link>
            <Link to="/page/disclaimer" className="transition hover:text-indigo-600">Disclaimer</Link>
          </div>
        </div>

        <div>
          <h4 className="font-heading text-base font-semibold text-slate-900">About</h4>
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            <Link to="/page/about-us" className="transition hover:text-indigo-600">About Us</Link>
            <Link to="/page/contact-us" className="transition hover:text-indigo-600">Contact Us</Link>
            <Link to="/page/blogs" className="transition hover:text-indigo-600">Blogs</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-4 max-w-7xl px-2 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} MentorHub. Built for modern learners.</p>
      </div>
    </footer>
  );
}

export default Footer;