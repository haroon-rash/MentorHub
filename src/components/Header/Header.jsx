import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext.jsx';
import { getNavItems } from '../../config/navigation.js';

const navClass = ({ isActive }) =>
  `rounded-xl px-3 py-2 text-sm font-semibold transition ${
    isActive
      ? 'bg-indigo-600 text-white'
      : 'text-[var(--mh-text)] hover:bg-indigo-500/10'
  }`;

const MotionDiv = motion.div;

function Header() {
  const { isDark, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const navItems = getNavItems(null, false, null);

  return (
    <header className="sticky top-0 z-40 px-4 pb-2 pt-4 sm:px-6 lg:px-8">
      <div className="glass-panel mx-auto flex w-full max-w-7xl items-center justify-between rounded-3xl px-4 py-3 sm:px-6">
        <Link to="/" className="font-heading text-xl font-bold text-[var(--mh-text)]">
          Mentor<span className="text-gradient">Hub</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={toggleTheme}
            className="mh-btn-secondary rounded-xl px-3 py-2 text-sm"
            aria-label="Toggle theme"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          <Link to="/auth?mode=login" className="mh-btn-secondary rounded-xl px-4 py-2 text-sm font-semibold">
            Login
          </Link>
          <Link to="/auth?mode=register" className="glow-button rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white">
            Register
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="mh-btn-secondary rounded-xl px-3 py-2 text-sm md:hidden"
        >
          Menu
        </button>
      </div>

      {isOpen && (
        <MotionDiv
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel mx-auto mt-2 w-[calc(100%-2rem)] max-w-7xl rounded-3xl p-4 md:hidden"
        >
          <div className="grid gap-2">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={() => setIsOpen(false)} className={navClass}>
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Link to="/auth?mode=login" onClick={() => setIsOpen(false)} className="mh-btn-secondary flex-1 rounded-xl py-2 text-center text-sm font-semibold">
              Login
            </Link>
            <Link to="/auth?mode=register" onClick={() => setIsOpen(false)} className="glow-button flex-1 rounded-xl py-2 text-center text-sm font-semibold text-white">
              Register
            </Link>
          </div>
        </MotionDiv>
      )}
    </header>
  );
}

export default Header;
