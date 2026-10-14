"use client"

import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import CommandPalette from './CommandPalette';
import { ToastProvider } from '@/components/ui/Toast';

export default function DashboardShell({ children }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <ToastProvider>
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette />

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:block shrink-0">
        <Sidebar 
          collapsed={isSidebarCollapsed} 
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
        />
      </div>

      {/* Mobile Sidebar (always full) */}
      <div
        className="fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:hidden"
        style={{ transform: isMobileSidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <Sidebar onClose={() => setIsMobileSidebarOpen(false)} />
      </div>

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
    </ToastProvider>
  );
}
