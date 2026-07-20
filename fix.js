const fs = require('fs');
let code = fs.readFileSync('src/components/VideoPlayer.tsx', 'utf-8');

const injection = `
  const handleTimeUpdate = () => {
    if (videoRef.current && video) {
      updateProgress(videoId, videoRef.current.currentTime, videoRef.current.duration);
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(videoId, e.target.files[0]);
    }
  };
  const requestDirectoryPermission = async () => {
    if (directoryHandle) {
      await (directoryHandle as any).requestPermission({ mode: 'read' });
      setNeedsPermission(false);
    }
  };
  const jumpToTime = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  };
  const startEditBookmark = (id: string, text: string) => {
    setEditingBookmarkId(id);
    setEditingText(text);
  };
  const saveEditBookmark = () => {
    if (editingBookmarkId && editingText.trim()) {
      editBookmark(videoId, editingBookmarkId, editingText);
      setEditingBookmarkId(null);
    }
  };
`;

code = code.replace("const generateSummary = async () => {", injection + "\n  const generateSummary = async () => {");
code = code.replace(/type: 'course'/g, "type: 'course_detail'");
code = code.replace(/controlsList="nodownload"/g, "controlsList=\"nodownload\"\n              onTimeUpdate={handleTimeUpdate}");
fs.writeFileSync('src/components/VideoPlayer.tsx', code);
console.log("Fixed VideoPlayer.tsx");
