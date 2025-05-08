import os
import json
import logging
import requests
from datetime import datetime, timezone
from uuid import uuid4


from flask import (
    Flask, request, render_template, Response, jsonify,
    redirect, url_for, session, flash
)
from flask_sqlalchemy import SQLAlchemy
from flask_login import (
    LoginManager, UserMixin, login_user, logout_user,
    current_user, login_required
)
from authlib.integrations.flask_client import OAuth
from dotenv import load_dotenv


load_dotenv()


app = Flask(__name__) 
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'strong-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///chatbot_app.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['GOOGLE_CLIENT_ID'] = os.environ.get('GOOGLE_CLIENT_ID')
app.config['GOOGLE_CLIENT_SECRET'] = os.environ.get('GOOGLE_CLIENT_SECRET')
app.config['GOOGLE_DISCOVERY_URL'] = os.environ.get('GOOGLE_DISCOVERY_URL')


db = SQLAlchemy(app)

login_manager = LoginManager()
login_manager.init_app(app)

login_manager.login_view = 'login_page'

login_manager.login_message = "Please log in to access this page."
login_manager.login_message_category = "info" 


oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=app.config['GOOGLE_CLIENT_ID'],
    client_secret=app.config['GOOGLE_CLIENT_SECRET'],
    server_metadata_url=app.config['GOOGLE_DISCOVERY_URL'],
    client_kwargs={
        'scope': 'openid email profile'
    }
)


MODEL_NAME = "gemma3:1b"
OLLAMA_API_URL = "http://localhost:11434/api/chat"
LOG_FILE = "chatbot_conversation.log"
LOG_LEVEL = logging.INFO
CONVERSATION_CONTEXT_LENGTH = 100

log_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
log_handler = logging.FileHandler(LOG_FILE)
log_handler.setFormatter(log_formatter)

app.logger.addHandler(log_handler)
app.logger.addHandler(logging.StreamHandler())
app.logger.setLevel(LOG_LEVEL)


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    google_id = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(100), unique=True, nullable=True)
    profile_pic = db.Column(db.String(200), nullable=True)
    conversations = db.relationship('Conversation', backref='author', lazy='dynamic')
    def __repr__(self): return f'<User {self.name}>'

