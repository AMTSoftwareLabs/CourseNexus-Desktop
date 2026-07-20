import React, { useRef, useState } from 'react';
import { useStore, useTransientStore } from '../store';
import { ArrowLeft, Play, Plus, Trash2, FileVideo, FileText, Loader2 } from 'lucide-react';
import { formatTime } from '../lib/utils';

export default function CourseDetail({ courseId }: { courseId: string }) {
  const course = useStore(state => state.courses.find(c => c.id === courseId));
  const videos = useStore(state => state.videos).filter(v => v.courseId === courseId);
  const addVideo = useStore(state => state.addVideo);
  const deleteVideo = useStore(state => state.deleteVideo);
  const setView = useStore(state => state.setView);
  const setTranscript = useStore(state => state.setTranscript);
  
  const setFile = useTransientStore(state => state.setFile);
  const transcriptionStatuses = useTransientStore(state => state.transcriptionStatuses);
  const isWhisperLoading = useTransientStore(state => state.isWhisperLoading);
  const whisperLoadingProgress = useTransientStore(state => state.whisperLoadingProgress);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  if (!course) return <div>Course not found</div>;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file: File) => {
        if (!file.type.startsWith("video/")) return;
        
        let moduleName = undefined;
        // Extract module name from folder structure if available
        if (file.webkitRelativePath) {
          const parts = file.webkitRelativePath.split('/');
          if (parts.length >= 2) {
            moduleName = parts[parts.length - 2];
          }
        }
        
        const filePath = (file as any).path;
        const existingVideo = videos.find(v => 
          (filePath && v.filePath === filePath) || 
          (!filePath && v.fileName === file.name && v.moduleName === moduleName)
        );

        if (existingVideo) {
          setFile(existingVideo.id, file);
          return;
        }

        const videoId = addVideo({
          courseId,
          title: file.name.replace(/\.[^/.]+$/, ""), // remove extension
          fileName: file.name,
          filePath, // Save the absolute path for Electron
          moduleName
        });
        setFile(videoId, file);
        useTransientStore.getState().queueTranscription(videoId, file);
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const handleBatchGenerate = () => {
    let queued = 0;
    videos.forEach(v => {
      if (!v.transcript) {
        const file = useTransientStore.getState().files[v.id];
        if (file) {
          useTransientStore.getState().queueTranscription(v.id, file);
          queued++;
        }
      }
    });
    
    if (queued > 0) {
      alert(`Queued ${queued} videos for background transcription!`);
    } else {
      alert("No missing transcripts found, or files are not loaded. Please re-link videos first.");
    }
  };

  const totalWatchTime = videos.reduce((acc, v) => acc + (v.progress || 0), 0);
  const totalDuration = videos.reduce((acc, v) => acc + (v.duration || 0), 0);
  const completedVideos = videos.filter(v => v.duration > 0 && v.progress >= v.duration - 5).length;
  const progressPercent = totalDuration > 0 ? Math.min(100, (totalWatchTime / totalDuration) * 100) : 0;

  return (
    <div className="p-8 max-w-5xl mx-auto w-full flex flex-col gap-8 flex-1">
      <button 
        onClick={() => setView({ type: 'courses' })}
        className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors w-fit bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 rounded-full text-sm"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Library
      </button>

      <div className="flex justify-between items-end gap-8">
        <div className="flex-1">
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight transition-colors">{course.title}</h1>
          {course.description && <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg leading-relaxed max-w-3xl transition-colors">{course.description}</p>}
        </div>
        
        {videos.length > 0 && (
          <div className="w-64 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm shrink-0 transition-colors">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 transition-colors">
              <span>Course Progress</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-3 transition-colors">
              <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 transition-colors">
              <span>{completedVideos} / {videos.length} Done</span>
              {videos.length > completedVideos && (
                <span className="text-indigo-500 dark:text-indigo-400">{videos.length - completedVideos} Pending</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm flex flex-col transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center transition-colors">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center transition-colors">
              <span className="text-2xl mr-2">📂</span>
              Course Content
            </h2>
            {isWhisperLoading && <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full animate-pulse">{whisperLoadingProgress}</span>}
          </div>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/*"
            multiple
            className="hidden" 
          />
          {/* webkitdirectory is non-standard but supported in Electron/Chrome */}
          <input 
            type="file" 
            ref={folderInputRef}
            onChange={handleFileChange}
            accept="video/*"
            {...({ webkitdirectory: "true", directory: "true" } as any)}
            multiple
            className="hidden" 
          />
          <div className="flex gap-3">
            <button 
              onClick={handleBatchGenerate}
              disabled={videos.length === 0}
              className="px-5 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full font-bold text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center disabled:opacity-50"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Batch Transcribe
            </button>
            <button 
              onClick={() => folderInputRef.current?.click()}
              className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full font-bold text-sm transition-colors shadow-lg shadow-indigo-200 dark:shadow-none flex items-center"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Folder
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full font-bold text-sm transition-colors shadow-lg shadow-rose-200 dark:shadow-none flex items-center"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Files
            </button>
          </div>
        </div>

        {videos.length === 0 ? (
          <div className="p-16 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 transition-colors">
            <div className="text-4xl mb-4 opacity-50">🎞️</div>
            No videos added yet. Click "Add Files" or "Add Folder" to select local videos.
          </div>
        ) : (
          <div className="flex flex-col gap-6 p-6 overflow-hidden bg-slate-50 dark:bg-slate-900 flex-1 transition-colors">
            {Object.entries(
              videos.reduce((acc, video) => {
                const module = video.moduleName || 'Uncategorized';
                if (!acc[module]) acc[module] = [];
                acc[module].push(video);
                return acc;
              }, {} as Record<string, typeof videos>)
            ).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map(([moduleName, moduleVideos]) => (
              <div key={moduleName} className="flex flex-col gap-3">
                {moduleName !== 'Uncategorized' && (
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2 mt-2 transition-colors">{moduleName}</h3>
                )}
                {moduleVideos.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })).map((video, index) => {
                  const progressPercent = video.duration > 0 ? (video.progress / video.duration) * 100 : 0;
                  return (
                    <div key={video.id} className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-between group hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors shadow-sm">
                      <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => setView({ type: 'player', courseId, videoId: video.id })}>
                        <span className="text-2xl text-slate-400 dark:text-slate-500 font-bold w-6 text-right transition-colors">{index + 1}</span>
                        <span className="text-2xl">🎞️</span>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center flex-wrap gap-2 transition-colors">
                            <span>{video.title}</span>
                            {transcriptionStatuses[video.id] && (
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/40 animate-pulse">
                                ⏳ {transcriptionStatuses[video.id]}
                              </span>
                            )}
                            {!transcriptionStatuses[video.id] && video.transcript && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/40" title="Auto-transcript ready">
                                📝 Transcript Ready
                              </span>
                            )}
                            {video.notes && (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/40" title="Study notes available">
                                📓 Notes
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-tight flex items-center gap-2 transition-colors">
                            <span className="truncate max-w-[200px]" title={video.fileName}>{video.fileName}</span>
                            <span>•</span>
                            <span>{formatTime(video.progress)} / {formatTime(video.duration)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="w-32 px-4">
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden transition-colors">
                          <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => setView({ type: 'player', courseId, videoId: video.id })}
                          className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition-all opacity-0 group-hover:opacity-100"
                          title="Play"
                        >
                          <Play className="w-3.5 h-3.5 ml-0.5" />
                        </button>
                        <button 
                          onClick={() => deleteVideo(video.id)}
                          className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all opacity-0 group-hover:opacity-100"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
