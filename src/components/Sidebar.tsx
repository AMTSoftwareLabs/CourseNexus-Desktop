import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Settings, 
  Bookmark, 
  BookText, 
  Moon, 
  Sun, 
  Cpu, 
  Server,
  Zap
} from 'lucide-react';
import { useStore } from '../store';
import { cn } from '../lib/utils';

export default function Sidebar() {
  const view = useStore((state) => state.view);
  const setView = useStore((state) => state.setView);
  const videos = useStore(state => state.videos);
  const settings = useStore((state) => state.settings);
  const updateSettings = useStore((state) => state.updateSettings);
  
  const totalDuration = videos.reduce((acc, v) => acc + (v.duration || 0), 0);
  const watchedDuration = videos.reduce((acc, v) => acc + (v.progress || 0), 0);
  const storagePercentage = totalDuration > 0 ? Math.min(100, (watchedDuration / totalDuration) * 100) : 0;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, viewType: 'dashboard' as const },
    { id: 'courses', label: 'My Library', icon: BookOpen, viewType: 'courses' as const },
    { id: 'bookmarks', label: 'Notes & Bookmarks', icon: Bookmark, viewType: 'bookmarks' as const },
    { id: 'flashcards', label: 'Flashcards', icon: BookText, viewType: 'flashcards' as const },
    { id: 'settings', label: 'Settings', icon: Settings, viewType: 'settings' as const },
  ];

  const handleSwitchBackendModel = async (modelId: string) => {
    updateSettings({ aiModel: modelId });
    if (settings.useDesktopBackend) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      try {
        const backendUrl = settings.desktopBackendUrl || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/api/select-model`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model_id: modelId }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          console.warn(`Quick switch model backend returned non-OK status: ${response.status}`);
        }
      } catch (e: any) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') {
          console.log("Quick switch model request timed out (desktop backend is offline).");
        } else {
          console.log("Desktop backend is currently offline. Model selection saved locally.");
        }
      }
    }
  };

  return (
    <aside className="w-64 bg-indigo-600 dark:bg-slate-950 text-white p-6 flex flex-col gap-6 shadow-2xl z-10 shrink-0 h-screen overflow-y-auto transition-colors border-r border-transparent dark:border-slate-800">
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
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all font-medium text-left",
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

      {/* Quick Settings Panel at Bottom */}
      <div className="mt-auto pt-4 border-t border-indigo-500/30 dark:border-slate-800 space-y-3.5">
        <div className="flex items-center justify-between text-xs text-indigo-200 dark:text-slate-400 font-bold uppercase tracking-widest">
          <span>Quick Settings</span>
          <button 
            onClick={() => updateSettings({ darkMode: !settings.darkMode })}
            className="p-1.5 hover:bg-indigo-500/40 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer text-indigo-100"
            title="Toggle Dark Mode"
          >
            {settings.darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-200" />}
          </button>
        </div>

        {/* Engine Toggle */}
        <div className="flex rounded-xl bg-indigo-700/50 dark:bg-slate-900/50 p-1 border border-indigo-500/20 dark:border-slate-800">
          <button
            onClick={() => updateSettings({ useDesktopBackend: false })}
            className={cn(
              "flex-1 text-[10px] py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer",
              !settings.useDesktopBackend 
                ? "bg-indigo-500 dark:bg-indigo-600 text-white shadow-sm" 
                : "text-indigo-200 dark:text-slate-400 hover:text-white"
            )}
          >
            <Cpu className="w-3 h-3" />
            Browser AI
          </button>
          <button
            onClick={() => updateSettings({ useDesktopBackend: true })}
            className={cn(
              "flex-1 text-[10px] py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer",
              settings.useDesktopBackend 
                ? "bg-indigo-500 dark:bg-indigo-600 text-white shadow-sm" 
                : "text-indigo-200 dark:text-slate-400 hover:text-white"
            )}
          >
            <Server className="w-3 h-3" />
            Python Server
          </button>
        </div>

        {/* Dynamic Model Pills */}
        <div className="space-y-1 text-left">
          <div className="text-[10px] text-indigo-200/85 dark:text-slate-500 font-medium">Active Model</div>
          <div className="flex rounded-lg bg-indigo-800/30 dark:bg-slate-900/30 p-0.5 border border-indigo-500/10 dark:border-slate-800/60">
            <button
              onClick={() => handleSwitchBackendModel('llama-3.2-1b')}
              className={cn(
                "flex-1 text-[9px] py-1 px-1.5 rounded font-medium transition-all cursor-pointer",
                settings.aiModel === 'llama-3.2-1b'
                  ? "bg-indigo-500/60 dark:bg-indigo-900 text-white shadow-sm font-bold"
                  : "text-indigo-200/70 dark:text-slate-400 hover:text-white"
              )}
            >
              Llama 1B
            </button>
            <button
              onClick={() => handleSwitchBackendModel('gemma-2-2b')}
              className={cn(
                "flex-1 text-[9px] py-1 px-1.5 rounded font-medium transition-all cursor-pointer",
                settings.aiModel === 'gemma-2-2b'
                  ? "bg-indigo-500/60 dark:bg-indigo-900 text-white shadow-sm font-bold"
                  : "text-indigo-200/70 dark:text-slate-400 hover:text-white"
              )}
            >
              Gemma 2B
            </button>
          </div>
        </div>

        {/* Compact Storage info */}
        <div className="bg-indigo-800/20 dark:bg-slate-900/20 p-2.5 rounded-xl border border-indigo-500/5 dark:border-slate-800/40 text-left">
          <div className="flex justify-between text-[10px] text-indigo-200 dark:text-slate-400 mb-1">
            <span>Offline Storage</span>
            <span>{Math.round(storagePercentage)}%</span>
          </div>
          <div className="h-1 w-full bg-indigo-900 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-400 dark:bg-indigo-500 transition-all duration-300" style={{ width: `${storagePercentage}%` }}></div>
          </div>
        </div>
      </div>
    </aside>
  );
}
