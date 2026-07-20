import { useShallow } from 'zustand/react/shallow';
import React, { useEffect, useRef, useState } from 'react';
import { useStore, useTransientStore } from '../store';
import { ArrowLeft, Bookmark as BookmarkIcon, List, AlertCircle, Upload, Trash2, Edit2, FileText, Wand2, Loader2, Check, X, Settings as SettingsIcon, Play, Pause, Maximize, Clock, Folder, MessageSquare, BrainCircuit } from 'lucide-react';
import { formatTime, cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { runDesktopChat, runDesktopNotes } from '../utils/backendApi';

export default function VideoPlayer({ courseId, videoId }: { courseId: string, videoId: string }) {
  const setView = useStore(state => state.setView);
  const course = useStore(state => state.courses.find(c => c.id === courseId));
  const video = useStore(state => state.videos.find(v => v.id === videoId));
  const courseVideos = useStore(useShallow(state => state.videos.filter(v => v.courseId === courseId)));
  const settings = useStore(state => state.settings);
  const updateSettings = useStore(state => state.updateSettings);
  const updateProgress = useStore(state => state.updateVideoProgress);
  const addBookmark = useStore(state => state.addBookmark);
  const editBookmark = useStore(state => state.editBookmark);
  const deleteBookmark = useStore(state => state.deleteBookmark);
  const updateVideoNotes = useStore(state => state.updateVideoNotes);
  const updateVideoTranscript = useStore(state => state.updateVideoTranscript);
  const addFlashcard = useStore(state => state.addFlashcard);

  const { files, setFile, directoryHandle, aiEngine, initAiEngine, whisperEngine, isWhisperLoading, whisperLoadingProgress, initWhisperEngine, transcriptionStatuses } = useTransientStore();
  const file = files[videoId];

  const videoRef = useRef<HTMLVideoElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'bookmarks' | 'transcript' | 'ai'>('notes');
  const [notesMode, setNotesMode] = useState<'edit' | 'preview'>('edit');
  const [noteText, setNoteText] = useState('');
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isGeneratingAiNotes, setIsGeneratingAiNotes] = useState(false);

  const generateAiNotes = async () => {
    if (!video || !video.transcript) return;
    setIsGeneratingAiNotes(true);
    try {
      let notes = '';
      if (settings.useDesktopBackend) {
        notes = await runDesktopNotes(video.transcript, settings);
      } else {
        let engine = aiEngine;
        if (!engine) {
          await initAiEngine(settings.aiModel);
          engine = useTransientStore.getState().aiEngine;
        }
        if (!engine) throw new Error("Failed to initialize AI Engine.");
        
        const systemPrompt = "You are a professional study helper. Create detailed, structured study notes with bullet points from the transcript. Keep it organized.";
        const completion = await engine.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Transcript:\n${video.transcript}` }
          ]
        });
        notes = completion.choices[0].message.content || '';
      }
      
      updateVideoNotes(videoId, notes);
      setNotesMode('preview');
    } catch (err: any) {
      console.error(err);
      alert(`Failed to generate notes: ${err.message}`);
    } finally {
      setIsGeneratingAiNotes(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let url: string | null = null;
    let isObjectURL = false;
    let active = true;

    async function loadVideo() {
      if (file) {
        url = URL.createObjectURL(file);
        isObjectURL = true;
      } else if (directoryHandle && video && video.fileName) {
        try {
          if ((await (directoryHandle as any).queryPermission({ mode: 'read' })) !== 'granted') {
            setNeedsPermission(true);
            return;
          }
          
          async function findFileInDirectory(dirHandle: FileSystemDirectoryHandle, fileName: string): Promise<File | null> {
            for await (const entry of (dirHandle as any).values()) {
              if (entry.kind === 'file' && entry.name === fileName) {
                const fileHandle = await dirHandle.getFileHandle(entry.name);
                return await fileHandle.getFile();
              } else if (entry.kind === 'directory') {
                const nestedDirHandle = await dirHandle.getDirectoryHandle(entry.name);
                const result = await findFileInDirectory(nestedDirHandle, fileName);
                if (result) return result;
              }
            }
            return null;
          }
          const resolvedFile = await findFileInDirectory(directoryHandle, video.fileName);
          if (resolvedFile) {
            url = URL.createObjectURL(resolvedFile);
            isObjectURL = true;
            setFile(videoId, resolvedFile);
          } else {
            throw new Error("File not found");
          }
        } catch (e) {
          const cleanPath = video?.filePath?.replace(/\\/g, '/');
          if (cleanPath) {
            if (window.location.protocol === 'app:') {
              url = `app://-/local-file/${encodeURIComponent(video.filePath)}`;
            } else {
              url = `file:///${cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath}`;
            }
          }
        }
      } else if (video && video.filePath) {
        const cleanPath = video.filePath.replace(/\\/g, '/');
        if (window.location.protocol === 'app:') {
          url = `app://-/local-file/${encodeURIComponent(video.filePath)}`;
        } else {
          url = `file:///${cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath}`;
        }
      }
      
      if (!active) return;
      
      if (url) {
        setObjectUrl(url);
        const handleLoadedMetadata = () => {
          if (videoRef.current && video) {
            videoRef.current.currentTime = video.progress || 0;
            videoRef.current.playbackRate = settings?.playbackSpeed || 1;
          }
        };
        const vNode = videoRef.current;
        vNode?.addEventListener('loadedmetadata', handleLoadedMetadata);
        return () => {
          vNode?.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
      } else {
        setObjectUrl(null);
      }
    }
    
    loadVideo();
    
    return () => {
      active = false;
      if (isObjectURL && url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file, videoId, video?.filePath, directoryHandle]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = settings?.playbackSpeed || 1;
    }
  }, [settings?.playbackSpeed, videoId]);

  const handleTimeUpdate = () => {
    if (videoRef.current && video) {
      updateProgress(videoId, videoRef.current.currentTime, videoRef.current.duration);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  };

  const insertTimestamp = () => {
    if (videoRef.current && notesTextareaRef.current) {
      const time = formatTime(videoRef.current.currentTime);
      const text = notesTextareaRef.current.value;
      const cursorPosition = notesTextareaRef.current.selectionStart;
      
      const newText = text.substring(0, cursorPosition) + ` [${time}] ` + text.substring(cursorPosition);
      updateVideoNotes(videoId, newText);
      
      setTimeout(() => {
        if (notesTextareaRef.current) {
          notesTextareaRef.current.focus();
          const newPos = cursorPosition + time.length + 3;
          notesTextareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    }
  };

  const handleAddBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (noteText.trim() && videoRef.current) {
      addBookmark(videoId, videoRef.current.currentTime, noteText.trim());
      setNoteText('');
    }
  };

  const handleEditSubmit = (e: React.FormEvent, bmId: string) => {
    e.preventDefault();
    if (editingText.trim()) {
      editBookmark(videoId, bmId, editingText);
      setEditingBookmarkId(null);
    }
  };

  const handleRelink = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(videoId, e.target.files[0]);
    }
  };

  const getDynamicLimits = () => {
    try {
      const contextSize = useTransientStore.getState().getOptimalContextSize(settings.aiModel);
      const transcriptLimit = Math.max(1500, Math.floor(contextSize * 0.50 * 4));
      const notesLimit = Math.max(800, Math.floor(contextSize * 0.20 * 4));
      return { transcriptLimit, notesLimit };
    } catch {
      return { transcriptLimit: 3000, notesLimit: 1000 };
    }
  };

  
  const generateFlashcards = async () => {
    setIsAiLoading(true);
    setAiResponse('Generating flashcards...');
    
    try {
      const { transcriptLimit, notesLimit } = getDynamicLimits();
      const userContent = `You are an AI Study Assistant.
Generate 3-5 high-quality flashcards based on the provided notes and transcript.
Return ONLY a JSON array of objects, where each object has a "front" (question) and a "back" (answer).
No markdown codeblocks, just the raw JSON.

Context Transcript:
${video?.transcript ? video.transcript.substring(0, transcriptLimit) : 'No transcript available.'}

User Notes:
${video?.notes ? video.notes.substring(0, notesLimit) : 'No notes available.'}`;

      let text = '';
      if (settings.useDesktopBackend) {
        text = await runDesktopChat([{ role: 'user', content: userContent }], 'You are an AI Study Assistant.', settings);
      } else {
        let engine = aiEngine;
        if (!engine) {
          await initAiEngine(settings.aiModel);
          engine = useTransientStore.getState().aiEngine;
        }
        if (!engine) throw new Error("Failed to initialize AI Engine.");

        const completion = await engine.chat.completions.create({
          messages: [{
            role: 'user',
            content: userContent
          }]
        });
        text = completion.choices[0].message.content || "[]";
      }

      text = text.replace(/^\`\`\`json/g, "").replace(/^\`\`\`/g, "").replace(/\`\`\`$/g, "").trim();
      
      try {
        const flashcardsData = JSON.parse(text);
        
        let newCardsCount = 0;
        if (flashcardsData && Array.isArray(flashcardsData)) {
          flashcardsData.forEach((card: any) => {
            if (card.front && card.back) {
              addFlashcard({
                front: card.front,
                back: card.back,
                sourceVideoId: videoId,
                sourceTimestampMs: videoRef.current?.currentTime
              });
              newCardsCount++;
            }
          });
          setAiResponse(`Successfully generated ${newCardsCount} flashcards! You can review them in the Flashcards tab.`);
        } else {
          setAiResponse("Failed to generate flashcards format.");
        }
      } catch (parseError) {
        console.error("Failed to parse flashcards JSON:", parseError);
        setAiResponse(`AI Response: ${text}`);
      }
    } catch (error: any) {
      console.error(error);
      if (!settings.useDesktopBackend) {
        useTransientStore.getState().handleAiError(error);
      }
      setAiResponse(`Failed to generate flashcards: ${error.message}. If using Python Backend, verify local server is running.`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const summarizeVideo = async () => {
    setIsAiLoading(true);
    setAiResponse('Summarizing video...');
    
    try {
      const { transcriptLimit, notesLimit } = getDynamicLimits();
      const userContent = `You are an AI Study Assistant.
Please provide a comprehensive summary of the following video transcript and notes.
Structure the summary with a short introduction, key takeaways (bullet points), and a brief conclusion.

Context Transcript:
${video?.transcript ? video.transcript.substring(0, transcriptLimit) : 'No transcript available.'}

User Notes:
${video?.notes ? video.notes.substring(0, notesLimit) : 'No notes available.'}`;

      let text = '';
      if (settings.useDesktopBackend) {
        text = await runDesktopChat([{ role: 'user', content: userContent }], 'You are an AI Study Assistant.', settings);
      } else {
        let engine = aiEngine;
        if (!engine) {
          await initAiEngine(settings.aiModel);
          engine = useTransientStore.getState().aiEngine;
        }
        if (!engine) throw new Error("Failed to initialize AI Engine.");

        const completion = await engine.chat.completions.create({
          messages: [{
            role: 'user',
            content: userContent
          }]
        });
        text = completion.choices[0].message.content || '';
      }

      setAiResponse(text);
    } catch (error: any) {
      console.error(error);
      if (!settings.useDesktopBackend) {
        useTransientStore.getState().handleAiError(error);
      }
      setAiResponse(`Failed to summarize video: ${error.message}. If using Python Backend, verify local server is running.`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const generateQuiz = async () => {
    setIsAiLoading(true);
    setAiResponse('Generating quiz...');
    
    try {
      const { transcriptLimit, notesLimit } = getDynamicLimits();
      const userContent = `You are an AI Study Assistant.
Generate a short 3-question multiple-choice quiz based on the provided notes and transcript.
Provide the questions, options (A, B, C, D), and the correct answers clearly at the end.

Context Transcript:
${video?.transcript ? video.transcript.substring(0, transcriptLimit) : 'No transcript available.'}

User Notes:
${video?.notes ? video.notes.substring(0, notesLimit) : 'No notes available.'}`;

      let text = '';
      if (settings.useDesktopBackend) {
        text = await runDesktopChat([{ role: 'user', content: userContent }], 'You are an AI Study Assistant.', settings);
      } else {
        let engine = aiEngine;
        if (!engine) {
          await initAiEngine(settings.aiModel);
          engine = useTransientStore.getState().aiEngine;
        }
        if (!engine) throw new Error("Failed to initialize AI Engine.");

        const completion = await engine.chat.completions.create({
          messages: [{
            role: 'user',
            content: userContent
          }]
        });
        text = completion.choices[0].message.content || '';
      }

      setAiResponse(text);
    } catch (error: any) {
      console.error(error);
      if (!settings.useDesktopBackend) {
        useTransientStore.getState().handleAiError(error);
      }
      setAiResponse(`Failed to generate quiz: ${error.message}. If using Python Backend, verify local server is running.`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const askAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    setIsAiLoading(true);
    setAiResponse('');
    
    try {
      const { transcriptLimit, notesLimit } = getDynamicLimits();
      const userContent = `You are an AI Study Assistant.
Answer the user's question based on the provided notes and transcript.
If the answer is not in the context, say "I couldn't find that in the notes or transcript."

Context Transcript:
${video?.transcript ? video.transcript.substring(0, transcriptLimit) : 'No transcript available.'}

User Notes:
${video?.notes ? video.notes.substring(0, notesLimit) : 'No notes available.'}

User Question: ${aiQuery}`;

      let text = '';
      if (settings.useDesktopBackend) {
        text = await runDesktopChat([{ role: 'user', content: userContent }], 'You are an AI Study Assistant.', settings);
      } else {
        let engine = aiEngine;
        if (!engine) {
          await initAiEngine(settings.aiModel);
          engine = useTransientStore.getState().aiEngine;
        }
        if (!engine) throw new Error("Failed to initialize AI Engine.");
        
        const completion = await engine.chat.completions.create({
          messages: [{
            role: 'user',
            content: userContent
          }]
        });
        text = completion.choices[0].message.content || '';
      }

      setAiResponse(text);
    } catch (error: any) {
      console.error(error);
      if (!settings.useDesktopBackend) {
        useTransientStore.getState().handleAiError(error);
      }
      setAiResponse(`Failed to ask AI: ${error.message}. If using Python Backend, verify local server is running.`);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (!course || !video) return <div>Video not found</div>;

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <button onClick={() => setView({ type: 'course_detail', courseId })} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold truncate">{video.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{course.title}</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="bg-black aspect-video relative flex items-center justify-center">
            {needsPermission && directoryHandle ? (
              <div className="text-center p-8 flex flex-col items-center">
                <AlertCircle className="w-16 h-16 text-amber-500 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Folder Access Required</h3>
                <p className="text-slate-400 max-w-md mx-auto mb-8">
                  For security reasons, your browser requires you to grant access to the course folder again to play videos.
                </p>
                <button 
                  onClick={async () => {
                    try {
                      if ((await (directoryHandle as any).requestPermission({ mode: 'read' })) === 'granted') {
                        setNeedsPermission(false);
                        setView({ type: "player", courseId, videoId });
                      }
                    } catch(e) { console.error(e); }
                  }}
                  className="px-6 py-3 bg-indigo-500 text-white rounded-full font-bold hover:bg-indigo-600 transition-colors shadow-lg flex items-center"
                >
                  <Folder className="w-5 h-5 mr-2" />
                  Grant Access
                </button>
              </div>
            ) : objectUrl ? (
              <video 
                ref={videoRef}
                src={objectUrl}
                className="w-full h-full"
                controls
                onRateChange={(e) => {
                  const rate = (e.target as HTMLVideoElement).playbackRate;
                  if (rate !== (settings?.playbackSpeed || 1)) {
                    updateSettings({ playbackSpeed: rate });
                  }
                }}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => {
                  if (settings.autoPlayNext) {
                    const currentIndex = courseVideos.findIndex(v => v.id === videoId);
                    if (currentIndex !== -1 && currentIndex < courseVideos.length - 1) {
                      setView({ type: 'player', courseId, videoId: courseVideos[currentIndex + 1].id });
                    }
                  }
                }}
              />
            ) : (
              <div className="text-center p-8 flex flex-col items-center">
                <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Video File Missing</h3>
                <p className="text-slate-400 max-w-md mx-auto mb-8">
                  The original file for <strong className="text-indigo-300 font-mono">{video.fileName}</strong> could not be found. 
                  If you moved or renamed it, please re-link it.
                </p>
                <input type="file" ref={fileInputRef} onChange={handleRelink} accept="video/*" className="hidden" />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-rose-500 text-white rounded-full font-bold hover:bg-rose-600 transition-colors shadow-lg flex items-center"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Re-link Video File
                </button>
                <button 
                  onClick={async () => {
                    try {
                      const handle = await (window as any).showDirectoryPicker();
                      useTransientStore.getState().setDirectoryHandle(handle);
                      // reload trigger
                      setView({ type: "player", courseId, videoId });
                    } catch(e) { console.error(e); }
                  }}
                  className="px-6 py-3 bg-indigo-500 text-white rounded-full font-bold hover:bg-indigo-600 transition-colors shadow-lg mt-4 flex items-center"
                >
                  <Folder className="w-5 h-5 mr-2" />
                  Link Course Folder

                </button>
              </div>
            )}
          </div>
        </div>

        <div className="w-[450px] bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col shrink-0">
          <div className="flex px-4 pt-4 border-b border-slate-200 dark:border-slate-700 gap-6 shrink-0">
            <button onClick={() => setActiveTab('notes')} className={cn("pb-4 font-bold text-lg transition-colors border-b-2", activeTab === 'notes' ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-600")}>
              <span className="flex items-center"><Edit2 className="w-5 h-5 mr-2" /> Notes</span>
            </button>
            <button onClick={() => setActiveTab('bookmarks')} className={cn("pb-4 font-bold text-lg transition-colors border-b-2", activeTab === 'bookmarks' ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-600")}>
              <span className="flex items-center"><BookmarkIcon className="w-5 h-5 mr-2" /> Bookmarks</span>
            </button>
            <button onClick={() => setActiveTab('transcript')} className={cn("pb-4 font-bold text-lg transition-colors border-b-2", activeTab === 'transcript' ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-600")}>
              <span className="flex items-center"><FileText className="w-5 h-5 mr-2" /> Transcript</span>
            </button>
            <button onClick={() => setActiveTab('ai')} className={cn("pb-4 font-bold text-lg transition-colors border-b-2", activeTab === 'ai' ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-600")}>
              <span className="flex items-center"><Wand2 className="w-5 h-5 mr-2" /> AI</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col">
            {activeTab === 'notes' ? (
              <div className="flex flex-col flex-1 gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setNotesMode('edit')} className={cn("text-sm font-bold px-3 py-1.5 rounded-full transition-colors", notesMode === 'edit' ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}>Edit</button>
                    <button onClick={() => setNotesMode('preview')} className={cn("text-sm font-bold px-3 py-1.5 rounded-full transition-colors", notesMode === 'preview' ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}>Preview</button>
                  </div>
                  {notesMode === 'edit' && (
                    <div className="flex items-center gap-2">
                      {video?.transcript && (
                        <button 
                          onClick={generateAiNotes}
                          disabled={isGeneratingAiNotes}
                          className="text-xs font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-full hover:bg-emerald-200 transition-colors flex items-center disabled:opacity-50"
                          title="Generate structured study notes from the video transcript"
                        >
                          {isGeneratingAiNotes ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />}
                          Generate AI Notes
                        </button>
                      )}
                      <button onClick={insertTimestamp} className="text-xs font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-full hover:bg-indigo-200 transition-colors flex items-center">
                        <Clock className="w-3 h-3 mr-1" /> Insert Timestamp
                      </button>
                    </div>
                  )}
                </div>
                {notesMode === 'edit' ? (
                  <textarea 
                    ref={notesTextareaRef}
                    value={video.notes || ''}
                    onChange={(e) => updateVideoNotes(videoId, e.target.value)}
                    placeholder="Start typing your notes here..."
                    className="flex-1 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 outline-none focus:ring-2 focus:ring-indigo-400 transition-all font-mono text-sm leading-relaxed resize-y"
                  />
                ) : (
                  <div className="flex-1 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 overflow-y-auto text-sm leading-relaxed prose dark:prose-invert max-w-none">
                    {video.notes ? <ReactMarkdown>{video.notes}</ReactMarkdown> : <p className="text-slate-400 italic">No notes written yet.</p>}
                  </div>
                )}
              </div>
            ) : activeTab === 'bookmarks' ? (
              <>
                <form onSubmit={handleAddBookmark} className="flex gap-4 mb-8">
                  <input type="text" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add bookmark..." className="flex-1 bg-slate-100 dark:bg-slate-900 px-6 py-3 rounded-full outline-none text-sm" disabled={!objectUrl}/>
                  <button type="submit" disabled={!objectUrl || !noteText.trim()} className="px-6 py-3 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 disabled:opacity-50">Save</button>
                </form>
                <div className="space-y-4">
                  {Math.max((video.bookmarks || []).length, 0) === 0 ? (
                    <div className="text-center py-8 text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-2xl">No bookmarks added yet.</div>
                  ) : (
                    (video.bookmarks || []).map(bm => (
                      <div key={bm.id} className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl flex items-start group">
                        <button onClick={() => handleSeek(bm.time)} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg font-mono text-sm font-bold mr-4">{formatTime(bm.time)}</button>
                        {editingBookmarkId === bm.id ? (
                          <form className="flex-1 flex gap-2" onSubmit={(e) => handleEditSubmit(e, bm.id)}>
                            <input autoFocus type="text" value={editingText} onChange={(e) => setEditingText(e.target.value)} className="flex-1 bg-white border border-indigo-200 px-4 py-2 rounded-lg outline-none text-sm"/>
                            <button type="submit" className="p-2 text-emerald-600"><Check className="w-4 h-4" /></button>
                            <button type="button" onClick={() => setEditingBookmarkId(null)} className="p-2 text-slate-500"><X className="w-4 h-4" /></button>
                          </form>
                        ) : (
                          <>
                            <p className="flex-1 text-slate-700 dark:text-slate-300">{bm.text}</p>
                            <div className="flex items-center opacity-0 group-hover:opacity-100 ml-2 gap-1">
                              <button onClick={() => { setEditingBookmarkId(bm.id); setEditingText(bm.text); }} className="p-2 text-slate-500 hover:bg-slate-200 rounded-full"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => deleteBookmark(videoId, bm.id)} className="p-2 text-rose-500 hover:bg-rose-100 rounded-full"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : activeTab === 'transcript' ? (
              <div className="flex flex-col h-full gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-700 dark:text-slate-200">Video Transcript</h3>
                  <div className="flex items-center gap-2">
                    {isWhisperLoading && <span className="text-xs text-indigo-600 font-medium">{whisperLoadingProgress}</span>}
                    {transcriptionStatuses[videoId] && <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full animate-pulse">{transcriptionStatuses[videoId]}</span>}
                    <button 
                      onClick={async () => {
                        setIsAiLoading(true);
                        try {
                          const file = files[videoId];
                          if (!file) {
                            alert("Video file not loaded in memory. Please reselect the course directory or video to access the raw file.");
                            setIsAiLoading(false);
                            return;
                          }
                          
                          updateVideoTranscript(videoId, "Extracting audio and generating transcript in background... This may take a while.");
                          await useTransientStore.getState().transcribeVideo(videoId, file);
                        } catch(e) {
                          console.error(e);
                          alert("Could not generate transcript. Check console for details.");
                          updateVideoTranscript(videoId, "Error generating transcript.");
                        } finally {
                          setIsAiLoading(false);
                        }
                      }}
                      disabled={isAiLoading || isWhisperLoading}
                      className="text-xs font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-full hover:bg-indigo-200 transition-colors flex items-center disabled:opacity-50"
                    >
                      {(isAiLoading || isWhisperLoading) ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />} 
                      Auto-Generate (Whisper)
                    </button>
                  </div>
                </div>
                <textarea 
                  value={video.transcript || ''}
                  onChange={(e) => updateVideoTranscript(videoId, e.target.value)}
                  placeholder="Paste video transcript here... This helps the AI assistant understand the video content better."
                  className="flex-1 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 outline-none focus:ring-2 focus:ring-indigo-400 transition-all font-mono text-sm leading-relaxed resize-none"
                />
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto mb-4 bg-slate-50 dark:bg-slate-900 rounded-2xl p-6">
                  {aiResponse ? (
                    <div className="prose dark:prose-invert max-w-none">
                      <ReactMarkdown>{aiResponse}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <Wand2 className="w-12 h-12 mb-4 opacity-50" />
                      
                      <p>Ask anything about this video.</p>
                      <p className="text-sm">I'll use your notes and transcript to answer.</p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                        <button 
                          onClick={generateFlashcards}
                          disabled={isAiLoading}
                          className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-200 transition-colors flex items-center justify-center"
                        >
                          <BrainCircuit className="w-4 h-4 mr-2" />
                          Auto-Generate Flashcards
                        </button>
                        <button 
                          onClick={summarizeVideo}
                          disabled={isAiLoading}
                          className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold hover:bg-emerald-200 transition-colors flex items-center justify-center"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Summarize Video
                        </button>
                        <button 
                          onClick={generateQuiz}
                          disabled={isAiLoading}
                          className="px-4 py-2 bg-rose-100 text-rose-700 rounded-lg text-sm font-bold hover:bg-rose-200 transition-colors flex items-center justify-center"
                        >
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Practice Quiz
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <form onSubmit={askAi} className="flex gap-2">
                  <input 
                    type="text" 
                    value={aiQuery} 
                    onChange={e => setAiQuery(e.target.value)} 
                    placeholder="E.g., Summarize this lecture..." 
                    className="flex-1 bg-slate-100 dark:bg-slate-900 border-none text-slate-900 dark:text-slate-100 px-6 py-3 rounded-full outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  />
                  <button type="submit" disabled={!aiQuery.trim() || isAiLoading} className="px-6 py-3 bg-indigo-600 text-white rounded-full font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 disabled:opacity-50 flex items-center">
                    {isAiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
