import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CourseList from './components/CourseList';
import CourseDetail from './components/CourseDetail';
import VideoPlayer from './components/VideoPlayer';
import BookmarksView from './components/BookmarksView';
import { useStore } from './store';

export default function App() {
  const view = useStore((state) => state.view);
  const setView = useStore((state) => state.setView);
  const settings = useStore((state) => state.settings);
  const updateSettings = useStore((state) => state.updateSettings);
  
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  const renderView = () => {
    switch (view.type) {
      case 'dashboard':
        return <Dashboard />;
      case 'courses':
        return <CourseList />;
      case 'bookmarks':
        return <BookmarksView />;
      case 'course_detail':
        return <CourseDetail courseId={view.courseId} />;
      case 'player':
        return <VideoPlayer courseId={view.courseId} videoId={view.videoId} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-sans overflow-hidden text-slate-900 dark:text-slate-100 transition-colors">
      {/* Electron Title Bar */}
      <div className="h-8 bg-slate-100 dark:bg-slate-800 flex items-center px-4 justify-between border-b border-slate-200 dark:border-slate-700 select-none shrink-0 transition-colors">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-400"></div>
          <div className="w-3 h-3 rounded-full bg-amber-400"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
        </div>
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase">Nexus</div>
          <div className="w-12"></div>
        </div>
  
        <div className="flex flex-1 overflow-hidden">
          {view.type !== 'player' && <Sidebar />}
          <main className="flex-1 relative flex flex-col h-full min-w-0 bg-slate-50 dark:bg-slate-900 transition-colors">
            {view.type !== 'player' && (
              <header className="h-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 flex items-center justify-between shrink-0 z-10 transition-colors">
                <div className="flex-1 max-w-md">
                  <div className="relative flex items-center">
                    <span className="absolute left-4 opacity-40">🔍</span>
                    <input 
                      type="text" 
                      placeholder="Search local lectures and notes..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-700 border-none rounded-full py-2.5 px-10 text-sm focus:ring-2 focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-600 transition-all outline-none text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400" 
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => updateSettings({ darkMode: !settings.darkMode })} 
                    className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    title="Toggle Dark Mode"
                  >
                    {settings.darkMode ? '🌙' : '☀️'}
                  </button>
                  <button onClick={() => setView({ type: 'courses' })} className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-lg shadow-rose-200 dark:shadow-none transition-all">
                    + New Course
                  </button>
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-lg shadow-inner">👤</div>
                </div>
              </header>
            )}
            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 transition-colors">
              {/* Pass searchQuery to views if needed, for now just pass to Dashboard */}
              {view.type === 'dashboard' ? <Dashboard searchQuery={searchQuery} /> : renderView()}
            </div>
          </main>
        </div>
      </div>
    );
  }