class Conversation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    role = db.Column(db.String(10), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    def __repr__(self): return f'<Conversation {self.id} by User {self.user_id}>'


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

with open(r"prompts/1.txt", "r", encoding="utf-8") as f:
    personalized_prompt = f.read()
    personalized_prompt = personalized_prompt.replace("\n", " ").strip()



SYSTEM_PROMPT = f'''
You are a compassionate, empathetic, and supportive conversational companion AI named 'Companion'. You are designed specifically for senior citizens. Your role is to provide mental health support through **very short, concise, and caring dialogue (typically 1-3 sentences)**. Please follow these guidelines strictly:

1.  **Initial Greeting ONLY**: Greet the user warmly *once* at the very beginning using their name (e.g., "Hello [Name], it's nice to meet you."). **After this first greeting, DO NOT use "Hello" or similar greetings again.** Respond directly to what the user says.
2.  **Empathetic & Concise Responses**: Keep each response **brief (1-3 sentences)**, warm, and validating. Use simple, clear language. Avoid jargon or unnecessary elaboration. Sound like a real, caring person.
3.  **Acknowledge & Validate Feelings**: Listen attentively. Validate appropriately. If they express sadness, pain, distress, acknowledge the difficulty with genuine empathy (e.g., "I'm so sorry to hear you're going through that," "That sounds incredibly difficult,"). **Do not use generic cheerful responses when the user is distressed.**
4.  **Single, Relevant Question**: **Ask only ONE brief, gentle, open-ended follow-up question per turn.** It MUST directly relate to the core feeling or topic just shared (e.g., "Is there anything about that you'd like to share?" or "What does that feel like for you?").
5.  **Use Conversation History Subtly**: Use recent history for context naturally. **Do not explicitly state 'I remember you said...'**.
6.  **Privacy**: Only mention if asked: "Your privacy is important. Our chats are confidential."
7.  **Crisis Handling (IMPORTANT)**: If severe distress/self-harm mentioned, *immediately* and gently provide *only* this safety response: "I'm concerned about what you're saying, and it's important to get support right away. Please reach out to a trusted person, a crisis hotline, or emergency services. You are not alone, and help is available."
8.  **Consistent Tone**: Maintain a consistently warm, respectful, patient, caring, and non-judgmental tone.

{personalized_prompt}
'''


HIGH_RISK_KEYWORDS = [
    "kill myself", "suicide", "suicidal", "end my life", "hopeless",
    "can't go on", "want to die", "hurt myself", "no reason to live",
    "devastated", "cheat", "cheated",
]
SAFETY_MESSAGE_SUFFIX = "\n\n*Companion's Note: If you're feeling overwhelmed or distressed, please remember help is available. You can reach out to a crisis hotline, a trusted friend or family member, or emergency services. You don't have to go through this alone.*"


def query_ollama_stream(conv_history_with_prompt, user_id, risk_detected=False):
    
    payload = { "model": MODEL_NAME, "messages": conv_history_with_prompt, "stream": True, "options": {} }
    final_response = ""
    try:
        app.logger.debug(f"Sending payload to Ollama for user {user_id} (History length: {len(conv_history_with_prompt)}): {json.dumps(payload, indent=0)}")
        with requests.post(OLLAMA_API_URL, json=payload, stream=True, timeout=120) as r:
            r.raise_for_status()
            for line in r.iter_lines(decode_unicode=True):
                if line:
                    try:
                        data = json.loads(line)
                        if data.get("done") is False and "message" in data and "content" in data["message"]:
                            chunk = data["message"]["content"]
                            final_response += chunk; yield chunk
                        elif data.get("done") is True:
                            app.logger.debug(f"Ollama stream finished for user {user_id}.")
                            if not final_response and "message" in data and "content" in data["message"]: final_response = data["message"]["content"]
                            if 'message' in data and 'content' in data['message']: app.logger.info(f"LLM Raw Response (user {user_id}): {data['message']['content']}")
                            elif final_response: app.logger.info(f"LLM Raw Response (user {user_id}, accumulated): {final_response}")
                            else: app.logger.warning(f"LLM stream finished for user {user_id} but no final response content captured.")
                            break
                    except json.JSONDecodeError as json_err: app.logger.error(f"JSON decode error... {json_err}"); yield ""
                    except Exception as stream_err: app.logger.error(f"Error processing stream line... {stream_err}"); yield "[Error processing response chunk]"
            if risk_detected: app.logger.warning(f"High-risk keyword detected... Appending safety note."); yield SAFETY_MESSAGE_SUFFIX
    except requests.exceptions.RequestException as req_err: app.logger.error(f"Ollama API request failed... {req_err}"); yield "[Error: Could not connect...]"
    except Exception as e: app.logger.exception(f"Unexpected error during query_ollama_stream..."); yield "[Error: An unexpected error occurred.]"




@app.route('/')
@login_required 
def home():
    """Serves the main chat page for logged-in users."""
    user_name = current_user.name if hasattr(current_user, 'name') else 'there'
    return render_template('home.html', current_user_name=user_name)


@app.route('/login')
def login_page():
    """Serves the login page. Redirects home if already logged in."""
    
    
    return render_template('login.html')


@app.route('/google-login')
def google_login():
    """Redirects to Google for authentication."""
    if not app.config.get('GOOGLE_CLIENT_ID') or not app.config.get('GOOGLE_CLIENT_SECRET'):
         app.logger.error("Google OAuth Client ID or Secret not configured!")
         flash("Authentication setup error. Please contact support.", "error")
         return redirect(url_for('login_page'))

    nonce = str(uuid4())
    session['nonce'] = nonce
    
    redirect_uri = url_for('authorize', _external=True)
    app.logger.info(f"Generated Nonce: {nonce}")
    app.logger.info(f"Redirect URI for Google: {redirect_uri}")
    return google.authorize_redirect(redirect_uri, nonce=nonce)


@app.route('/authorize') 
def authorize():
    """Handles the OAuth callback from Google."""
    app.logger.info("Handling /authorize callback...")
    try:
        token = google.authorize_access_token()
        if not token or 'id_token' not in token:
            app.logger.error("Failed to fetch token or id_token missing.")
            flash("Authentication failed: Could not retrieve token.", "error")
            return redirect(url_for('login_page'))

        nonce = session.pop('nonce', None)
        if nonce is None:
            app.logger.error("Nonce missing from session during callback.")
            flash("Authentication failed: Session mismatch.", "error")
            return redirect(url_for('login_page'))

        try:
            userinfo = google.parse_id_token(token, nonce=nonce)
        except Exception as id_token_error:
            app.logger.error(f"ID Token validation failed during parse: {id_token_error}")
            flash(f"Authentication failed: Invalid user session.", "error")
            return redirect(url_for('login_page'))

        google_id = userinfo.get('sub')
        if not google_id:
            app.logger.error("Missing 'sub' (Google ID) in userinfo.")
            flash("Authentication failed: Missing user identifier.", "error")
            return redirect(url_for('login_page'))

        
        user = User.query.filter_by(google_id=google_id).first()
        email = userinfo.get('email')
        name = userinfo.get('name')
        picture = userinfo.get('picture')

        if not user:
            user = User(google_id=google_id, name=name, email=email, profile_pic=picture)
            db.session.add(user)
            db.session.commit()
            app.logger.info(f"New user created: {name} ({email}) ID: {user.id}")
        else:
            user.name = name; user.email = email; user.profile_pic = picture 
            db.session.commit()
            app.logger.info(f"User logged in: {name} ({email}) ID: {user.id}")

        login_user(user, remember=True)
        app.logger.info(f"User {user.id} successfully logged in via Flask-Login.")
        
        return redirect(url_for('home'))

    except Exception as e:
        app.logger.exception("Error during Google OAuth callback processing")
        flash("Authentication failed due to an internal error.", "error")
        return redirect(url_for('login_page'))

@app.route('/logout')
@login_required
def logout():
    logout_user()
    session.clear()
    
    app.logger.info(f"User {current_user.id if hasattr(current_user, 'id') else 'N/A'} logged out, redirecting to login_page.")
    
    target_url = url_for('login_page')
    app.logger.info(f"Redirecting to: {target_url}") 
    return redirect(target_url)


@app.route('/get_initial', methods=['GET'])
@login_required
def get_initial_messages():
    """Provides ONLY the initial greeting message for the UI."""
    try:
        user_name = current_user.name if hasattr(current_user, 'name') and current_user.name else "there"
        initial_greeting = f"Hello {user_name}, it's nice to meet you. How are you feeling today?"
        display_msgs = [{"sender": "Bot", "text": initial_greeting}]
        app.logger.info(f"Providing initial UI greeting for user {current_user.id}")
        return jsonify(display_msgs)
    except Exception as e:
        app.logger.exception(f"Error generating initial greeting for user {current_user.id}")
        return jsonify([{"sender": "Bot", "text": "Hello! How can I help you today?"}]), 500 



@app.route('/chat', methods=['POST'])
@login_required 
def chat():
    """Handles incoming chat messages from logged-in users."""
    user_id = current_user.id
    user_name = current_user.name

    data = request.get_json()
    user_input = data.get("user_input", "").strip()

    if not user_input: return jsonify({"response": "Empty message received."}), 400
    app.logger.info(f"User {user_id} ({user_name}): {user_input}")

    
    try:
        user_message_db = Conversation(user_id=user_id, role="user", content=user_input)
        db.session.add(user_message_db)
        db.session.commit()
        app.logger.debug(f"Saved user message (ID: {user_message_db.id}) for user {user_id}")
    except Exception as e:
        db.session.rollback(); app.logger.exception(f"Failed to save user message..."); return jsonify({"error": "..."}), 500

    
    risk_detected = False
    for keyword in HIGH_RISK_KEYWORDS:
        if keyword in user_input.lower():
            risk_detected = True; app.logger.warning(f"High-risk keyword '{keyword}' detected..."); break

    
    try:
        recent_messages_db = Conversation.query.filter_by(user_id=user_id).order_by(Conversation.timestamp.desc()).limit(CONVERSATION_CONTEXT_LENGTH * 2).all()
        recent_messages_db.reverse()
        history_for_api = [{"role": "system", "content": SYSTEM_PROMPT}]
        for msg in recent_messages_db: history_for_api.append({"role": msg.role, "content": msg.content})

        
        response_stream = query_ollama_stream(history_for_api, user_id, risk_detected=risk_detected)

        
        def generate_and_save():
            
            full_bot_response_content = ""
            stream_error_occurred = False
            try:
                for chunk in response_stream:
                    if isinstance(chunk, str) and chunk.startswith("[Error:"): stream_error_occurred = True; app.logger.error(f"Stream yielded error for user {user_id}: {chunk}")
                    if chunk != SAFETY_MESSAGE_SUFFIX: full_bot_response_content += chunk
                    yield chunk
            except Exception as stream_error: stream_error_occurred = True; app.logger.error(f"Error DURING stream consumption... {stream_error}"); yield "[Error processing stream]"
            with app.app_context():
                app.logger.debug(f"Stream finished... Response length: {len(full_bot_response_content)}. Error occurred: {stream_error_occurred}")
                if not stream_error_occurred and full_bot_response_content:
                    try:
                        cleaned_response = full_bot_response_content.replace(SAFETY_MESSAGE_SUFFIX, '').strip()
                        if cleaned_response:
                            bot_message_db = Conversation(user_id=user_id, role="assistant", content=cleaned_response)
                            db.session.add(bot_message_db); db.session.commit()
                            app.logger.info(f"Successfully saved bot response (ID: {bot_message_db.id})...")
                        else: app.logger.info(f"Bot response empty after cleaning...")
                    except Exception as e: db.session.rollback(); app.logger.exception(f"Failed to save bot response...")
                elif stream_error_occurred: app.logger.error(f"Bot response NOT saved due to stream error.")
                else: app.logger.info(f"Bot response was empty, not saving.")

        return Response(generate_and_save(), mimetype="text/plain; charset=utf-8")

    except Exception as e:
         app.logger.exception(f"Error preparing history or calling stream function...")
         return jsonify({"error": "Failed to generate response."}), 500


if __name__ == "__main__":
    with app.app_context():
        print("Creating database tables if they don't exist...")
        try:
            db.create_all()
            print("Database tables checked/created successfully.")
        except Exception as db_error:
             print(f"Error creating database tables: {db_error}")
             exit(1) 

    
    print("\n--- Configuration Verification ---")
    SECRET_KEY_OK = os.environ.get('FLASK_SECRET_KEY') and os.environ.get('FLASK_SECRET_KEY') != 'you-must-set-a-real-secret-key'
    GOOGLE_ID_OK = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_SECRET_OK = os.environ.get('GOOGLE_CLIENT_SECRET')
    print(f"SECRET_KEY Loaded: {'Yes' if SECRET_KEY_OK else 'NO - Set a strong secret key!'}")
    print(f"DATABASE_URL: {app.config.get('SQLALCHEMY_DATABASE_URI')}")
    print(f"GOOGLE_CLIENT_ID Loaded: {'Yes' if GOOGLE_ID_OK else 'NO - Missing!'}")
    print(f"GOOGLE_CLIENT_SECRET Loaded: {'Yes' if GOOGLE_SECRET_OK else 'NO - Missing!'}")
    if not SECRET_KEY_OK or not GOOGLE_ID_OK or not GOOGLE_SECRET_OK:
        print("\n*** CRITICAL CONFIGURATION MISSING! Please check your .env file. ***\n")
        exit(1)
    print("--- LLM Settings ---")
    
    print(f"Using Ollama model: {MODEL_NAME} at {OLLAMA_API_URL}")
    print(f"Logging to: {LOG_FILE}")
    print(f"Conversation Context Length (Pairs): {CONVERSATION_CONTEXT_LENGTH}")
    print("High-Risk Keywords Active:", len(HIGH_RISK_KEYWORDS) > 0)


    print("\nStarting Flask app...")
    print("Access the chatbot at: http://127.0.0.1:5000")
    app.run(debug=True, host='127.0.0.1', port=5000) 