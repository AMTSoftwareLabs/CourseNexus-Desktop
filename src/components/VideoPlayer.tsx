import React, { useEffect, useRef, useState } from 'react';
import { useStore, useTransientStore } from '../store';
import { ArrowLeft, Bookmark as BookmarkIcon, List, AlertCircle, Upload, Trash2, Edit2, FileText, Wand2, Loader2, Check, X, Settings as SettingsIcon, Play, Pause, Maximize, Clock } from 'lucide-react';
import { formatTime, cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';

export default function VideoPlayer({ courseId, videoId }: { courseId: string, videoId: string }) {
  const setView = useStore(state => state.setView);
  const course = useStore(state => state.courses.find(c => c.id === courseId));
  const video = useStore(state => state.videos.find(v => v.id === videoId));
  const allVideos = useStore(state => state.videos)
    .filter(v => v.courseId === courseId)
    .sort((a, b) => {
      const modA = a.moduleName || 'Uncategorized';
      const modB = b.moduleName || 'Uncategorized';
      if (modA !== modB) return modA.localeCompare(modB, undefined, { numeric: true, sensitivity: 'base' });
      return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
    });
  const updateProgress = useStore(state => state.updateVideoProgress);
  const addBookmark = useStore(state => state.addBookmark);
  const deleteBookmark = useStore(state => state.deleteBookmark);
  const editBookmark = useStore(state => state.editBookmark);
  const setTranscript = useStore(state => state.setTranscript);
  const updateVideoNotes = useStore(state => state.updateVideoNotes);
  const settings = useStore(state => state.settings);
  const updateSettings = useStore(state => state.updateSettings);
  
  const file = useTransientStore(state => state.files[videoId]);
  const setFile = useTransientStore(state => state.setFile);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'notes' | 'transcript'>('notes');
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notesMode, setNotesMode] = useState<'edit' | 'preview'>('edit');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Restore progress on mount and handle object URL
  useEffect(() => {
    let url: string | null = null;
    let isObjectURL = false;
    
    if (file) {
      url = URL.createObjectURL(file);
      isObjectURL = true;
    } else if (video && video.filePath) {
      url = `file://${video.filePath.replace(/\\/g, '/')}`; // Ensure slashes are correct for file URL
    }
    
    if (url) {
      setObjectUrl(url);
      
      // Set initial time once loaded
      const handleLoadedMetadata = () => {
        if (videoRef.current && video) {
          videoRef.current.currentTime = video.progress;
          videoRef.current.playbackRate = settings.playbackSpeed;
        }
      };
      
      const vNode = videoRef.current;
      vNode?.addEventListener('loadedmetadata', handleLoadedMetadata);
      
      return () => {
        vNode?.removeEventListener('loadedmetadata', handleLoadedMetadata);
        if (isObjectURL && url) {
          URL.revokeObjectURL(url);
        }
      };
    } else {
      setObjectUrl(null);
    }
  }, [file, videoId, video?.filePath]); // Depend on videoId to re-run when video changes

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = settings.playbackSpeed;
    }
  }, [settings.playbackSpeed, videoId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (!videoRef.current) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          if (videoRef.current.paused) videoRef.current.play();
          else videoRef.current.pause();
          break;
        case 'f':
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            videoRef.current.requestFullscreen();
          }
          break;
        case 'arrowleft':
          e.preventDefault();
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          break;
        case 'arrowright':
          e.preventDefault();
          videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      updateProgress(videoId, videoRef.current.currentTime, videoRef.current.duration);
    }
  };

  const handleEnded = () => {
    if (settings.autoPlayNext) {
      const currentIndex = allVideos.findIndex(v => v.id === videoId);
      if (currentIndex !== -1 && currentIndex < allVideos.length - 1) {
        setView({ type: 'player', courseId, videoId: allVideos[currentIndex + 1].id });
      }
    }
  };

  const handleAddBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (videoRef.current && noteText.trim()) {
      addBookmark(videoId, videoRef.current.currentTime, noteText);
      setNoteText('');
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  };

  const handleRelink = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(videoId, e.target.files[0]);
    }
  };

  const handleEditSubmit = (e: React.FormEvent, bmId: string) => {
    e.preventDefault();
    if (editingText.trim()) {
      editBookmark(videoId, bmId, editingText);
      setEditingBookmarkId(null);
    }
  };

  const handleGenerateTranscript = () => {
    setIsGeneratingTranscript(true);
    setTimeout(() => {
      let mockTranscript = `[00:00] Welcome to this lecture on ${video?.title}.\n\n`;
      mockTranscript += `[00:15] In this session, we will be covering the core concepts and practical applications related to this topic. Specifically, we'll dive deep into some advanced techniques.\n\n`;
      mockTranscript += `[01:30] As you can see from the examples, understanding the fundamentals is key. Let's look at how we can analyze the system. We often use tools like \`nmap\` and \`Wireshark\` for this process. They allow us to inspect the traffic dynamically.\n\n`;
      mockTranscript += `[03:45] To start the scan, you would typically run a command like this:\n\n\`\`\`bash\nnmap -sC -sV -p- 192.168.1.100\n\`\`\`\n\n`;
      mockTranscript += `[05:20] Moving on, we will discuss some common pitfalls. Once you've gathered the initial data, you might want to use a framework like \`Metasploit\` to test the vulnerabilities.\n\n`;
      mockTranscript += `[07:10] The exact command to launch the console is:\n\n\`\`\`bash\nmsfconsole -q\n\`\`\`\n\n`;
      mockTranscript += `[08:45] After getting your session, always ensure you maintain persistence if required by the engagement scope. We can use \`BloodHound\` to map out the Active Directory environment.\n\n`;
      mockTranscript += `[10:30] Here's how you might ingest the data:\n\n\`\`\`bash\nbloodhound-python -u username -p password -d domain.local -c All\n\`\`\`\n\n`;
      mockTranscript += `[12:15] To summarize, always remember to test your implementation thoroughly. \`mimikatz\` is another excellent utility you might find yourself using frequently for credential dumping.\n\n`;
      mockTranscript += `[14:50] Thank you for watching, and I'll see you in the next lesson. Make sure to practice these commands in your own lab environment.`;
      
      setTranscript(videoId, mockTranscript);
      setIsGeneratingTranscript(false);
    }, 2000);
  };

  const insertTimestamp = () => {
    if (videoRef.current && notesTextareaRef.current) {
      const timeStr = `[${formatTime(videoRef.current.currentTime)}]`;
      const textarea = notesTextareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentNotes = video?.notes || '';
      const newNotes = currentNotes.substring(0, start) + timeStr + currentNotes.substring(end);
      
      updateVideoNotes(videoId, newNotes);
      
      // Reset focus and selection
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + timeStr.length, start + timeStr.length);
      }, 0);
    }
  };

  if (!course || !video) return <div>Video not found</div>;

  return (
    <div className="flex h-full w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Main Player Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <div className="p-4 flex items-center justify-between shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm z-10 transition-colors">
          <button 
            onClick={() => setView({ type: 'course_detail', courseId })}
            className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold transition-colors bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 rounded-full text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {course.title}
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold transition-colors bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 rounded-full text-sm"
            >
              <SettingsIcon className="w-4 h-4 mr-2" />
              Playback Settings
            </button>
            {showSettings && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 z-50">
                <h3 className="font-bold text-slate-800 dark:text-white mb-3">Settings</h3>
                
                <div className="mb-4">
                  <label className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Playback Speed
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">{settings.playbackSpeed}x</span>
                  </label>
                  <div className="flex gap-2">
                    {[0.75, 1, 1.25, 1.5, 2].map(speed => (
                      <button
                        key={speed}
                        onClick={() => updateSettings({ playbackSpeed: speed })}
                        className={cn("flex-1 py-1 rounded text-xs font-bold transition-colors", settings.playbackSpeed === speed ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600")}
                      >
                        {speed}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
                  <label htmlFor="autoplay">Auto-play next video</label>
                  <input 
                    type="checkbox" 
                    id="autoplay"
                    checked={settings.autoPlayNext}
                    onChange={(e) => updateSettings({ autoPlayNext: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col p-8 max-w-6xl mx-auto w-full gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight transition-colors">{video.title}</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">{course.title}</p>
          </div>
          
          <div className="w-full aspect-video bg-slate-900 rounded-[32px] overflow-hidden shadow-xl relative flex items-center justify-center border border-slate-800">
            {objectUrl ? (
              <video
                key={videoId}
                ref={videoRef}
                src={objectUrl}
                autoPlay
                controls 
                className="w-full h-full"
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
              />
            ) : (
              <div className="text-center p-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 m-8">
                <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Local File Disconnected</h3>
                <p className="text-slate-300 max-w-md mx-auto mb-6">
                  Because this is a web application, local files must be re-linked when the page is reloaded to ensure security. 
                  <br/><br/>
                  Please select: <strong className="text-indigo-300 font-mono">{video.fileName}</strong>
                </p>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleRelink}
                  accept="video/*"
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-rose-500 text-white rounded-full font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200 flex items-center mx-auto"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Re-link Video File
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col min-h-[400px] transition-colors">
              <div className="flex gap-6 border-b border-slate-100 dark:border-slate-700 mb-6 transition-colors">
                <button 
                  onClick={() => setActiveTab('notes')}
                  className={cn("pb-4 font-bold text-lg transition-colors border-b-2", activeTab === 'notes' ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300")}
                >
                  <span className="flex items-center"><Edit2 className="w-5 h-5 mr-2" /> Notes</span>
                </button>
                <button 
                  onClick={() => setActiveTab('bookmarks')}
                  className={cn("pb-4 font-bold text-lg transition-colors border-b-2", activeTab === 'bookmarks' ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300")}
                >
                  <span className="flex items-center"><BookmarkIcon className="w-5 h-5 mr-2" /> Bookmarks</span>
                </button>
                <button 
                  onClick={() => setActiveTab('transcript')}
                  className={cn("pb-4 font-bold text-lg transition-colors border-b-2", activeTab === 'transcript' ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300")}
                >
                  <span className="flex items-center"><FileText className="w-5 h-5 mr-2" /> Transcript</span>
                </button>
              </div>

              {activeTab === 'notes' ? (
                <div className="flex flex-col flex-1 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setNotesMode('edit')}
                        className={cn("text-sm font-bold px-3 py-1.5 rounded-full transition-colors", notesMode === 'edit' ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => setNotesMode('preview')}
                        className={cn("text-sm font-bold px-3 py-1.5 rounded-full transition-colors", notesMode === 'preview' ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}
                      >
                        Preview
                      </button>
                    </div>
                    {notesMode === 'edit' && (
                      <button 
                        onClick={insertTimestamp}
                        className="text-xs font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors flex items-center"
                      >
                        <Clock className="w-3 h-3 mr-1" /> Insert Timestamp
                      </button>
                    )}
                  </div>
                  
                  {notesMode === 'edit' ? (
                    <textarea 
                      ref={notesTextareaRef}
                      value={video.notes || ''}
                      onChange={(e) => updateVideoNotes(videoId, e.target.value)}
                      placeholder="Start typing your notes here... You can use markdown like **bold**, *italic*, # headings, etc."
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-800 transition-all font-mono text-sm leading-relaxed text-slate-700 dark:text-slate-300 min-h-[300px] resize-y"
                    />
                  ) : (
                    <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 overflow-y-auto text-sm leading-relaxed text-slate-700 dark:text-slate-300 min-h-[300px] prose dark:prose-invert max-w-none prose-indigo">
                      {video.notes ? (
                        <ReactMarkdown>{video.notes}</ReactMarkdown>
                      ) : (
                        <p className="text-slate-400 italic">No notes written yet.</p>
                      )}
                    </div>
                  )}
                </div>
              ) : activeTab === 'bookmarks' ? (
                <>
                  <form onSubmit={handleAddBookmark} className="flex gap-4 mb-8">
                    <input 
                      type="text" 
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Add a bookmark for this timestamp..."
                      className="flex-1 bg-slate-100 dark:bg-slate-900 border-none text-slate-900 dark:text-slate-100 px-6 py-3 rounded-full focus:ring-2 focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none text-sm"
                      disabled={!objectUrl}
                    />
                    <button 
                      type="submit"
                      disabled={!objectUrl || !noteText.trim()}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-full font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      Save
                    </button>
                  </form>

                  <div className="space-y-4">
                    {video.bookmarks.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 border-dashed transition-colors">
                        No bookmarks added yet for this lecture.
                      </div>
                    ) : (
                      video.bookmarks.map(bm => (
                        <div key={bm.id} className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 p-5 rounded-2xl flex items-start group hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                          <button 
                            onClick={() => handleSeek(bm.time)}
                            className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 rounded-lg font-mono text-sm font-bold hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors mr-4 shrink-0 mt-0.5 shadow-sm"
                          >
                            {formatTime(bm.time)}
                          </button>
                          
                          {editingBookmarkId === bm.id ? (
                            <form className="flex-1 flex gap-2" onSubmit={(e) => handleEditSubmit(e, bm.id)}>
                              <input 
                                autoFocus
                                type="text"
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="flex-1 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-slate-900 dark:text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm transition-colors"
                              />
                              <button type="submit" className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"><Check className="w-4 h-4" /></button>
                              <button type="button" onClick={() => setEditingBookmarkId(null)} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                            </form>
                          ) : (
                            <>
                              <p className="flex-1 text-slate-700 dark:text-slate-300 font-medium leading-relaxed transition-colors">{bm.text}</p>
                              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all ml-2 gap-1">
                                <button 
                                  onClick={() => { setEditingBookmarkId(bm.id); setEditingText(bm.text); }}
                                  className="text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 w-8 h-8 rounded-full shadow-sm flex items-center justify-center p-1 transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => deleteBookmark(videoId, bm.id)}
                                  className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-white dark:hover:bg-slate-800 w-8 h-8 rounded-full shadow-sm flex items-center justify-center p-1 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col flex-1">
                   {video.transcript ? (
                      <div className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 overflow-y-auto font-mono text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap transition-colors prose prose-slate dark:prose-invert max-w-none">
                        <ReactMarkdown
                          components={{
                            code({node, inline, className, children, ...props}: any) {
                              const match = /language-(\w+)/.exec(className || '')
                              return !inline ? (
                                <div className="bg-slate-800 text-slate-50 p-4 rounded-xl my-4 overflow-x-auto text-sm font-mono shadow-inner">
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                </div>
                              ) : (
                                <code className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded-md font-bold text-sm" {...props}>
                                  {children}
                                </code>
                              )
                            }
                          }}
                        >
                          {video.transcript}
                        </ReactMarkdown>
                      </div>
                   ) : (
                      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 border-dashed p-8 text-center transition-colors">
                        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4 transition-colors" />
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2 transition-colors">No Transcript Available</h3>
                        <p className="text-slate-500 dark:text-slate-500 text-sm max-w-sm mb-6 transition-colors">Generate an automated transcript for this video to read along while you watch.</p>
                        <button 
                          onClick={handleGenerateTranscript}
                          disabled={isGeneratingTranscript}
                          className="px-6 py-3 bg-indigo-600 text-white rounded-full font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center"
                        >
                          {isGeneratingTranscript ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Wand2 className="w-5 h-5 mr-2" />}
                          {isGeneratingTranscript ? 'Generating...' : 'Auto-Generate Transcript'}
                        </button>
                      </div>
                   )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Playlist Sidebar */}
      <div className="w-80 bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 z-10 shadow-xl transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center bg-slate-50 dark:bg-slate-900 transition-colors">
          <List className="w-6 h-6 mr-3 text-indigo-500 dark:text-indigo-400 transition-colors" />
          <h2 className="font-black text-lg text-slate-800 dark:text-white transition-colors">Course Lessons</h2>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
          {allVideos.map((v, idx) => {
            const isPlaying = v.id === videoId;
            const progressPercent = v.duration > 0 ? (v.progress / v.duration) * 100 : 0;
            return (
              <div 
                key={v.id} 
                onClick={() => setView({ type: 'player', courseId, videoId: v.id })}
                className={cn(
                  "p-5 cursor-pointer transition-colors relative",
                  isPlaying ? "bg-indigo-50 dark:bg-indigo-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-900/50"
                )}
              >
                {isPlaying && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500 dark:bg-indigo-400 rounded-r-full transition-colors" />}
                <p className={cn("font-bold text-sm mb-2 transition-colors", isPlaying ? "text-indigo-900 dark:text-indigo-300" : "text-slate-700 dark:text-slate-300")}>
                  <span className="text-slate-400 dark:text-slate-500 mr-2 transition-colors">{idx + 1}.</span> {v.title}
                </p>
                <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-2 transition-colors">
                  <span>{formatTime(v.progress)} / {formatTime(v.duration)}</span>
                  {progressPercent >= 95 && <span className="text-emerald-500 dark:text-emerald-400 transition-colors">✓ Done</span>}
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden transition-colors">
                  <div className="h-full bg-amber-400 transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}
