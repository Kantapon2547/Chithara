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


### 🔐 Authentication

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

## 🔐 Environment Variables (.env)

This project uses a `.env` file to store sensitive configuration.

### Required variables (backend):

```env
GENERATOR_STRATEGY=suno
SUNO_CALLBACK_URL="https://example.com/callback"
SUNO_API_BASE_URL=https://api.sunoapi.org
SUNO_API_KEY=your-api-key
GOOGLE_CLIENT_ID=your_google_client_id
```

### Required variables (frontend):

Users need to create a .env file inside the frontend folder:

```env
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

🔐 Security reminder :

```env
- REACT_APP_GOOGLE_CLIENT_ID → safe for frontend
- Google Client ID → backend only
```

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

## Strategy Pattern overview

```
SongGeneratorStrategy (abstract base - strategies.py)
│
├── generate(request: SongGenerationRequest) → SongGenerationResult
└── get_status(task_id: str) → SongGenerationResult
│
├── MockSongGeneratorStrategy
│     → Offline strategy (no API calls, deterministic MP3 response)
│
└── SunoSongGeneratorStrategy
      → Production strategy (calls Suno API: api.sunoapi.org)
```

Strategy is selected once in `generation/selector.py` — no scattered if/else anywhere else.

---


