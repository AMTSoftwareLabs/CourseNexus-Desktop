# Course Nexus Desktop — AI-Powered Local Course Player

Course Nexus Desktop is an advanced, offline-first course manager, video player, and intelligent study companion. It is designed to run locally on your desktop, enabling you to organize and watch video courses with full offline support, complete with a dual-engine AI study companion, automated transcriptions, smart notes, flashcards, and an elegant adaptive interface.

---

## 🌟 Key Features

### 🎬 Course & Video Player
- **Local Course Directories:** Import and play local video files directly from your computer with zero latency and absolute privacy.
- **Smart Analytics:** Automatically tracks total course watch times, specific module progress, and completion percentages.
- **Interactive Bookmarking:** Drop custom timestamped bookmarks to highlight critical moments in your lectures and easily jump back later.

### 🧠 Dual-Engine AI Study Companion
Course Nexus supports two execution paths, adjustable with a single click in the sidebar:
1. **Browser AI (Online):** Proxied server-side LLM calls to Google's fast, high-performance Gemini API.
2. **Python Local Server (Offline):** Fully offline processing powered by standard GGUF weights running inside a local FastAPI environment.
   - Supports **Llama-3.2-1B** and **Gemma-2-2B** models.
   - Automatic background parameter downloading and caching directly from Hugging Face Hub.

### 🎙️ Offline Audio Transcription
- **Whisper Integration:** Transcribes audio streams directly from local video files locally using high-efficiency `faster-whisper`.
- **Background Queue Worker:** Includes an asynchronous task queue manager. Add multiple video files to the queue, monitor progress live, and resume studying while the transcriber runs in the background.

### 📝 Auto-Generated Study Material
- **AI-Generated Smart Notes:** Instantly compile clean, structured markdown study sheets from lecture transcripts.
- **Interactive Flashcards:** Auto-generate question-and-answer flashcard decks to test your recall of major course terms.
- **Exporting Options:** Export all generated transcripts, bookmarks, flashcards, and study notes in clean formats.

### 🎨 Fully Adaptive Layout & Design
- **Dark & Light Themes:** Crisp, high-contrast dark and light modes, built with Tailwind CSS v4 custom variant rules.
- **Modern UI Components:** Smooth micro-interactions, responsive panels, progress visualizers, and collapsible sidebars.

---

## 🛠️ Tech Stack

- **Frontend Application:** React 19, Tailwind CSS v4, Zustand (State Management), Lucide Icons, Recharts (Progress Analytics)
- **Desktop Application Shell:** Electron
- **Local Python Assistant Backend:** FastAPI, Uvicorn, llama-cpp-python, faster-whisper, huggingface-hub, PyTorch (CUDA / GPU detection)

---

## 🚀 Installation & Setup Guide

### 1. Prerequisite Checklist
Before starting, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://www.python.org/) (3.8 - 3.11 recommended)
- [Git](https://git-scm.com/)
- *Optional:* A Google Gemini API Key (Get one free from [Google AI Studio](https://aistudio.google.com/)) for the online fallback engine.

---

### 2. Setting Up the Electron App

Clone the repository and install the frontend/Electron package dependencies:
```bash
# Clone the repository
git clone https://github.com/your-username/course-nexus-desktop.git
cd course-nexus-desktop

# Install packages
npm install
```

Configure environment variables:
```bash
cp .env.example .env
```
Open the `.env` file and insert your optional Gemini API Key:
```env
# Optional online backend key (never exposed to browser)
GEMINI_API_KEY=your_gemini_api_key_here
```

---

### 3. Setting Up the Python AI Backend (Optional — for Offline LLM/Transcription)

The local Python server acts as the AI engine for local GGUF models and audio-to-text transcribing. 

```bash
# Move to the backend folder
cd backend

# Create and activate a Python virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install the required Python dependencies
pip install -r requirements.txt
```

#### GPU Acceleration (Windows & CUDA Devices)
To significantly boost GGUF inference and Whisper transcription performance on Windows using NVIDIA GPUs, ensure you have C++ Build Tools installed, then run:
```bash
set CMAKE_ARGS=-DLLAMA_CUDA=on
pip install llama-cpp-python --upgrade --force-reinstall --no-cache-dir
```

#### Run the Python FastAPI Server
```bash
python main.py
```
*The server will start listening at `http://localhost:8000`.*

---

## 💻 Running the Application

You can spin up Course Nexus Desktop depending on your dev workflow:

### Mode A: Full Desktop App (React + Electron)
Ensure your React frontend is running, then launch Electron:
```bash
# In Terminal 1 (Frontend compilation)
npm run dev

# In Terminal 2 (Electron Shell)
npm run electron:dev
```

### Mode B: Standard Web Interface (In-Browser Preview)
```bash
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 📦 Building and Packaging

To package Course Nexus into a standalone executable (`.exe` for Windows, `.app` for macOS, or installer packages for Linux):

```bash
# Bundles the React assets and packages the Electron app
npm run build:exe
```
This builds and places the resulting packages into the `release/` directory.

---

## 🤝 Contributing

Contributions, feature ideas, and bug reports are welcome!
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📝 License

This project is licensed under the **GNU General Public License v3.0 (GPLv3)** - see the LICENSE file for details.
