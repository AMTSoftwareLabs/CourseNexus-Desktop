import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Course, Video, Bookmark, ViewState, Settings, Flashcard } from './types';

interface AppState {
  view: ViewState;
  courses: Course[];
  videos: Video[];
  flashcards: Flashcard[];
  settings: Settings;
  
  // Actions
  setView: (view: ViewState) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  addCourse: (course: Omit<Course, 'id' | 'createdAt'>) => string;
  deleteCourse: (id: string) => void;
  addVideo: (video: Omit<Video, 'id' | 'createdAt' | 'progress' | 'duration' | 'bookmarks'>) => string;
  deleteVideo: (id: string) => void;
  updateVideoProgress: (id: string, progress: number, duration: number) => void;
  addBookmark: (videoId: string, time: number, text: string) => void;
  editBookmark: (videoId: string, bookmarkId: string, text: string) => void;
  deleteBookmark: (videoId: string, bookmarkId: string) => void;
  setTranscript: (videoId: string, transcript: string) => void;
  updateVideoNotes: (videoId: string, notes: string) => void;
  updateVideoTranscript: (videoId: string, transcript: string) => void;
  addFlashcard: (card: Omit<Flashcard, "id" | "easeFactor" | "intervalDays" | "repetitionCount" | "nextReviewDate">) => void;
  updateFlashcardProgress: (id: string, quality: number) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      view: { type: 'dashboard' },
      courses: [],
      videos: [],
      flashcards: [],
      settings: {
        darkMode: false,
        playbackSpeed: 1,
        autoPlayNext: true,
        aiModel: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
        gpuNameOverride: '',
        ramGbOverride: 0,
        gpuTierOverride: 'auto',
        contextSizeOverride: 0,
        useDesktopBackend: false,
        desktopBackendUrl: 'http://localhost:8000',
      },

      setView: (view) => set({ view }),
      updateSettings: (newSettings) => set((state) => ({ settings: { ...state.settings, ...newSettings } })),

      addCourse: (course) => {
        const id = crypto.randomUUID();
        set((state) => ({
          courses: [
            ...state.courses,
            {
              ...course,
              id,
              createdAt: Date.now(),
            },
          ],
        }));
        return id;
      },

      deleteCourse: (id) => set((state) => ({
        courses: state.courses.filter((c) => c.id !== id),
        videos: state.videos.filter((v) => v.courseId !== id),
      })),

      addVideo: (video) => {
        const id = crypto.randomUUID();
        set((state) => ({
          videos: [
            ...state.videos,
            {
              ...video,
              id,
              progress: 0,
              duration: 0,
              bookmarks: [],
              createdAt: Date.now(),
            },
          ],
        }));
        return id;
      },

      deleteVideo: (id) => set((state) => ({
        videos: state.videos.filter((v) => v.id !== id),
      })),

      updateVideoProgress: (id, progress, duration) => set((state) => ({
        videos: state.videos.map((v) => 
          v.id === id ? { ...v, progress, duration: duration || v.duration } : v
        ),
      })),

      addBookmark: (videoId, time, text) => set((state) => ({
        videos: state.videos.map((v) =>
          v.id === videoId
            ? {
                ...v,
                bookmarks: [
                  ...v.bookmarks,
                  { id: crypto.randomUUID(), time, text },
                ].sort((a, b) => a.time - b.time),
              }
            : v
        ),
      })),

      editBookmark: (videoId, bookmarkId, text) => set((state) => ({
        videos: state.videos.map((v) =>
          v.id === videoId
            ? {
                ...v,
                bookmarks: v.bookmarks.map((b) => b.id === bookmarkId ? { ...b, text } : b),
              }
            : v
        ),
      })),

      deleteBookmark: (videoId, bookmarkId) => set((state) => ({
        videos: state.videos.map((v) =>
          v.id === videoId
            ? {
                ...v,
                bookmarks: v.bookmarks.filter((b) => b.id !== bookmarkId),
              }
            : v
        ),
      })),

