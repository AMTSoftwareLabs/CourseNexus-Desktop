import React, { useState, useEffect } from 'react';
import { Send, Bot, User, Loader2, MessageSquare, X } from 'lucide-react';
import { useStore, useTransientStore } from '../store';
import { runDesktopChat } from '../utils/backendApi';

export default function GemmaChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([
    { role: 'ai', content: 'Hello! I am your offline AI assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { aiEngine, isAiLoading, aiLoadingProgress, initAiEngine } = useTransientStore();
  const settings = useStore(state => state.settings);
  const courses = useStore(state => state.courses);
  const videos = useStore(state => state.videos);
  const flashcards = useStore(state => state.flashcards);

  useEffect(() => {
    if (isOpen && !aiEngine && !isAiLoading && !settings.useDesktopBackend) {
      initAiEngine(settings.aiModel);
    }
  }, [isOpen, aiEngine, isAiLoading, settings.aiModel, initAiEngine, settings.useDesktopBackend]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    if (!settings.useDesktopBackend && !aiEngine) return;

    const userMessage = input.trim();
    const newMessages: {role: 'user' | 'ai', content: string}[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setIsGenerating(true);

    try {
      const coursesList = courses.slice(0, 5).map(c => {
        const desc = c.description ? c.description.trim() : '';
        const shortDesc = desc.length > 50 ? desc.slice(0, 50) + '...' : desc;
        return `- ${c.title}${shortDesc ? ` (${shortDesc})` : ''}`;
      }).join('\n');
      const coursesText = coursesList ? `\n${coursesList}` : ' None';

      const videosList = videos.slice(0, 5).map(v => {
        const pct = v.duration ? Math.round((v.progress / v.duration) * 100) : 0;
        return `- ${v.title} (${pct}% completed${v.notes ? ', has notes' : ''})`;
      }).join('\n');
      const videosText = videosList ? `\n${videosList}` : ' None';

      const systemPrompt = `You are a helpful AI assistant for a local learning management app called Course Nexus. 
You run entirely offline in the user's browser.
The user has the following data:
Courses:${coursesText}
Videos:${videosText}
Total Flashcards: ${flashcards.length}.
Help the user learn, summarize their progress, answer questions about their courses, and provide study recommendations based on their data. Keep answers concise.`;

      // Limit chat history to the last 10 turns to prevent token drift & context overflow
      const recentMessages = newMessages.slice(-10);

      let aiResponseContent = '';
      if (settings.useDesktopBackend) {
        aiResponseContent = await runDesktopChat(
          recentMessages.map(m => ({ role: m.role, content: m.content })),
          systemPrompt,
          settings
        );
      } else if (aiEngine) {
        const apiMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...recentMessages.map(m => ({
            role: m.role === 'ai' ? 'assistant' as const : 'user' as const,
            content: m.content
          }))
        ];

        const completion = await aiEngine.chat.completions.create({
          messages: apiMessages,
        });
        aiResponseContent = completion.choices[0].message.content || '';
      }
      setMessages(prev => [...prev, { role: 'ai', content: aiResponseContent }]);
    } catch (err: any) {
      if (!settings.useDesktopBackend) {
        useTransientStore.getState().handleAiError(err);
      }
      setMessages(prev => [...prev, { role: 'ai', content: `Error: ${err.message}. If using Python Backend, verify the local backend server is running.` }]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-105 z-50"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[400px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-8rem)] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-50 border border-slate-200 dark:border-slate-800">
          <div className="bg-indigo-600 p-4 text-white flex items-center justify-between font-semibold">
            <div className="flex items-center">
              <Bot className="mr-2" />
              {settings.useDesktopBackend ? 'Desktop AI Assistant' : 'Offline AI Assistant'}
            </div>
            {settings.useDesktopBackend && (
              <span className="text-xs bg-indigo-500 px-2 py-0.5 rounded-full text-indigo-100 font-normal">Python Backend</span>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!settings.useDesktopBackend && !aiEngine ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 p-6 text-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-sm font-medium">{aiLoadingProgress || 'Loading AI Model...'}</p>
                <p className="text-xs">This runs entirely in your browser and requires downloading model files.</p>
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3 flex gap-3 ${m.role === 'user' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-900 dark:text-indigo-100 rounded-br-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm'}`}>
                      <div className="mt-1 shrink-0">
                        {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
                    </div>
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm p-3 flex gap-3 text-slate-800 dark:text-slate-200">
                      <Bot size={16} className="mt-1 shrink-0" />
                      <Loader2 size={16} className="animate-spin" />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <form onSubmit={handleSubmit} className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 border px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white"
              disabled={isGenerating || (!settings.useDesktopBackend && !aiEngine)}
            />
            <button
              type="submit"
              disabled={isGenerating || !input.trim() || (!settings.useDesktopBackend && !aiEngine)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl disabled:opacity-50 transition-colors shrink-0"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
