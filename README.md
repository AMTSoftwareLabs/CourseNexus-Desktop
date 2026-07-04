# Nexus - AI-Powered Local Course Player

Nexus is a modern, offline-first desktop application designed to supercharge your learning experience. Built with React, Electron, and Tailwind CSS, Nexus allows you to organize and play your local video courses while leveraging the power of Google's Gemini AI to automatically generate smart notes, summaries, and transcripts.

## 🌟 Features

*   **Local Video Playback:** Load and organize your local video courses without relying on an internet connection for playback.
*   **AI-Powered Smart Notes:** Automatically generate comprehensive notes, summaries, and key takeaways using the Gemini API.
*   **Interactive Bookmarking:** Add timestamped bookmarks to your videos and jump straight back to crucial moments.
*   **Progress Tracking:** Visualize your learning journey with built-in analytics and progress tracking across all your modules.
*   **Export Your Notes:** Export your generated notes and bookmarks to PDF, DOCX, or Markdown formats.
*   **Beautiful UI:** A clean, distraction-free interface featuring a stunning Dark Mode, built with Tailwind CSS.

## 🚀 Tech Stack

*   **Frontend:** React 19, Tailwind CSS v4, Zustand (State Management), Framer Motion (Animations)
*   **Desktop Engine:** Electron
*   **Build Tool:** Vite
*   **AI Integration:** Google GenAI SDK (`@google/genai`)
*   **Utilities:** Recharts, Lucide React, pdfjs, docx

## 🛠️ Installation & Setup

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher)
*   [Git](https://git-scm.com/)
*   A Google Gemini API Key (Get one from [Google AI Studio](https://aistudio.google.com/))

### 1. Clone the repository
```bash
git clone https://github.com/your-username/nexus.git
cd nexus
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root of your project by copying the example file:
```bash
cp .env.example .env
```
Open `.env` and add your Gemini API Key:
```env
VITE_GEMINI_API_KEY=your_api_key_here
```

## 💻 Running the App

To run the application in development mode, you need two terminal windows (or you can run them sequentially depending on your workflow):

**Option A: Run everything together (Electron + React)**
```bash
npm run electron:dev
```
*(Note: Ensure your Vite server is running or configured correctly for this command based on your setup).*

**Option B: Standard Web Preview**
If you just want to view the UI in your web browser:
```bash
npm run dev
```

## 📦 Building the Executable

To package the application into a standalone executable (e.g., `.exe` for Windows):

```bash
npm run build:exe
```
This will create a `release/` folder containing the packaged setup file.

*(Note: If `npm run build:exe` says "Missing script", make sure you have the absolute latest `package.json` from the repository, as this script was recently added!)*

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📝 License

This project is licensed under the GNU General Public License v3.0 (GPLv3).
