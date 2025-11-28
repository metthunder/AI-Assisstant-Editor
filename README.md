# 📝 AI-Assisted Text Editor (React + TypeScript + XState + ProseMirror)

This project implements an AI-powered text editor as described in the assignment.  
The user can type in a ProseMirror editor and click **Continue Writing** to generate AI-powered text using the Gemini API.

---

## 🚀 Features

- Built using **React + TypeScript**
- Uses **XState** for editor state management
- Rich-text editor implemented using **ProseMirror**
- Backend powered by **Node.js + Express**
- AI continuation powered by **Gemini API**
- Clean architecture & easily extendable

---

## 📁 Project Structure

```bash
root/
├── src/              # React + TS + ProseMirror + XState
├── src/server.js     # Node.js Express Server using Gemini API
├── requirements.txt
└── README.md
```

---

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/metthunder/AI-Assisstant-Editor
cd ai-editor
```
### 2. Install Required Dependencies 

```bash
npm install $(cat requirements.txt | tr '\n' ' ')
```

## 🔐 Environment Setup
Create .env file inside the src/ folder
(where server.js exists)

GEMINI_API_KEY=your_api_key_here

Make sure:
.env is inside src/
Same directory as server.js

## ▶️ Running the Backend (server.js)
The backend server is inside the src folder.

Start it using:

```bash
node src/server.js
```

The backend will run on:
http://localhost:3001

## ▶️ Running the Frontend
Since frontend code (App.tsx, components, machines, editor, etc.) also lives inside src/, simply run:

```bash
npm start
```

Frontend will run on:
http://localhost:3000
