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
   cd Chithara/chithara

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
