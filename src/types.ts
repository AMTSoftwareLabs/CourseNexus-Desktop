export interface Settings {
  darkMode: boolean;
  playbackSpeed: number;
  autoPlayNext: boolean;
  aiModel: string;
  gpuNameOverride: string;
  ramGbOverride: number;
  gpuTierOverride: 'auto' | 'high' | 'mid' | 'low';
  contextSizeOverride: number;
  useDesktopBackend?: boolean;
  desktopBackendUrl?: string;
}

export type ViewState =
  | { type: 'dashboard' }
  | { type: 'courses' }
  | { type: 'bookmarks' }
  | { type: 'flashcards' }
  | { type: 'settings' }
  | { type: 'course_detail'; courseId: string }
  | { type: 'player'; videoId: string; courseId: string };

export interface Bookmark {
  id: string;
  time: number;
  text: string;
}

export interface Video {
  id: string;
  courseId: string;
  title: string;
  fileName: string;
  filePath?: string;
  moduleName?: string;
  progress: number;
  duration: number;
  bookmarks: Bookmark[];
  transcript?: string;
  notes?: string;
  createdAt: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  createdAt: number;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  sourceVideoId?: string;
  sourceTimestampMs?: number;
  easeFactor: number;
  intervalDays: number;
  repetitionCount: number;
  nextReviewDate: number;
}
