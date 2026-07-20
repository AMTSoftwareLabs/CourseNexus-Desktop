# Production-grade Python FastAPI backend for Offline AI Assistant
# Enables desktop execution of Llama/Gemma & Whisper with full GPU acceleration on GTX 1060 (6GB)
#
# Installation Instructions:
# 1. Install CUDA Toolkit 12.x (if not already installed for GPU acceleration)
# 2. Install dependencies:
#    pip install fastapi uvicorn pydantic jinja2 python-multipart faster-whisper hf-transfer
# 3. For GPU Accelerated LLM (via llama-cpp-python):
#    Windows:
#      set CMAKE_ARGS=-DLLAMA_CUDA=on
#      pip install llama-cpp-python --upgrade --force-reinstall --no-cache-dir
#    Linux/macOS:
#      CMAKE_ARGS="-DLLAMA_CUDA=on" pip install llama-cpp-python --upgrade --force-reinstall --no-cache-dir
# 4. Run the server:
#    uvicorn main:app --host 127.0.0.1 --port 8000 --reload

import os
import shutil
import tempfile
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="Desktop Offline AI Backend",
    description="FastAPI service enabling GPU-accelerated local LLMs and audio transcription",
    version="1.0.0"
)

# Enable CORS to allow request routing from Electron frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration defaults
MODEL_DIR = os.path.join(os.path.expanduser("~"), ".cache", "desktop-ai-models")
os.makedirs(MODEL_DIR, exist_ok=True)

# Global variables for models to support lazy loading
llm = None
whisper_model = None

# Available models mapping for local Python backend
SUPPORTED_MODELS = {
    "llama-3.2-1b": {
        "name": "Llama 3.2 1B Instruct (Ultra-Fast, Safe VRAM)",
        "repo": "unsloth/Llama-3.2-1B-Instruct-GGUF",
        "filename": "Llama-3.2-1B-Instruct-Q4_K_M.gguf"
    },
    "gemma-2-2b": {
        "name": "Gemma 2 2B Instruct (Highly Recommended)",
        "repo": "lmstudio-community/gemma-2-2b-it-GGUF",
        "filename": "gemma-2-2b-it-Q4_K_M.gguf"
    },
    "llama-3-8b": {
        "name": "Llama 3 8B Instruct (High Quality)",
        "repo": "lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF",
        "filename": "Meta-Llama-3-8B-Instruct-Q4_K_M.gguf"
    },
    "gemma-2-9b": {
        "name": "Gemma 2 9B Instruct (Maximum Intelligence)",
        "repo": "lmstudio-community/gemma-2-9b-it-GGUF",
        "filename": "gemma-2-9b-it-Q4_K_M.gguf"
    }
}

active_model_id = "llama-3.2-1b"
model_loading_status = "idle"
model_loading_error = None

# We use huggingface_hub to download GGUFs cleanly if they don't exist
from huggingface_hub import hf_hub_download

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    system_prompt: Optional[str] = "You are a helpful and professional AI Study Assistant."
    model: Optional[str] = None

