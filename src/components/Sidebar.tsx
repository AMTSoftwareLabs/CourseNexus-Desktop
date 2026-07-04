import React from 'react';
import { LayoutDashboard, BookOpen, Settings, PlayCircle, Bookmark, BookText } from 'lucide-react';
import { useStore } from '../store';
import { cn } from '../lib/utils';

export default function Sidebar() {
  const view = useStore((state) => state.view);
  const setView = useStore((state) => state.setView);
  const videos = useStore(state => state.videos);
  
  const totalDuration = videos.reduce((acc, v) => acc + (v.duration || 0), 0);
  const watchedDuration = videos.reduce((acc, v) => acc + (v.progress || 0), 0);
  const storagePercentage = totalDuration > 0 ? Math.min(100, (watchedDuration / totalDuration) * 100) : 0;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, viewType: 'dashboard' as const },
    { id: 'courses', label: 'My Library', icon: BookOpen, viewType: 'courses' as const },
    { id: 'bookmarks', label: 'Notes & Bookmarks', icon: Bookmark, viewType: 'bookmarks' as const },
  ];

  return (
    <aside className="w-64 bg-indigo-600 dark:bg-slate-950 text-white p-6 flex flex-col gap-8 shadow-2xl z-10 shrink-0 h-full transition-colors border-r border-transparent dark:border-slate-800">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white dark:bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg transition-colors">
          <div className="w-6 h-6 bg-indigo-600 dark:bg-white rounded-sm transform rotate-45 transition-colors"></div>
        </div>
        <h1 className="font-bold text-xl tracking-tight">Nexus</h1>
      </div>
      
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = view.type === item.viewType || (item.viewType === 'courses' && (view.type === 'course_detail' || view.type === 'player'));
          return (
            <button
              key={item.id}
              onClick={() => setView({ type: item.viewType })}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all font-medium",
                isActive 
                  ? "bg-indigo-500 bg-opacity-40 text-white" 
                  : "hover:bg-indigo-500 hover:bg-opacity-20 text-indigo-100"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto bg-indigo-700 bg-opacity-50 p-4 rounded-2xl">
        <div className="text-xs text-indigo-300 font-bold uppercase tracking-widest mb-2">Offline Storage</div>
        <div className="flex justify-between text-xs mb-1">
          <span>{Math.round(watchedDuration / 60)} MB used</span>
          <span>{Math.round(storagePercentage)}%</span>
        </div>
        <div className="h-1.5 w-full bg-indigo-900 rounded-full overflow-hidden">
          <div className="h-full bg-rose-400 transition-all duration-300" style={{ width: `${storagePercentage}%` }}></div>
        </div>
      </div>
    </aside>
  );
}
