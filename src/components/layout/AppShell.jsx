import React from 'react';
import { Outlet } from 'react-router-dom';
import { useSidebar } from '../../context/SidebarContext.jsx';
import AppSidebar from './AppSidebar.jsx';
import TopBar from './TopBar.jsx';

export default function AppShell() {
  const { collapsed } = useSidebar();
  const sidebarWidth = collapsed ? '4.5rem' : '16rem';

  return (
    <div
      className="min-h-screen bg-[var(--mh-bg)]"
      style={{ '--sidebar-width': sidebarWidth }}
    >
      <AppSidebar />
      <div className="flex min-h-screen min-w-0 flex-col transition-[margin,width] duration-300 ease-out lg:ml-[var(--sidebar-width)] lg:w-[calc(100%-var(--sidebar-width))]">
        <TopBar />
        <main className="relative z-10 flex-1 px-4 py-5 sm:px-5 lg:px-6">
          <div className="mh-content-width">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