def get_llama_model():
    """Lazy initialize and download/load the local GGUF model with dynamic GPU/CPU detection."""
    global llm, active_model_id, model_loading_status, model_loading_error
    if llm is not None:
        return llm

    # Fetch configuration for active model
    model_cfg = SUPPORTED_MODELS.get(active_model_id, SUPPORTED_MODELS["llama-3.2-1b"])
    model_repo = model_cfg["repo"]
    model_filename = model_cfg["filename"]
    
    print(f"[*] Initializing local LLM: {model_repo}/{model_filename}...")
    model_loading_status = "downloading"
    model_loading_error = None
    try:
        model_path = hf_hub_download(
            repo_id=model_repo, 
            filename=model_filename,
            local_dir=MODEL_DIR
        )
        print(f"[*] Model downloaded/found at: {model_path}")
        
        model_loading_status = "loading"
        from llama_cpp import Llama
        
        # Detect CUDA and configure n_gpu_layers
        cuda_supported = is_cuda_supported()
        gpu_layers = -1 if cuda_supported else 0
        print(f"[*] CUDA/GPU Acceleration Supported: {cuda_supported}. Sizing n_gpu_layers={gpu_layers}")
        
        llm = Llama(
            model_path=model_path,
            n_ctx=2048,           # Optimal context size
            n_gpu_layers=gpu_layers,
            n_threads=4,          # CPU threads fallback
            verbose=False
        )
        if cuda_supported:
            print("[+] Local LLM loaded successfully with GPU acceleration!")
        else:
            print("[+] Local LLM loaded successfully on CPU mode.")
        model_loading_status = "loaded"
        model_loading_error = None
        return llm
    except Exception as e:
        print(f"[-] Initial load attempt failed. Attempting safe CPU fallback: {e}")
        model_loading_status = "loading"
        try:
            from llama_cpp import Llama
            actual_path = model_path if 'model_path' in locals() and os.path.exists(model_path) else os.path.join(MODEL_DIR, model_filename)
            llm = Llama(
                model_path=actual_path,
                n_ctx=2048,
                n_gpu_layers=0,   # CPU only fallback
                verbose=False
            )
            print("[+] Local LLM loaded successfully on CPU fallback.")
            model_loading_status = "loaded"
            model_loading_error = None
            return llm
        except Exception as cpu_error:
            model_loading_status = "error"
            model_loading_error = str(cpu_error)
            raise HTTPException(status_code=500, detail=f"Failed to load LLM: {str(cpu_error)}")

def get_whisper_model():
    """Lazy initialize and load the offline Faster-Whisper transcriber with automatic GPU/CPU routing."""
    global whisper_model
    if whisper_model is not None:
        return whisper_model
        
    cuda_supported = is_cuda_supported()
    device = "cuda" if cuda_supported else "cpu"
    compute_type = "float16" if cuda_supported else "int8"
    
    print(f"[*] Initializing local Faster-Whisper (base model) on {device.upper()} ({compute_type})...")
    try:
        from faster_whisper import WhisperModel
        whisper_model = WhisperModel(
            "base", 
            device=device, 
            compute_type=compute_type,
            download_root=os.path.join(MODEL_DIR, "whisper")
        )
        print(f"[+] Faster-Whisper loaded successfully on {device.upper()}!")
    except Exception as e:
        print(f"[-] Initialization on {device.upper()} failed, attempting generic CPU fallback: {e}")
        try:
            from faster_whisper import WhisperModel
            whisper_model = WhisperModel(
                "base", 
                device="cpu", 
                compute_type="int8",
                download_root=os.path.join(MODEL_DIR, "whisper")
            )
            print("[+] Faster-Whisper loaded successfully on CPU!")
        except Exception as cpu_error:
            raise HTTPException(status_code=500, detail=f"Failed to load Whisper: {str(cpu_error)}")
    return whisper_model

@app.get("/api/health")
def health_check():
    return {"status": "ok", "cuda_available": is_cuda_supported()}

def is_cuda_supported() -> bool:
    # Prioritize llama-cpp-python's native GPU support check
    try:
        from llama_cpp import llama_supports_gpu_offload
        if llama_supports_gpu_offload():
            return True
    except Exception:
        pass

    # Check PyTorch's CUDA status as backup
    try:
        import torch
        if torch.cuda.is_available():
            return True
    except Exception:
        pass

    return False

@app.post("/api/chat")
async def chat_completions(req: ChatRequest):
    """Generates structured local completions matching standard OpenAI schema with on-the-fly model selection."""
    try:
        global active_model_id, llm
        if req.model:
            # Map client model requests (like WebGPU names) to our backend model keys
            mapped_id = None
            req_model_lower = req.model.lower()
            if "llama-3.2" in req_model_lower or "1b" in req_model_lower:
                mapped_id = "llama-3.2-1b"
            elif "gemma-2-2b" in req_model_lower or "gemma-2b" in req_model_lower:
                mapped_id = "gemma-2-2b"
            elif "llama-3-8b" in req_model_lower or "8b" in req_model_lower:
                mapped_id = "llama-3-8b"
            elif "gemma-2-9b" in req_model_lower or "9b" in req_model_lower:
                mapped_id = "gemma-2-9b"

            if mapped_id and mapped_id != active_model_id:
                print(f"[*] Switching active model based on chat request to: {mapped_id}")
                active_model_id = mapped_id
                llm = None  # Reload model next time it is queried

        model = get_llama_model()
        
        # Build chat templates conforming to Llama-3/Gemma chat formats
        prompt = ""
        if req.system_prompt:
            prompt += f"<|system|>\n{req.system_prompt}<|end|>\n"
            
        for msg in req.messages:
            prompt += f"<|{msg.role}|>\n{msg.content}<|end|>\n"
        prompt += "<|assistant|>\n"

        output = model(
            prompt,
            max_tokens=512,
            temperature=0.7,
            stop=["<|end|>", "<|user|>", "<|system|>", "<|assistant|>", "</s>"],
            echo=False
        )
        
        response_text = output["choices"][0]["text"].strip()
        return {
            "content": response_text,
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": response_text
                    }
                }
            ]
        }
    except Exception as e:
        print(f"[-] Chat completion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/models")
