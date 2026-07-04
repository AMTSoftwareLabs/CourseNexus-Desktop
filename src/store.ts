import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Course, Video, Bookmark, ViewState, Settings } from './types';

interface AppState {
  view: ViewState;
  courses: Course[];
  videos: Video[];
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
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      view: { type: 'dashboard' },
      courses: [],
      videos: [],
      settings: {
        darkMode: false,
        playbackSpeed: 1,
        autoPlayNext: true,
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

      updateVideoNotes: (videoId, notes) => set((state) => ({
        videos: state.videos.map((v) =>
          v.id === videoId ? { ...v, notes } : v
        ),
      })),
    }),
    {
      name: 'local-course-tracker-storage',
      partialize: (state) => ({ courses: state.courses, videos: state.videos, settings: state.settings }), // Only persist data, not view state
    }
  )
);

interface TransientState {
  files: Record<string, File>;
  setFile: (videoId: string, file: File) => void;
}

// Store for actual File objects which cannot be persisted in localStorage
export const useTransientStore = create<TransientState>((set) => ({
  files: {},
  setFile: (videoId, file) => set((state) => ({
    files: { ...state.files, [videoId]: file }
  })),
}));
