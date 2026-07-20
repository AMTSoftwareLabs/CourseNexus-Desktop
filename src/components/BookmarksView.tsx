import React, { useState, useRef, useEffect } from 'react';
import { useStore, useTransientStore } from '../store';
import { Download, Play, BookOpen, ChevronDown, FileText, File as FileIcon, Loader2 } from 'lucide-react';
import { formatTime } from '../lib/utils';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';

const captureFrame = (file: File, time: number): Promise<string | null> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    video.addEventListener('loadedmetadata', () => {
      video.currentTime = Math.min(time, video.duration - 0.1);
    });
    
    video.addEventListener('seeked', () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        } else {
          resolve(null);
        }
      } catch (e) {
        resolve(null);
      } finally {
        URL.revokeObjectURL(video.src);
      }
    });
    
    video.addEventListener('error', () => {
      resolve(null);
      URL.revokeObjectURL(video.src);
    });
  });
};

export default function BookmarksView() {
  const courses = useStore(state => state.courses);
  const videos = useStore(state => state.videos);
  const setView = useStore(state => state.setView);
  const files = useTransientStore(state => state.files);
  
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [includeScreenshots, setIncludeScreenshots] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportText = () => {
    setShowExportMenu(false);
    let content = "# Course Notes & Bookmarks\n\n";
    courses.forEach(course => {
      const courseVideos = videos.filter(v => v.courseId === course.id && (v.bookmarks.length > 0 || v.notes));
      if (courseVideos.length > 0) {
        content += ``;
        content += `## ${course.title}\n`;
        content += `\n`;
        courseVideos.forEach(video => {
          content += `### ${video.title}\n`;
          if (video.notes) {
            content += `#### Notes\n${video.notes}\n\n`;
          }
          if (video.bookmarks.length > 0) {
            content += `#### Bookmarks\n`;
            video.bookmarks.forEach(bm => {
              content += `- **[${formatTime(bm.time)}]** ${bm.text}\n`;
            });
            content += `\n`;
          }
        });
      }
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Course_Notes_Export.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const doc = new jsPDF();
      let y = 20;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;

      const checkPage = (addY: number) => {
        if (y + addY > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      };

      doc.setFontSize(20);
      doc.text("Course Notes & Bookmarks", margin, y);
      y += 15;

      for (const course of courses) {
        const courseVideos = videos.filter(v => v.courseId === course.id && (v.bookmarks.length > 0 || v.notes));
        if (courseVideos.length > 0) {
          checkPage(20);
          doc.setFontSize(16);
          doc.setTextColor(79, 70, 229); // Indigo 600
          doc.text(`Course: ${course.title}`, margin, y);
          doc.setTextColor(0, 0, 0);
          y += 10;

          for (const video of courseVideos) {
            checkPage(15);
            doc.setFontSize(14);
            doc.text(`Video: ${video.title}`, margin, y);
            y += 8;

            if (video.notes) {
              checkPage(10);
              doc.setFontSize(12);
              doc.setTextColor(100, 116, 139); // Slate 500
              doc.text("Notes:", margin, y);
              doc.setTextColor(0, 0, 0);
              y += 6;
              
              doc.setFontSize(10);
              const lines = doc.splitTextToSize(video.notes, 170);
              lines.forEach((line: string) => {
                checkPage(6);
                doc.text(line, margin, y);
                y += 5;
              });
              y += 4;
            }

            if (video.bookmarks.length > 0) {
              checkPage(10);
              doc.setFontSize(12);
              doc.setTextColor(100, 116, 139); // Slate 500
              doc.text("Bookmarks:", margin, y);
              doc.setTextColor(0, 0, 0);
              y += 6;

              doc.setFontSize(10);
              for (const bm of video.bookmarks) {
                const bmText = `[${formatTime(bm.time)}] ${bm.text}`;
                const lines = doc.splitTextToSize(bmText, 170);
                lines.forEach((line: string) => {
                  checkPage(6);
                  doc.text(line, margin, y);
                  y += 5;
                });
                
                if (includeScreenshots && files[video.id]) {
                  const dataUrl = await captureFrame(files[video.id], bm.time);
                  if (dataUrl) {
                    const imgWidth = 170;
                    const imgHeight = 95.625; // roughly 16:9
                    checkPage(imgHeight + 5);
                    doc.addImage(dataUrl, 'JPEG', margin, y, imgWidth, imgHeight);
                    y += imgHeight + 5;
                  }
                }
              }
              y += 4;
            }
          }
          y += 5;
        }
      }

      doc.save("Course_Notes.pdf");
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportWord = async () => {
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const children: any[] = [];
      
      children.push(new Paragraph({
          text: "Course Notes & Bookmarks",
          heading: HeadingLevel.TITLE,
      }));

      for (const course of courses) {
        const courseVideos = videos.filter(v => v.courseId === course.id && (v.bookmarks.length > 0 || v.notes));
        if (courseVideos.length > 0) {
          children.push(new Paragraph({
              text: `Course: ${course.title}`,
              heading: HeadingLevel.HEADING_1,
          }));

          for (const video of courseVideos) {
            children.push(new Paragraph({
              text: `Video: ${video.title}`,
              heading: HeadingLevel.HEADING_2,
            }));

            if (video.notes) {
              children.push(new Paragraph({
                text: "Notes:",
                heading: HeadingLevel.HEADING_3,
              }));
              
              video.notes.split('\n').forEach(line => {
                  children.push(new Paragraph({
                      children: [new TextRun(line)]
                  }));
              });
              
              children.push(new Paragraph({ text: "" }));
            }

            if (video.bookmarks.length > 0) {
              children.push(new Paragraph({
                text: "Bookmarks:",
                heading: HeadingLevel.HEADING_3,
              }));

              for (const bm of video.bookmarks) {
                children.push(new Paragraph({
                  children: [
                      new TextRun({ text: `[${formatTime(bm.time)}] `, bold: true }),
                      new TextRun(bm.text)
                  ]
                }));
                
                if (includeScreenshots && files[video.id]) {
                  const dataUrl = await captureFrame(files[video.id], bm.time);
                  if (dataUrl) {
                    const imageBase64Data = dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
                    children.push(new Paragraph({
                      children: [
                        new ImageRun({
                          data: Uint8Array.from(atob(imageBase64Data), c => c.charCodeAt(0)),
                          transformation: {
                            width: 400,
                            height: 225
                          },
                          type: "jpg"
                        })
                      ]
                    }));
                  }
                }
              }
              
              children.push(new Paragraph({ text: "" }));
            }
          }
        }
      }

      const doc = new Document({
          sections: [{
              properties: {},
              children: children
          }]
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, "Course_Notes.docx");
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const videosWithBookmarks = videos.filter(v => v.bookmarks.length > 0 || v.notes);

  return (
    <div className="p-8 flex flex-col gap-8 flex-1 w-full overflow-y-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors">Notes & Bookmarks</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 transition-colors">Review your saved lecture notes and export them.</p>
        </div>
        
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={videosWithBookmarks.length === 0 || isExporting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Download className="w-5 h-5 mr-2" />}
            {isExporting ? 'Exporting...' : 'Export Notes'}
            <ChevronDown className="w-4 h-4 ml-2" />
          </button>
          
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <label className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={includeScreenshots} 
                    onChange={e => setIncludeScreenshots(e.target.checked)} 
                    className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300" 
                  />
                  <span>Include Screenshots</span>
                </label>
              </div>
              <button onClick={handleExportPDF} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center transition-colors">
                <FileIcon className="w-4 h-4 mr-2 text-rose-500" /> Export as PDF
              </button>
              <button onClick={handleExportWord} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center transition-colors border-t border-slate-100 dark:border-slate-700">
                <FileText className="w-4 h-4 mr-2 text-blue-500" /> Export as Word
              </button>
              <button onClick={handleExportText} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center transition-colors border-t border-slate-100 dark:border-slate-700">
                <FileText className="w-4 h-4 mr-2 text-slate-500" /> Export as Markdown
              </button>
            </div>
          )}
        </div>
      </div>

      {videosWithBookmarks.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4 transition-colors" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 transition-colors">No notes yet</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">Add bookmarks or notes to your videos to see them here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {courses.map(course => {
            const courseVideos = videosWithBookmarks.filter(v => v.courseId === course.id);
            if (courseVideos.length === 0) return null;
            
            return (
              <div key={course.id} className="bg-white dark:bg-slate-800 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
                <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center transition-colors">
                  <span className="text-2xl mr-3">📚</span>
                  {course.title}
                </h2>
                
                <div className="flex flex-col gap-6">
                  {courseVideos.map(video => (
                    <div key={video.id} className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 transition-colors">
                      <div 
                        className="flex items-center gap-3 mb-4 cursor-pointer group w-fit"
                        onClick={() => setView({ type: 'player', courseId: course.id, videoId: video.id })}
                      >
                        <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-indigo-500 dark:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                          <Play className="w-4 h-4 ml-0.5" />
                        </div>
                        <h3 className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{video.title}</h3>
                      </div>
                      
                      <div className="flex flex-col gap-3 lg:pl-11">
                        {video.notes && (
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm mb-2 transition-colors">
                            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Notes</h4>
                            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{video.notes}</p>
                          </div>
                        )}
                        {video.bookmarks.length > 0 && (
                          <>
                            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-2 mb-1">Bookmarks</h4>
                            {video.bookmarks.map(bm => (
                              <div key={bm.id} className="flex items-start gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                                <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg text-xs font-mono font-bold shrink-0 mt-0.5 transition-colors">
                                  {formatTime(bm.time)}
                                </span>
                                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed transition-colors">{bm.text}</p>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