def list_models():
    """Lists the supported local GGUF models, their download status, and the current active model."""
    global active_model_id, llm, model_loading_status, model_loading_error
    return {
        "models": [
            {
                "id": k,
                "name": v["name"],
                "repo": v["repo"],
                "filename": v["filename"],
                "downloaded": os.path.exists(os.path.join(MODEL_DIR, v["filename"]))
            }
            for k, v in SUPPORTED_MODELS.items()
        ],
        "active_model_id": active_model_id,
        "is_loaded": llm is not None,
        "loading_status": model_loading_status,
        "loading_error": model_loading_error
    }

class ModelSelectRequest(BaseModel):
    model_id: str

@app.post("/api/select-model")
def select_model(req: ModelSelectRequest):
    """Explicitly selects and pre-loads/downloads a local model asynchronously."""
    global active_model_id, llm, model_loading_status, model_loading_error
    if req.model_id not in SUPPORTED_MODELS:
        raise HTTPException(status_code=400, detail=f"Model ID '{req.model_id}' is not supported.")
    
    import threading
    is_cached = os.path.exists(os.path.join(MODEL_DIR, SUPPORTED_MODELS[req.model_id]["filename"]))
    
    if req.model_id != active_model_id:
        print(f"[*] Explicitly switching model to: {req.model_id} (Cached: {is_cached})")
        active_model_id = req.model_id
        llm = None  # Force reload

    model_loading_status = "loading" if is_cached else "downloading"
    model_loading_error = None

    try:
        # Start download or load in a background daemon thread so it returns instantly!
        def background_load_task():
            try:
                get_llama_model()
            except Exception as bg_err:
                print(f"[-] Background model load task failed for '{req.model_id}': {bg_err}")
                
        threading.Thread(target=background_load_task, daemon=True).start()
        
        return {
            "status": "ok", 
            "active_model_id": active_model_id, 
            "is_loaded": llm is not None,
            "is_cached": is_cached,
            "message": "Model selection updated. Preloading in background..."
        }
    except Exception as e:
        print(f"[-] Error during explicit model switch initialization: {e}")
        model_loading_status = "error"
        model_loading_error = str(e)
        raise HTTPException(status_code=500, detail=f"Failed to initialize model '{req.model_id}': {str(e)}")

class GenerateNotesRequest(BaseModel):
    transcript: str
    model: Optional[str] = None

