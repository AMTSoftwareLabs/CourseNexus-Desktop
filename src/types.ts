export interface Settings {
  darkMode: boolean;
  playbackSpeed: number;
  autoPlayNext: boolean;
}

export type ViewState =
  | { type: 'dashboard' }
  | { type: 'courses' }
  | { type: 'bookmarks' }
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