      setTranscript: (videoId, transcript) => set((state) => ({
        videos: state.videos.map((v) =>
          v.id === videoId ? { ...v, transcript } : v
        ),
      })),

      updateVideoTranscript: (videoId, transcript) => set((state) => ({
        videos: state.videos.map((v) =>
          v.id === videoId ? { ...v, transcript } : v
        ),
      })),
      updateVideoNotes: (videoId, notes) => set((state) => ({
        videos: state.videos.map((v) =>
          v.id === videoId ? { ...v, notes } : v
        ),
      })),
      addFlashcard: (card) => set((state) => ({
        flashcards: [
          ...state.flashcards,
          {
            ...card,
            id: crypto.randomUUID(),
            easeFactor: 2.5,
            intervalDays: 1,
            repetitionCount: 0,
            nextReviewDate: Date.now()
          }
        ]
      })),
      updateFlashcardProgress: (id, quality) => set((state) => ({
        flashcards: state.flashcards.map(card => {
          if (card.id !== id) return card;
          // SM-2 Algorithm
          let { easeFactor, intervalDays, repetitionCount } = card;
          if (quality >= 3) {
            if (repetitionCount === 0) {
              intervalDays = 1;
            } else if (repetitionCount === 1) {
              intervalDays = 6;
            } else {
              intervalDays = Math.round(intervalDays * easeFactor);
            }
            repetitionCount += 1;
          } else {
            repetitionCount = 0;
            intervalDays = 1;
          }
          easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
          if (easeFactor < 1.3) easeFactor = 1.3;
          
          return {
            ...card,
            easeFactor,
            intervalDays,
            repetitionCount,
            nextReviewDate: Date.now() + intervalDays * 24 * 60 * 60 * 1000
          };
        })
      })),
    }),
    {
      name: 'local-course-tracker-storage',
      partialize: (state) => ({ courses: state.courses, videos: state.videos, flashcards: state.flashcards, settings: state.settings }), // Only persist data, not view state
      merge: (persistedState: any, currentState) => {
        return {
          ...currentState,
          ...persistedState,
          videos: (persistedState?.videos || []).map((v: any) => ({
            progress: 0,
            duration: 0,
            bookmarks: [],
            notes: '',
            transcript: '',
            ...v
          })),
          settings: {
            ...currentState.settings,
            ...(persistedState?.settings || {})
          }
        };
      }
    }
  )
);

import type { MLCEngine } from "@mlc-ai/web-llm";
import { detectSystemHardware, calculateOptimization } from "./utils/hardware";

interface TransientState {
  files: Record<string, File>;
  setFile: (videoId: string, file: File) => void;
  directoryHandle: FileSystemDirectoryHandle | null;
  setDirectoryHandle: (handle: FileSystemDirectoryHandle | null) => void;
  loadDirectoryHandle: () => Promise<void>;
  
  aiEngine: MLCEngine | null;
  aiLoadingProgress: string;
  isAiLoading: boolean;
  initAiEngine: (modelId: string) => Promise<void>;
  handleAiError: (error: any) => void;

  // Hardware Status and Profiler
  detectedGpu: string;
  detectedRam: number;
  isWebGpuSupported: boolean;
  isHardwareChecking: boolean;
  detectHardware: () => Promise<void>;
  getOptimalContextSize: (modelId: string) => number;
  
  whisperEngine: any;
  isWhisperLoading: boolean;
  whisperLoadingProgress: string;
  initWhisperEngine: () => Promise<void>;
  
  transcriptionStatuses: Record<string, string>;
  
  transcribeVideo: (videoId: string, file: File) => Promise<boolean>;
  queueTranscription: (videoId: string, file: File) => void;

  // Fail-proof Transcription Queue Reactivity
  isTranscribingQueue: boolean;
  transcriptionQueue: { videoId: string, file: File }[];
  processTranscriptionQueue: () => Promise<void>;
  resetTranscriptionQueue: () => void;
}

