# Chithara

This project is a Django-based backend for managing AI-generated music, featuring user quotas, album organization, and a sharing system with access control.

## 🧠 Design Pattern: Strategy Pattern

This project uses the Strategy Pattern to handle AI music generation dynamically.

### Why Strategy Pattern is used
- Allows switching between Mock and Suno without changing business logic
- Keeps generation logic separated and modular
- Makes testing possible without external API dependency

### Context Class
A context class manages strategy execution at runtime by holding a reference to a selected strategy and delegating all generation operations to it.

This allows the system to switch between Mock and Suno implementations dynamically without modifying the core service layer.


###  Strategy Selection (Factory Layer)

The system uses a selector/factory layer to choose the correct strategy:

- Mock strategy → used for local development/testing
- Suno strategy → used for real AI generation


### Authentication

The system supports Google Authentication on the frontend.

- Google OAuth Client ID is used in React environment variables
- Backend verifies and manages user sessions

⚠️ Sensitive credentials (client secrets, API keys) are never exposed in frontend.


---
## 🧪 Testing Strategy

### Mock Mode Test
- No external API required
- Returns deterministic MP3 URL
- Used for frontend development

### Suno Mode Test
- Requires valid SUNO_API_KEY
- Sends real API request
- Returns task-based async response

### Debugging Output
- Django management command prints:
  - taskId
  - status
  - audio URLs
  
---

## 🛠 Features & Entities
The following entities are implemented with full CRUD functionality via the Django Admin interface, strictly following the provided Domain Model:

- **Users**: System users with profile management.
- **Quota**: Usage constraints (weekly limits) per user.
- **Album**: Logical collections for organizing songs.
- **Song**: AI-generated music with specific Enumerations (Genre, Mood, Occasion, Generation Status, and Privacy Status).
- **ShareLink**: Mechanism to share specific Songs or Albums via unique URLs.
- **Invitation**: Controlled access grants for shared content via email.

## CRUD Functionality

* **Create**: New records can be added through the Django Admin panel.
* **Read**: Existing records can be viewed in list and detail views.
* **Update**: Records can be modified using the edit functionality.
* **Delete**: Records can be removed from the database.

##  📦  Requirements

Make sure you already install backend dependencies:
```bash
asgiref==3.11.1
certifi==2026.2.25
cffi==2.0.0
charset-normalizer==3.4.7
cryptography==47.0.0
Django==5.2.12
django-cors-headers==4.9.0
djangorestframework==3.17.1
djangorestframework_simplejwt==5.5.1
google-auth==2.49.2
idna==3.11
pyasn1==0.6.3
pyasn1_modules==0.4.2
pycparser==3.0
PyJWT==2.12.1
python-dotenv==1.2.2
requests==2.33.1
sqlparse==0.5.5
typing_extensions==4.15.0
tzdata==2025.3
urllib3==2.6.3
```

###  Google Auth (frontend)

If you're using Google Login, make sure you install the required npm package:
```bash
npm install @react-oauth/google
```

## 🚀 Install and Run

### 1. Environment Setup

It is recommended to use a virtual environment to manage dependencies.

   ```bash
   # Clone the project
   git clone https://github.com/Kantapon2547/Chithara.git
   cd Chithara/backend

  # Create Virtual Environment
  python -m venv venv

  # Activate Virtual Environment
  # On Windows:
  .\venv\Scripts\activate
  
  # On Mac/Linux:
  source venv/bin/activate
   ```
   
### 2️⃣ Backend Setup & Install dependencies.

Dependencies include specific versions (e.g., Django 4.2+) to ensure compatibility.
   ```bash
   pip install -r requirements.txt
   ```

###  Database & Admin Setup
Follow these steps in order to initialize the system:
   ```bash
   cd backend
   
   # Apply database migrations
   python manage.py migrate

  # Create a superuser account
  python manage.py createsuperuser

  # Run the development server
  python manage.py runserver
   ```

### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
npm start
```


---

## 🖥️ Usage
- Open your browser and navigate to: http://127.0.0.1:8000/admin
- Log in with the superuser credentials you created.
- Frontend runs at: http://localhost:3000

---

## 🔐 Google Login Setup (OAuth Client ID)


### Step 1: Open Google Cloud Console

Go to: https://console.cloud.google.com/

- Sign in with your Google account
- Select or create a project (top project dropdown)

### Step 2: Enable OAuth Setup

In the left menu:

- Go to APIs & Services → OAuth consent screen
- Click Get Started (if not configured)

Fill in:
```bash
App name: Chithara
User support email: your email
Audience: External
Developer contact email: your email

Click Create
```

### Step 3: Create OAuth Client ID

Go to:

APIs & Services → Credentials → Create Credentials → OAuth Client ID

Then configure:

Application type: Web application
Name: Chithara Web Client

### Step 4: Add Authorized Origins

Under Authorized JavaScript origins, add:

```bash
http://localhost:3000
```

(Optional production)
```bash
https://your-domain.com
```

### Step 5: Add Redirect URIs

Under Authorized redirect URIs, add:

```bash
http://localhost:3000
```

(Optional production)

```bash
https://your-domain.com
```

### Step 6: Get Client ID

After creation, Google will show:

```bash
Client ID:
xxxxxxxxxxxx.apps.googleusercontent.com
```

### Step 7: Add to Frontend .env

Create .env in frontend:

```bash
REACT_APP_GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
```

---

## Environment Variables (.env)

This project uses a `.env` file to store sensitive configuration.

### Required variables (backend):

```env
GENERATOR_STRATEGY=suno
SUNO_CALLBACK_URL="https://example.com/callback"
SUNO_API_BASE_URL=https://api.sunoapi.org
SUNO_API_KEY=your-api-key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Required variables (frontend):

Users need to create a .env file inside the frontend folder:

```env
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

### Security reminder :


- REACT_APP_GOOGLE_CLIENT_ID → frontend only (safe to expose)
- GOOGLE_CLIENT_SECRET → backend only (never expose)


---

## How to run

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Apply migrations
```bash
python manage.py migrate
```

### 3. Run in Mock mode (default, no API key needed)
```bash
python manage.py demo_generation --strategy mock
```

Expected output:
```
=== Active strategy: MOCK ===
Using: MockSongGeneratorStrategy
[1] Calling generate()...
  taskId  : mock-abc123def456
  status  : SUCCESS
  audioUrl: https://mock-storage.example.com/placeholder_audio.mp3
[2] Calling get_status()...
  status  : SUCCESS
Demo complete.
```

### 4. Run in Suno mode (requires a real API key)
```bash
export SUNO_API_KEY="your-real-suno-api-key"

python manage.py demo_generation --strategy suno
```
This will:
```bash
1. POST to `https://api.sunoapi.org/api/v1/generate` → prints taskId
2. GET `https://api.sunoapi.org/api/v1/generate/record-info?taskId=...` → prints status
```

### 5. Where to put the Suno API key
**Never commit the key.** Set it as an environment variable:
```bash
export SUNO_API_KEY="sk-..."        # Linux/macOS
set SUNO_API_KEY=sk-...             # Windows CMD
$env:SUNO_API_KEY="sk-..."          # PowerShell
```

---

## 🛠 Troubleshooting

### 1. Suno API returns 429 - insufficient credits

Error:
```bash
{"code":429,"msg":"The current credits are insufficient"}
```
Cause: 
- Your Suno API account has no credits

Solution:

- Top up your Suno API account or login as a new account to new API key
- Or switch to mock mode:
```bash
python manage.py demo_generation --strategy mock
```

### 2. React Google Login not working

Check:

- ```REACT_APP_GOOGLE_CLIENT_ID``` exists

Fix:
```bash
npm install @react-oauth/google
npm start
```

Restart frontend after .env changes.

---

## Strategy Pattern overview

The system uses Strategy Pattern to separate generation logic:

- Mock Strategy → local testing (no API)
- Suno Strategy → production AI generation s
- Selection is handled in `generation/selector.py`, keeping service layer clean and extensible.