@app.post("/api/generate_notes")
async def generate_notes(req: GenerateNotesRequest):
    """Generates structured offline notes from transcript."""
    try:
        global active_model_id, llm
        if req.model:
            mapped_id = None
            req_model_lower = req.model.lower()
            if "llama-3.2" in req_model_lower or "1b" in req_model_lower:
                mapped_id = "llama-3.2-1b"
            elif "gemma-2-2b" in req_model_lower or "gemma-2b" in req_model_lower:
                mapped_id = "gemma-2-2b"
            elif "llama-3-8b" in req_model_lower or "8b" in req_model_lower:
                mapped_id = "llama-3-8b"
            elif "gemma-2-9b" in req_model_lower or "9b" in req_model_lower:
                mapped_id = "gemma-2-9b"

            if mapped_id and mapped_id != active_model_id:
                active_model_id = mapped_id
                llm = None

        model = get_llama_model()
        system_prompt = "You are a professional study helper. Create detailed, structured study notes with bullet points from the transcript. Keep it organized."
        prompt = f"<|system|>\n{system_prompt}<|end|>\n<|user|>\nTranscript:\n{req.transcript}<|end|>\n<|assistant|>\n"

        output = model(
            prompt,
            max_tokens=1024,
            temperature=0.3,
            stop=["<|end|>", "<|user|>", "<|system|>", "<|assistant|>", "</s>"],
            echo=False
        )
        notes = output["choices"][0]["text"].strip()
        return {"notes": notes}
    except Exception as e:
        print(f"[-] Generate notes error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class GenerateFlashcardsRequest(BaseModel):
    transcript: str
    notes: str
    model: Optional[str] = None

@app.post("/api/generate_flashcards")
async def generate_flashcards(req: GenerateFlashcardsRequest):
    """Generates structured flashcards in JSON format from context."""
    try:
        global active_model_id, llm
        if req.model:
            mapped_id = None
            req_model_lower = req.model.lower()
            if "llama-3.2" in req_model_lower or "1b" in req_model_lower:
                mapped_id = "llama-3.2-1b"
            elif "gemma-2-2b" in req_model_lower or "gemma-2b" in req_model_lower:
                mapped_id = "gemma-2-2b"
            elif "llama-3-8b" in req_model_lower or "8b" in req_model_lower:
                mapped_id = "llama-3-8b"
            elif "gemma-2-9b" in req_model_lower or "9b" in req_model_lower:
                mapped_id = "gemma-2-9b"

            if mapped_id and mapped_id != active_model_id:
                active_model_id = mapped_id
                llm = None

        model = get_llama_model()
        system_prompt = "You are an AI study assistant. Generate a JSON list of flashcards. Output ONLY valid JSON containing a list of objects with 'front' and 'back' fields. Do not include markdown formatting or extra text outside the JSON."
        context = f"Transcript:\n{req.transcript}\n\nNotes:\n{req.notes}"
        prompt = f"<|system|>\n{system_prompt}<|end|>\n<|user|>\nCreate flashcards based on this context:\n{context}<|end|>\n<|assistant|>\n"

        output = model(
            prompt,
            max_tokens=1024,
            temperature=0.5,
            stop=["<|end|>", "<|user|>", "<|system|>", "<|assistant|>", "</s>"],
            echo=False
        )
        raw_text = output["choices"][0]["text"].strip()
        clean_text = raw_text.replace("```json", "").replace("```", "").strip()
        
        import json
        try:
            flashcards = json.loads(clean_text)
            return {"flashcards": flashcards}
        except Exception as parse_err:
            print(f"[-] Flashcard JSON parse fallback parsing: {parse_err}")
            start = clean_text.find('[')
            end = clean_text.rfind(']') + 1
            if start != -1 and end != -1:
                try:
                    flashcards = json.loads(clean_text[start:end])
                    return {"flashcards": flashcards}
                except:
                    pass
            return {"flashcards": [], "raw_text": raw_text}
    except Exception as e:
        print(f"[-] Generate flashcards error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def format_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    if h > 0:
        return f"[{h:02d}:{m:02d}:{s:02d}]"
    return f"[{m:02d}:{s:02d}]"

@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribes high-fidelity audio chunks completely offline using Faster-Whisper."""
    try:
        transcriber = get_whisper_model()
        
        # Save uploaded audio chunk to a temporary file for Whisper processing
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = temp_file.name
            
        try:
            # Run Faster-Whisper offline transcription
            segments, info = transcriber.transcribe(temp_path, beam_size=5)
            
            transcribed_segments = []
            raw_text_segments = []
            for seg in segments:
                formatted_ts = format_time(seg.start)
                transcribed_segments.append(f"{formatted_ts} {seg.text.strip()}")
                raw_text_segments.append(seg.text.strip())
                
            full_transcript = "\n".join(transcribed_segments).strip()
            full_text = " ".join(raw_text_segments).strip()
            
            print(f"[+] Transcribed chunk length: {len(full_text)} chars")
            return {
                "text": full_text,
                "transcript": full_transcript
            }
        except Exception as trans_err:
            print(f"[-] Error inside Whisper transcriber: {trans_err}")
            raise HTTPException(status_code=500, detail=f"Whisper transcription error: {str(trans_err)}")
        finally:
            # Clean up temp file safely
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception as rm_err:
                    print(f"[-] Could not remove temp file {temp_path}: {rm_err}")
                
    except Exception as e:
        print(f"[-] Transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