let whisperWorkerInstance: Worker | null = null;
let whisperInitPromise: Promise<void> | null = null;
const transcriptionPromises = new Map<string, { resolve: (val: boolean) => void, reject: (err: any) => void }>();

// Store for actual File objects which cannot be persisted in localStorage
export const useTransientStore = create<TransientState>((set, get) => ({
  files: {},
  setFile: (videoId, file) => set((state) => ({
    files: { ...state.files, [videoId]: file }
  })),
  directoryHandle: null,
  
  isTranscribingQueue: false,
  transcriptionQueue: [],
  
  aiEngine: null,
  aiLoadingProgress: '',
  isAiLoading: false,
  
  detectedGpu: '',
  detectedRam: 8,
  isWebGpuSupported: false,
  isHardwareChecking: false,

  detectHardware: async () => {
    if (get().detectedGpu) return; // Check once
    set({ isHardwareChecking: true });
    try {
      const result = await detectSystemHardware();
      set({
        detectedGpu: result.detectedGpu,
        detectedRam: result.detectedRam,
        isWebGpuSupported: result.isWebGpuSupported,
        isHardwareChecking: false
      });
    } catch (e) {
      console.error("Hardware detection error:", e);
      set({ isHardwareChecking: false });
    }
  },

  getOptimalContextSize: (modelId: string) => {
    const settings = useStore.getState().settings;
    if (settings.contextSizeOverride && settings.contextSizeOverride > 0) {
      return settings.contextSizeOverride;
    }
    
    const activeGpu = settings.gpuNameOverride || get().detectedGpu;
    const activeRam = settings.ramGbOverride || get().detectedRam;
    const stats = calculateOptimization(activeGpu, activeRam, settings.gpuTierOverride);
    
    // Safety cap for heavy models like 8B on medium/lower cards
    if (modelId.toLowerCase().includes('8b')) {
      return Math.min(stats.optimalContextSize, 2048);
    }
    return stats.optimalContextSize;
  },
  
  transcriptionStatuses: {},
  initAiEngine: async (modelId: string) => {
    set({ isAiLoading: true, aiLoadingProgress: 'Initializing engine...' });
    try {
      const existingEngine = get().aiEngine;
      if (existingEngine) {
        try {
          set({ aiLoadingProgress: 'Unloading existing model...' });
          await existingEngine.unload();
        } catch (unloadErr) {
          console.error("Error unloading previous AI engine:", unloadErr);
        }
      }

      // Ensure we have detected hardware
      await get().detectHardware();
      const contextSize = get().getOptimalContextSize(modelId);
      console.log(`[AI Optimizer] Initializing model ${modelId} with context window: ${contextSize}`);

      const { CreateMLCEngine, prebuiltAppConfig } = await import("@mlc-ai/web-llm");
      const appConfig = { ...prebuiltAppConfig };
      appConfig.model_list = appConfig.model_list.map(m => m.model_id === modelId ? { ...m, overrides: { context_window_size: contextSize } } : m);

      const engine = await CreateMLCEngine(modelId, { appConfig,
        initProgressCallback: (progress) => {
          set({ aiLoadingProgress: progress.text });
        }
      });
      set({ aiEngine: engine, isAiLoading: false, aiLoadingProgress: 'Ready' });
    } catch (e) {
      console.error("Failed to load AI engine", e);
      set({ isAiLoading: false, aiLoadingProgress: 'Failed to load' });
    }
  },

  handleAiError: (error: any) => {
    const errorMsg = error?.message || String(error);
    console.error("AI Error occurred:", errorMsg);
    if (errorMsg.includes("lost") || errorMsg.includes("disposed") || errorMsg.includes("GPU") || errorMsg.includes("memory") || errorMsg.includes("device")) {
      console.warn("WebGPU Device Lost or Object Disposed. Resetting AI Engine state.");
      set({ aiEngine: null, aiLoadingProgress: 'Engine crashed (Device Lost). Try reloading with a less resource-intensive model.' });
    }
  },

  whisperEngine: null,
  isWhisperLoading: false,
  whisperLoadingProgress: '',
  initWhisperEngine: () => {
    if (whisperInitPromise) return whisperInitPromise;
    if (whisperWorkerInstance) return Promise.resolve();
    
    whisperInitPromise = new Promise<void>((resolve, reject) => {
      set({ isWhisperLoading: true, whisperLoadingProgress: 'Loading transcription model...' });
      try {
        whisperWorkerInstance = new Worker(new URL('./workers/whisper.worker.ts', import.meta.url), {
          type: 'module'
        });
        
        whisperWorkerInstance.onmessage = (e) => {
          const { type, info, error, output, id } = e.data;
          if (type === 'progress') {
            if (info.status === 'progress') {
              useTransientStore.setState({ whisperLoadingProgress: `Downloading model... ${Math.round(info.progress || 0)}%` });
            } else if (info.status === 'init') {
              useTransientStore.setState({ whisperLoadingProgress: 'Initializing model...' });
            }
          } else if (type === 'ready') {
            useTransientStore.setState({ isWhisperLoading: false, whisperLoadingProgress: 'Ready', whisperEngine: whisperWorkerInstance });
            resolve();
          } else if (type === 'error') {
            console.error("Whisper worker error:", error);
            if (id && transcriptionPromises.has(id)) {
              transcriptionPromises.get(id)!.reject(new Error(error));
              transcriptionPromises.delete(id);
            } else {
              useTransientStore.setState({ isWhisperLoading: false, whisperLoadingProgress: 'Failed to load' });
              whisperInitPromise = null;
              reject(new Error(error));
            }
          } else if (type === 'result') {
            if (id && transcriptionPromises.has(id)) {
              console.log("Worker output:", output); if (output && Array.isArray(output.chunks) && output.chunks.length > 0) {
                const formatTime = (seconds: number) => {
                  if (seconds === undefined || seconds === null || isNaN(seconds)) seconds = 0;
                  const h = Math.floor(seconds / 3600);
                  const m = Math.floor((seconds % 3600) / 60);
                  const s = Math.floor(seconds % 60);
                  if (h > 0) return `[${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}]`;
                  return `[${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}]`;
                };
                const formatted = output.chunks.map((c: any) => { const ts = Array.isArray(c.timestamp) ? c.timestamp[0] : (typeof c.timestamp === 'number' ? c.timestamp : 0); return `${formatTime(ts)} ${c.text || ""}` }).join('\n');
                useStore.getState().updateVideoTranscript(id, formatted || "NO TEXT FOUND IN CHUNKS");
              } else if (output && typeof output.text === 'string') {
                useStore.getState().updateVideoTranscript(id, output.text || "NO TEXT FOUND");
              } else {
                console.log("Worker output:", output); useStore.getState().updateVideoTranscript(id, JSON.stringify(output) || "EMPTY JSON");
              }
              
              useTransientStore.setState(state => ({
                transcriptionStatuses: { ...state.transcriptionStatuses, [id]: 'Completed' }
              }));
              
              transcriptionPromises.get(id)!.resolve(true);
              transcriptionPromises.delete(id);
            }
          }
        };
        
        whisperWorkerInstance.postMessage({ type: 'init' });
      } catch (e) {
        console.error("Failed to load Whisper engine", e);
        set({ isWhisperLoading: false, whisperLoadingProgress: 'Failed to load' });
        whisperInitPromise = null;
        reject(e);
      }
    });
    return whisperInitPromise;
  },
  
  transcribeVideo: async (videoId: string, file: File) => {
    set(state => ({ transcriptionStatuses: { ...state.transcriptionStatuses, [videoId]: 'Initializing...' } }));
    
    const settings = useStore.getState().settings;
    if (settings.useDesktopBackend) {
      return new Promise<boolean>(async (resolve, reject) => {
        try {
          set(state => ({ transcriptionStatuses: { ...state.transcriptionStatuses, [videoId]: 'Uploading to Python Backend...' } }));
          const formData = new FormData();
          formData.append('file', file);
          formData.append('videoId', videoId);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            controller.abort();
          }, 900000); // 15 minutes timeout
          
          try {
            const response = await fetch(`${settings.desktopBackendUrl || 'http://localhost:8000'}/api/transcribe`, {
              method: 'POST',
              body: formData,
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              throw new Error(`Python Backend error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            useStore.getState().updateVideoTranscript(videoId, data.transcript);
            set(state => ({
              transcriptionStatuses: { ...state.transcriptionStatuses, [videoId]: 'Completed' }
            }));
            resolve(true);
          } catch (fetchErr: any) {
            clearTimeout(timeoutId);
            if (fetchErr.name === 'AbortError') {
              throw new Error('Transcription request timed out (limit: 15 minutes)');
            }
            throw fetchErr;
          }
        } catch (err: any) {
          set(state => ({ transcriptionStatuses: { ...state.transcriptionStatuses, [videoId]: `Backend Error: ${err.message}` } }));
          reject(err);
        }
      });
    }

    if (!whisperWorkerInstance) {
      await get().initWhisperEngine();
    }
    
    return new Promise<boolean>(async (resolve, reject) => {
      try {
        set(state => ({ transcriptionStatuses: { ...state.transcriptionStatuses, [videoId]: 'Decoding audio...' } }));
        transcriptionPromises.set(videoId, { resolve, reject });
        const arrayBuffer = await file.arrayBuffer();
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const audioData = audioBuffer.getChannelData(0);
        
        set(state => ({ transcriptionStatuses: { ...state.transcriptionStatuses, [videoId]: 'Transcribing in worker...' } }));
        whisperWorkerInstance!.postMessage({ type: 'transcribe', payload: { audioData }, id: videoId });
      } catch (err: any) {
        set(state => ({ transcriptionStatuses: { ...state.transcriptionStatuses, [videoId]: `Error: ${err.message}` } }));
        transcriptionPromises.delete(videoId);
        reject(err);
      }
    });
  },

  processTranscriptionQueue: async () => {
    if (get().isTranscribingQueue || get().transcriptionQueue.length === 0) return;
    set({ isTranscribingQueue: true });
    
    while (get().transcriptionQueue.length > 0) {
      const current = get().transcriptionQueue[0];
      if (!current) break;
      
      const { videoId, file } = current;
      try {
        const hasTranscript = !!useStore.getState().videos.find(v => v.id === videoId)?.transcript;
        if (!hasTranscript) {
          await get().transcribeVideo(videoId, file);
        }
      } catch (e: any) {
        console.error(`Failed to transcribe ${videoId}:`, e);
        set(state => ({
          transcriptionStatuses: { 
            ...state.transcriptionStatuses, 
            [videoId]: `Failed: ${e.message || e}` 
          }
        }));
      }
      
      // Remove from queue
      set(state => ({
        transcriptionQueue: state.transcriptionQueue.slice(1)
      }));
    }
    
    set({ isTranscribingQueue: false });
  },

  queueTranscription: (videoId: string, file: File) => {
    set(state => ({
      transcriptionQueue: [...state.transcriptionQueue, { videoId, file }]
    }));
    setTimeout(() => {
      get().processTranscriptionQueue();
    }, 50);
  },

  resetTranscriptionQueue: () => {
    set({
      isTranscribingQueue: false,
      transcriptionQueue: [],
      transcriptionStatuses: {}
    });
  },

  setDirectoryHandle: async (handle) => {
    set({ directoryHandle: handle });
    const { set: idbSet } = await import('idb-keyval');
    if (handle) {
      await idbSet('savedDirectoryHandle', handle);
    } else {
      const { del } = await import('idb-keyval');
      await del('savedDirectoryHandle');
    }
  },
  loadDirectoryHandle: async () => {
    const { get: idbGet } = await import('idb-keyval');
    try {
      const handle = await idbGet<FileSystemDirectoryHandle>('savedDirectoryHandle');
      if (handle) {
        set({ directoryHandle: handle });
      }
    } catch (e) {
      console.error("Failed to load directory handle", e);
    }
  }
}));
