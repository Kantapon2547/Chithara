# Chithara

This project is a Django-based backend for managing AI-generated music, featuring user quotas, album organization, and a sharing system with access control.

## 📊 Traceability & Implementation Notes
- **Enumerations**: The Song model now includes all Enumerations defined in the Domain Model (Pop, Rock, Happy, Sad, etc.) as selectable choices in the Admin panel.

- **Sharing System**: ShareLink and Invitation models have been implemented to satisfy the requirement for controlled access to private content.

CRUD operations are implemented using the **Django Admin interface**, which allows direct interaction with persisted data in the database.

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
   
### 2. Install dependencies.

Dependencies include specific versions (e.g., Django 4.2+) to ensure compatibility.
   ```bash
   pip install -r requirements.txt
   ```

### 3. Database & Admin Setup
Follow these steps in order to initialize the system:
   ```bash
   # 1. Apply database migrations
   python manage.py migrate

  # 2. Create a superuser account (Required for Admin Access)
  python manage.py createsuperuser

  # 3. Run the development server
  python manage.py runserver
   ```

## 🖥️ Usage
- Open your browser and navigate to: http://127.0.0.1:8000/admin
- Log in with the superuser credentials you created.

---

## CRUD Operations

Screenshots of CRUD operations are included to demonstrate:

* Creating new users

![](Screenshot/Create_User.jpg)

* Viewing records

![](Screenshot/Read_Operation.jpg)

* Updating records

![](Screenshot/Update_User.jpg)

* Deleting records

![](Screenshot/Delete_Album.jpg)

xercise 4

### Files added (`generation/` app)

| File | Purpose |
|---|---|
| `generation/strategies.py` | **Strategy interface** + both concrete strategies |
| `generation/selector.py` | **Centralised strategy selector** – reads `GENERATOR_STRATEGY` |
| `generation/models.py` | `GenerationJob` model – persists taskId + status |
| `generation/services.py` | Application service – wires strategy to model |
| `generation/admin.py` | Django Admin for `GenerationJob` |
| `generation/migrations/` | DB migration for `GenerationJob` |
| `generation/management/commands/demo_generation.py` | `manage.py demo_generation` |

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
1. POST to `https://api.sunoapi.org/api/v1/generate` → prints taskId
2. GET `https://api.sunoapi.org/api/v1/generate/record-info?taskId=...` → prints status

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
SongGeneratorStrategy  (abstract, strategies.py)
├── generate(request) → SongGenerationResult
└── get_status(task_id) → SongGenerationResult

    ├── MockSongGeneratorStrategy  ← offline, deterministic
    └── SunoSongGeneratorStrategy  ← calls api.sunoapi.org
```

Strategy is selected once in `generation/selector.py` — no scattered if/else anywhere else.

---

## Run the server
```bash
python manage.py createsuperuser
python manage.py runserver
# http://127.0.0.1:8000/admin
```
