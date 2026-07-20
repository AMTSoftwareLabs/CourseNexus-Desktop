import { Settings } from '../types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'ai';
  content: string;
}

export async function runDesktopChat(
  messages: ChatMessage[],
  systemPrompt: string,
  settings: Settings
): Promise<string> {
  const backendUrl = settings.desktopBackendUrl || 'http://localhost:8000';
  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({
      role: m.role === 'ai' || m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }))
  ];

  const response = await fetch(`${backendUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: apiMessages,
      model: settings.aiModel
    })
  });

  if (!response.ok) {
    throw new Error(`Desktop Backend chat failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || data.response || data.text || '';
}

export async function runDesktopNotes(
  transcript: string,
  settings: Settings
): Promise<string> {
  const backendUrl = settings.desktopBackendUrl || 'http://localhost:8000';
  
  const response = await fetch(`${backendUrl}/api/generate_notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transcript,
      model: settings.aiModel
    })
  });

  if (!response.ok) {
    throw new Error(`Desktop Backend notes generation failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.notes || data.text || '';
}

export async function runDesktopFlashcards(
  transcript: string,
  notes: string,
  settings: Settings
): Promise<{ front: string; back: string }[]> {
  const backendUrl = settings.desktopBackendUrl || 'http://localhost:8000';
  
  const response = await fetch(`${backendUrl}/api/generate_flashcards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transcript,
      notes,
      model: settings.aiModel
    })
  });

  if (!response.ok) {
    throw new Error(`Desktop Backend flashcard generation failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.flashcards || [];
}
