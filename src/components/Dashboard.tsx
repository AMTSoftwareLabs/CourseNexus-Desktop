import React from 'react';
import { useStore } from '../store';
import { formatTime } from '../lib/utils';
import { Play, BookOpen, Clock, Award, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

export default function Dashboard({ searchQuery = '' }: { searchQuery?: string }) {
  const courses = useStore((state) => state.courses);
  const videos = useStore((state) => state.videos);
  const setView = useStore((state) => state.setView);

  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (v.moduleName && v.moduleName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    courses.find(c => c.id === v.courseId)?.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalWatchTime = videos.reduce((acc, v) => acc + (v.progress || 0), 0);
  const totalCourses = courses.length;
  const completedVideos = videos.filter(v => v.duration > 0 && v.progress >= v.duration - 5).length;
  
  // Find recently watched videos
  const recentVideos = [...filteredVideos]
    .filter(v => v.progress > 0)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3);

  // Analytics data for charts
  const courseAnalytics = courses.map(course => {
    const courseVideos = videos.filter(v => v.courseId === course.id);
    const totalVids = courseVideos.length;
    const completedVids = courseVideos.filter(v => v.duration > 0 && v.progress >= v.duration - 5).length;
    const progressPercent = totalVids > 0 ? (completedVids / totalVids) * 100 : 0;
    
    return {
      name: course.title,
      progress: Math.round(progressPercent),
      completed: completedVids,
      total: totalVids
    };
  }).sort((a, b) => b.progress - a.progress).slice(0, 5); // top 5 courses

  return (
    <div className="p-8 flex flex-col gap-8 flex-1">
      {searchQuery && (
        <div className="text-xl font-bold text-slate-800 dark:text-white">
          Search Results for "{searchQuery}"
        </div>
      )}
      {!searchQuery && recentVideos.length > 0 ? (
        <section className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex gap-6 relative overflow-hidden shrink-0 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100 dark:bg-amber-900/30 rounded-full -mr-16 -mt-16 opacity-40"></div>
          <div 
            className="w-64 h-40 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-4xl shadow-xl overflow-hidden relative cursor-pointer group shrink-0"
            onClick={() => setView({ type: 'player', courseId: recentVideos[0].courseId, videoId: recentVideos[0].id })}
          >
             <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900 to-transparent opacity-60"></div>
             <Play className="w-12 h-12 relative z-10 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded">Recently Viewed</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1 leading-tight line-clamp-2 transition-colors">
              {courses.find(c => c.id === recentVideos[0].courseId)?.title || 'Course'}
            </h2>
            <p className="text-slate-400 dark:text-slate-300 text-sm mb-4 line-clamp-1">{recentVideos[0].title}</p>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full transition-colors">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${recentVideos[0].duration > 0 ? (recentVideos[0].progress / recentVideos[0].duration) * 100 : 0}%` }}></div>
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap transition-colors">
                {Math.round(recentVideos[0].duration > 0 ? (recentVideos[0].progress / recentVideos[0].duration) * 100 : 0)}% Complete
              </span>
            </div>
          </div>
        </section>
      ) : !searchQuery ? (
        <section className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center h-48 relative overflow-hidden shrink-0 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100 dark:bg-amber-900/30 rounded-full -mr-16 -mt-16 opacity-40"></div>
          <div className="text-center">
             <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 relative z-10 transition-colors">Welcome to Nexus</h2>
             <p className="text-slate-500 dark:text-slate-400 mb-4 relative z-10 transition-colors">Start by adding a course and some videos.</p>
          </div>
        </section>
      ) : null}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {!searchQuery && (
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Learning Time</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white">{formatTime(totalWatchTime)}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Lectures Completed</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white">{completedVideos}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-500 dark:text-rose-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Active Courses</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white">{totalCourses}</p>
              </div>
            </div>
          </div>
        )}

        {!searchQuery && courseAnalytics.length > 0 && (
          <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col transition-colors mb-2">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 transition-colors">
              <BarChart3 className="w-5 h-5 text-indigo-500" /> Course Progress Analytics
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="progress" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {courseAnalytics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#8b5cf6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className={`lg:col-span-3 bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col transition-colors`}>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 transition-colors">
            📂 {searchQuery ? 'Search Results' : 'Local Library'} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">({filteredVideos.length} Lectures)</span>
          </h3>
          <div className="flex flex-col gap-3 overflow-hidden">
            {filteredVideos.slice(0, searchQuery ? 20 : 5).map(video => (
               <div key={video.id} onClick={() => setView({ type: 'player', courseId: video.courseId, videoId: video.id })} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 flex items-center justify-between group hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer">
                 <div className="flex items-center gap-3">
                   <span className="text-2xl">🎞️</span>
                   <div>
                     <div className="text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-1 transition-colors">{video.title}</div>
                     <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-tight transition-colors">
                       {courses.find(c => c.id === video.courseId)?.title} {video.moduleName ? `• ${video.moduleName}` : ''} • {Math.round(video.duration > 0 ? (video.progress / video.duration) * 100 : 0)}% Watched
                     </div>
                   </div>
                 </div>
                 <button className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Play className="w-4 h-4 text-slate-600 dark:text-slate-300 ml-1" /></button>
               </div>
            ))}
            {filteredVideos.length === 0 && (
               <div className="text-center py-10 text-slate-500 dark:text-slate-400">No videos found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
