import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;

let transcriber: any = null;

self.onmessage = async (e) => {
  const { type, payload, id } = e.data;
  
  if (type === 'init') {
    try {
      if (!transcriber) {
        transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
          progress_callback: (info: any) => {
            self.postMessage({ type: 'progress', info, id });
          }
        });
      }
      self.postMessage({ type: 'ready', id });
    } catch (err: any) {
      self.postMessage({ type: 'error', error: err.message, id });
    }
  } else if (type === 'transcribe') {
    try {
      if (!transcriber) {
         throw new Error("Transcriber not initialized");
      }
      const output = await transcriber(payload.audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
        
        
      });
      self.postMessage({ type: 'result', output, id });
    } catch (err: any) {
      self.postMessage({ type: 'error', error: err.message, id });
    }
  }
};
