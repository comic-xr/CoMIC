# README: Therapeutic Chatbot for Senior Well-being

This is the final project for the course CS692 under the guidance of Professor Bo Han and TA Ruizhi Cheng.

## 1. Project Overview

This project provides a privacy-focused, empathetic conversational AI to support senior citizens' mental well-being. It uses a local Large Language Model (LLM via Ollama) to keep conversations private, offers text and voice interaction, and personalizes chats using local history. The goal is to offer companionship and emotional support securely, based on the principles outlined in the associated research paper.

**Key Features:**
* **Privacy-First:** Local LLM (Gemma 3) ensures data stays on the user's device.
* **Empathetic Dialogue:** AI delivers short, caring, and validating responses.
* **Multi-modal Accessibility:** Text and voice input/output (Web Speech API).
* **Secure Authentication:** Google OAuth 2.0 for login.
* **Personalized Context:** Local SQLite DB for conversation history.
* **Basic Safety Measures:** Keyword detection for high-risk user statements.

## 2. Data Handling

* **Collected Data:**
    * **Simulated User Profiles (`1.txt`, Paper Appendix A):** Informs the LLM's persona (mood, social life, interests, communication style) for more empathetic responses. This is loaded into the `SYSTEM_PROMPT`.
    * **User Authentication (Google OAuth):** Google ID, name, email, profile picture. Stored in `User` table (SQLite).
    * **Conversation Data (User & Bot):** Messages, roles, timestamps. Stored in `Conversation` table (SQLite) for context.
    * **High-Risk Keywords (`app.py`):** Predefined list to trigger a safety message.
* **Processing:**
    * **Prompt Engineering:** A detailed `SYSTEM_PROMPT` in `app.py` guides the LLM, incorporating general persona instructions and personalized context from `1.txt`.
    * **History Management:** Recent conversation turns are fetched from the local DB and added to the LLM prompt for context.
    * **LLM Interaction:** The backend sends the full prompt to the local Ollama API; the LLM response is streamed back.
    * **STT/TTS:** Browser's Web Speech API handles voice-to-text and text-to-speech.

## 3. Application Workflow

1.  **Login:** User visits the app, is redirected to `/login`, and authenticates via Google OAuth.
2.  **Authorization:** The app verifies the Google callback, creates/updates a user record in the local DB, and starts a session.
3.  **Chat:** User is redirected to the chat page (`home.html`). An initial greeting is shown. User interacts via text or voice.
4.  **Backend:** User messages go to `/chat`. The message is saved, checked for risk keywords, and combined with history and the system prompt. This is sent to Ollama.
5.  **Response:** The LLM's response is streamed to the UI. If TTS is on, it's spoken. The response is saved to the DB.
6.  **Logout:** User session is cleared, redirecting to login.

## 4. Getting Started

### 4.1. Prerequisites
* Python 3.x
* Ollama installed & running (e.g., `ollama pull gemma3:1b`)
* Modern Web Browser (with Web Speech API support)

### 4.2. Setup
1.  **Files:** Ensure `app.py`, `templates/home.html`, `templates/login.html`, and `prompts/1.txt` are correctly placed.
2.  **Dependencies:** `pip install Flask Flask-SQLAlchemy Flask-Login authlib python-dotenv requests`
3.  **Environment (`.env` file):** Create `.env` in the project root with:
    ```env
    FLASK_SECRET_KEY='your_strong_secret_key'
    DATABASE_URL='sqlite:///chatbot_app.db'
    GOOGLE_CLIENT_ID='YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
    GOOGLE_CLIENT_SECRET='YOUR_GOOGLE_CLIENT_SECRET'
    GOOGLE_DISCOVERY_URL='[https://accounts.google.com/.well-known/openid-configuration](https://accounts.google.com/.well-known/openid-configuration)'
    # MODEL_NAME='gemma3:1b' # Optional: if different from app.py default
    # OLLAMA_API_URL='http://localhost:11434/api/chat' # Optional
    ```
    * **Google OAuth:** Configure credentials in Google Cloud Console. Add `http://127.0.0.1:5000/authorize` as an Authorized Redirect URI.

### 4.3. Running
1.  Ensure Ollama service is active with the required model.
2.  From project root: `python app.py`
3.  Access: `http://127.0.0.1:5000`

## 5. Reproducing the Setup

1.  **System:** Machine capable of running Ollama & Python 3.x.
2.  **Ollama:** Install, start service, pull LLM model (e.g., `ollama pull gemma3:1b`).
3.  **Project Files:** Copy `app.py`, `templates/`, `prompts/`, and your `.env` file.
4.  **Python Env:** (Recommended: use a virtual environment) Install dependencies as above.
5.  **Google OAuth:** Set up new credentials in Google Cloud Console, update `.env`, and ensure redirect URIs are correct for your deployment.
6.  **Run:** `python app.py`. The database (`chatbot_app.db`) will be created automatically.

## 6. File Structure

```markdown
.
├── .env
├── app.py
├── prompts
│   └── 1.txt
├── templates
│   ├── home.html
│   └── login.html
├──── README.md
└──── chatbot_app.db  # Created on first run
```     
## 7. Key Technologies

* **Backend:** Flask, SQLAlchemy, Flask-Login, Authlib, Requests, Dotenv
* **Frontend:** HTML, CSS, JavaScript, Web Speech API
* **LLM:** Ollama, Gemma 3
* **Database:** SQLite
