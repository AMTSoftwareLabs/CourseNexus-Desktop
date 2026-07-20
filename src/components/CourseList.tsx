import React, { useState, useRef } from 'react';
import { useStore, useTransientStore } from '../store';
import { Plus, Trash2, Video as VideoIcon, FileVideo, Clock, BookOpen, FolderSearch, Loader2 } from 'lucide-react';
import { formatTime } from '../lib/utils';
import { Course } from '../types';

export default function CourseList() {
  const courses = useStore((state) => state.courses);
  const addCourse = useStore((state) => state.addCourse);
  const addVideo = useStore((state) => state.addVideo);
  const deleteCourse = useStore((state) => state.deleteCourse);
  const setView = useStore((state) => state.setView);
  const setFile = useTransientStore((state) => state.setFile);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addCourse({ title: newTitle, description: newDesc });
    setNewTitle('');
    setNewDesc('');
    setIsAdding(false);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScanFolder = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDirectorySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsScanning(true);
    try {
      const courseMap = new Map<string, File[]>();
      
      Array.from(e.target.files).forEach((file: any) => {
        if (file.name.match(/\.(mp4|mkv|avi|mov|webm)$/i)) {
          // webkitRelativePath contains the full path including the selected directory
          // e.g. "SelectedFolder/SubFolder/video.mp4"
          const relativePath = file.webkitRelativePath || '';
          const parts = relativePath.split('/');
          
          // Use the immediate parent folder as course name, or top folder
          const courseName = parts.length > 1 ? parts[parts.length - 2] : 'Uncategorized';
          
          if (!courseMap.has(courseName)) {
            courseMap.set(courseName, []);
          }
          courseMap.get(courseName)!.push(file);
        }
      });

      const existingCourses = useStore.getState().courses;
      const existingVideos = useStore.getState().videos;
      let addedCount = 0;
      
      for (const [courseName, files] of courseMap.entries()) {
        let course = existingCourses.find(c => c.title === courseName);
        let courseId = course?.id;
        
        if (!courseId) {
          courseId = addCourse({ title: courseName, description: `Auto-scanned course` });
        }
        
        for (const file of files) {
          const filePath = (file as any).path;
          const existingVideo = existingVideos.find(v => 
            v.courseId === courseId && (
              (filePath && v.filePath === filePath) || 
              (!filePath && v.fileName === file.name)
            )
          );

          if (existingVideo) {
            setFile(existingVideo.id, file);
          } else {
            const videoId = addVideo({
              courseId,
              title: file.name.replace(/\.[^/.]+$/, ""),
              fileName: file.name,
              filePath, // Save absolute path for Electron
            });
            setFile(videoId, file);
            useTransientStore.getState().queueTranscription(videoId, file);
            addedCount++;
          }
        }
      }
      
      if (addedCount === 0) {
        alert("No new video files found in the selected folder.");
      } else {
        alert(`Successfully imported ${addedCount} new video(s) and queued them for transcription.`);
      }
    } catch (err) {
      console.error("Scan failed", err);
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="p-8 flex flex-col gap-8 flex-1 w-full">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleDirectorySelect} 
        className="hidden" 
        {...{ webkitdirectory: "", directory: "" } as any} 
      />
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors">My Library</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 transition-colors">Manage your local learning resources.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleScanFolder}
            disabled={isScanning}
            className="bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-300 px-5 py-2.5 rounded-full font-bold text-sm transition-all flex items-center disabled:opacity-50"
          >
            {isScanning ? <Loader2 className="w-5 h-5 mr-1 animate-spin" /> : <FolderSearch className="w-5 h-5 mr-1" />}
            {isScanning ? 'Scanning...' : 'Auto-Scan Folder'}
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-lg shadow-rose-200 dark:shadow-none transition-all flex items-center"
          >
            <Plus className="w-5 h-5 mr-1" />
            New Course
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 mb-2 animate-in fade-in slide-in-from-top-4 transition-colors">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 transition-colors">Create New Course</h2>
          <form onSubmit={handleAddCourse}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors">Course Title</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-700 transition-all outline-none text-slate-900 dark:text-white"
                  placeholder="e.g. Advanced System Design"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors">Description (Optional)</label>
                <textarea 
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-700 transition-all outline-none resize-none text-slate-900 dark:text-white"
                  rows={3}
                  placeholder="What is this course about?"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsAdding(false)}
                  className="px-5 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full font-bold text-sm transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-lg shadow-rose-200 transition-all disabled:opacity-50"
                  disabled={!newTitle.trim()}
                >
                  Create Course
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {courses.length === 0 && !isAdding ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
          <VideoIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4 transition-colors" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 transition-colors">No courses yet</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">Create a course to start organizing your local videos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <CourseCard key={course.id} course={course} onClick={() => setView({ type: 'course_detail', courseId: course.id })} onDelete={(e) => { e.stopPropagation(); deleteCourse(course.id); }} />
          ))}
        </div>
      )}
    </div>
  );
}

const CourseCard: React.FC<{ course: Course, onClick: () => void, onDelete: (e: React.MouseEvent) => void }> = ({ course, onClick, onDelete }) => {
  const videos = useStore(state => state.videos).filter(v => v.courseId === course.id);
  const totalWatchTime = videos.reduce((acc, v) => acc + (v.progress || 0), 0);
  const totalDuration = videos.reduce((acc, v) => acc + (v.duration || 0), 0);
  const completedVideos = videos.filter(v => v.duration > 0 && v.progress >= v.duration - 5).length;
  const progressPercent = totalDuration > 0 ? Math.min(100, (totalWatchTime / totalDuration) * 100) : 0;
  
  return (
    <div 
      onClick={onClick}
      className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group flex flex-col h-full relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-full -mr-12 -mt-12 opacity-60 transition-transform group-hover:scale-150"></div>
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm transition-colors">
          <BookOpen className="w-6 h-6" />
        </div>
        <button 
          onClick={onDelete}
          className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 leading-tight line-clamp-2 relative z-10 transition-colors">{course.title}</h3>
      <p className="text-slate-400 dark:text-slate-500 text-sm line-clamp-2 flex-1 mb-4 relative z-10 transition-colors">{course.description || 'No description provided.'}</p>
      
      <div className="flex flex-col gap-2 mb-4 relative z-10">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 transition-colors">
          <span>{Math.round(progressPercent)}% Complete</span>
          <span>{completedVideos} / {videos.length} Done</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden transition-colors">
          <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-4 mt-auto relative z-10 transition-colors">
        <div className="flex items-center gap-1.5">
          <span className="text-lg">⏱️</span>
          {formatTime(totalWatchTime)} / {formatTime(totalDuration)}
        </div>
        {videos.length > completedVideos && (
          <div className="text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md transition-colors">
            {videos.length - completedVideos} Pending
          </div>
        )}
      </div>
    </div>
  );
}
