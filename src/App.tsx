import React, { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CourseList from './components/CourseList';
import BookmarksView from './components/BookmarksView';
import FlashcardsView from './components/FlashcardsView';
import SettingsView from './components/SettingsView';
import CourseDetail from './components/CourseDetail';
import VideoPlayer from './components/VideoPlayer';
import GemmaChatWidget from './components/GemmaChatWidget';
import { useStore, useTransientStore } from './store';
import { cn } from './lib/utils';

export default function App() {
  const view = useStore((state) => state.view);
  const settings = useStore((state) => state.settings);
  const loadDirectoryHandle = useTransientStore((state) => state.loadDirectoryHandle);

  useEffect(() => {
    loadDirectoryHandle();
  }, [loadDirectoryHandle]);

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  return (
    <div className={cn(
      "min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex transition-colors font-sans overflow-hidden",
      settings.darkMode ? "dark" : ""
    )}>
      {view.type !== 'player' && <Sidebar />}
      
      <main className={cn(
        "flex-1 h-screen overflow-y-auto",
        view.type !== 'player' ? "p-4 md:p-8" : ""
      )}>
        <div className={cn(
          "h-full",
          view.type !== 'player' ? "max-w-7xl mx-auto space-y-8" : ""
        )}>
          {view.type === 'dashboard' && <Dashboard />}
          {view.type === 'courses' && <CourseList />}
          {view.type === 'bookmarks' && <BookmarksView />}
          {view.type === 'flashcards' && <FlashcardsView />}
          {view.type === 'settings' && <SettingsView />}
          {view.type === 'course_detail' && <CourseDetail courseId={view.courseId} />}
          {view.type === 'player' && <VideoPlayer videoId={view.videoId} courseId={view.courseId} />}
        </div>
      </main>

      <GemmaChatWidget />
    </div>
  );
}

