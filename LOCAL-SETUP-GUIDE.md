# 🏃 LOCAL SETUP GUIDE - StandUp CrossFit

**Përshkrimi:** Hap-pas-hapi si ta nisësh sistemin lokalisht në computerin tënd

---

## 📋 PARA SE TË FILLOSH

### Kërkesat
- **Git** - për të klonuar repo
- **Node.js 18+** - për frontend
- **.NET 8 SDK** - për backend
- **MySQL 8.0+** - për database
- **VS Code** (optional) - për editing

### Instaloni:

#### macOS (me Homebrew)
```bash
# Install Homebrew first
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install prerequisites
brew install node dotnet mysql git

# Verify installations
node --version      # v20+
dotnet --version    # 8.0+
mysql --version     # 8.0+
```

#### Windows
1. Download & install:
   - [Node.js](https://nodejs.org) (v20+)
   - [.NET 8 SDK](https://dotnet.microsoft.com/download)
   - [MySQL](https://dev.mysql.com/downloads/mysql/)
   - [Git](https://git-scm.com)

2. Verify in PowerShell:
```powershell
node --version
dotnet --version
mysql --version
```

#### Linux (Ubuntu/Debian)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs dotnet-sdk-8.0 mysql-server git
```

---

## 🗂️ FOLDER STRUCTURE

```
StandUpCrossFit/
├── backend/              # .NET API
│   ├── Controllers/
│   ├── Models/
│   ├── Services/
│   ├── Data/
│   ├── appsettings.json
│   └── StandUpFitness.csproj
├── frontend/             # React + Vite
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml    # Docker setup
└── README.md
```

---

## 🚀 STEP-BY-STEP SETUP

### STEP 1: Clone/Navigate to Project

```bash
# If you have the code on your computer
cd /Users/bardhgashi/Claude/Projects/StandUpCrossFit

# Or if cloning from GitHub (when ready)
git clone https://github.com/yourusername/standup-crossfit.git
cd standup-crossfit
```

---

### STEP 2: Setup MySQL Database

#### Start MySQL Server

**macOS:**
```bash
brew services start mysql
```

**Windows:**
```powershell
# MySQL should auto-start, or:
net start MySQL80
```

**Linux:**
```bash
sudo systemctl start mysql
```

#### Create Database & User

```bash
# Connect to MySQL
mysql -u root -p
# (Enter root password or just press Enter if no password)

# Then run these commands:
CREATE DATABASE standup_fitness;
CREATE USER 'fitness_user'@'localhost' IDENTIFIED BY 'fitness_password_123';
GRANT ALL PRIVILEGES ON standup_fitness.* TO 'fitness_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Verify:**
```bash
mysql -u fitness_user -p
# Password: fitness_password_123

SHOW DATABASES;  # Should show standup_fitness
EXIT;
```

---

### STEP 3: Setup Backend (.NET)

```bash
cd backend

# Restore NuGet packages
dotnet restore

# Update database schema
dotnet ef database update

# Run migrations (creates tables)
dotnet ef migrations add InitialCreate
dotnet ef database update
```

**Expected output:**
```
Done. To undo this action, use 'ef migrations remove'
Applying migration '20240615120000_InitialCreate'
Done.
```

#### Verify Database Tables Created

```bash
mysql -u fitness_user -p standup_fitness

# You should see tables:
SHOW TABLES;
# Output: Users, Trainers, Clients, WorkoutPlans, etc.
EXIT;
```

---

### STEP 4: Setup Frontend (React)

```bash
cd frontend

# Install dependencies
npm install

# Install additional packages
npm install jspdf html2canvas recharts

# Verify package.json has these dependencies
cat package.json | grep -A 10 '"dependencies"'
```

**Expected dependencies:**
```json
"react": "^18.x",
"vite": "^5.x",
"tailwindcss": "^3.x",
"shadcn/ui": "latest",
"jspdf": "^2.x",
"html2canvas": "^1.x",
"recharts": "^2.x"
```

---

### STEP 5: Configure appsettings.json

**File location:** `backend/appsettings.json`

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=standup_fitness;User=fitness_user;Password=fitness_password_123;"
  },
  "Jwt": {
    "Secret": "your-super-secret-key-minimum-64-characters-long-for-production-use-random-string",
    "Issuer": "standup-fitness-api",
    "Audience": "standup-fitness-app",
    "ExpirationMinutes": 1440
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  },
  "AllowedHosts": "*"
}
```

---

### STEP 6: Run Backend API

```bash
cd backend

# Start the API server
dotnet run

# Or with watch mode (auto-restart on changes)
dotnet watch run
```

**Expected output:**
```
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5050
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to stop.
```

✅ **Backend is running on:** `http://localhost:5050`

---

### STEP 7: Run Frontend (NEW TERMINAL TAB)

```bash
cd frontend

# Start development server
npm run dev

# Or with explicit port
npm run dev -- --port 5180
```

**Expected output:**
```
  VITE v5.0.0  ready in 234 ms

  ➜  Local:   http://localhost:5180/
  ➜  press h to show help
```

✅ **Frontend is running on:** `http://localhost:5180`

---

## 🧪 TEST LOCAL SETUP

### 1. Check Backend Health

```bash
curl http://localhost:5050/health

# Should return 200 OK
# Or if endpoint doesn't exist, try:
curl http://localhost:5050/swagger/index.html
```

### 2. Test Frontend

Open browser: `http://localhost:5180`

Should see:
- ✅ Landing page loads
- ✅ Navigation bar visible
- ✅ "About Us" link works
- ✅ "Register" button visible
- ✅ "Login" button visible

### 3. Test Registration

```
1. Click "Register"
2. Select role: "Client"
3. Fill in form:
   - Name: Your real test name
   - Email: your own local email address
   - Password: a local password
   - Phone: your local phone number
4. Click "Register"
```

✅ Should see success message

### 4. Test Login

```
1. Click "Login"
2. Email: the local email address you registered
3. Password: the local password you chose
4. Click "Login"
```

✅ Should redirect to Dashboard

### 5. Test API Directly

```bash
# Register new user
curl -X POST http://localhost:5050/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Local Operator",
    "email": "local.operator@your-domain.test",
    "password": "choose-a-local-password",
    "role": "Client",
    "phone": "044000000"
  }'

# Should return token in response
```

---

## 📁 DATABASE INSPECTION

### View Tables

```bash
mysql -u fitness_user -p standup_fitness

# List all tables
SHOW TABLES;

# View Users table
DESCRIBE Users;
SELECT * FROM Users;

# View local records
SELECT COUNT(*) FROM Users;
SELECT COUNT(*) FROM Trainers;
SELECT COUNT(*) FROM Clients;

EXIT;
```

### Reset Database (Start Fresh)

```bash
# ⚠️ WARNING: This deletes all data!

mysql -u fitness_user -p
# Password: fitness_password_123

DROP DATABASE standup_fitness;
CREATE DATABASE standup_fitness;
EXIT;

# Then re-run migrations
cd backend
dotnet ef database update
```

---

## 🐛 TROUBLESHOOTING

### "MySQL Connection Failed"

**Problem:** Backend can't connect to MySQL

**Solution:**
```bash
# 1. Check MySQL is running
mysql -u root -p

# 2. Verify credentials in appsettings.json
cat backend/appsettings.json | grep -A 1 "ConnectionStrings"

# 3. Check firewall isn't blocking port 3306
# macOS:
lsof -i :3306

# Windows (PowerShell):
netstat -ano | findstr :3306
```

---

### "Port 5000 Already in Use"

**Problem:** Backend port is taken

**Solution:**
```bash
# macOS/Linux: Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Windows (PowerShell):
netstat -ano | findstr :5000
# Then: taskkill /PID <PID> /F

# Or use different port:
dotnet run --urls "http://localhost:5002"
```

---

### "Port 5173 Already in Use"

**Problem:** Frontend port is taken

**Solution:**
```bash
# Use different port
npm run dev -- --port 3000

# Then access: http://localhost:3000
```

---

### "npm install Fails"

**Problem:** Dependencies won't install

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If still fails, check Node version:
node --version  # Should be 18+
```

---

### "dotnet build Fails"

**Problem:** Backend won't compile

**Solution:**
```bash
# Check .NET version
dotnet --version  # Should be 8.0+

# Clean and rebuild
dotnet clean
dotnet build

# Check for syntax errors
dotnet build --no-restore
```

---

## 🔄 DAILY WORKFLOW

### Terminal 1: Backend
```bash
cd /Users/bardhgashi/Claude/Projects/StandUpCrossFit/backend
dotnet watch run
```

### Terminal 2: Frontend
```bash
cd /Users/bardhgashi/Claude/Projects/StandUpCrossFit/frontend
npm run dev
```

### Browser
- Frontend: `http://localhost:5180`
- Backend API: `http://localhost:5050`
- Database: `mysql -u fitness_user -p`

---

## 🔌 API TESTING (POSTMAN/CURL)

### Register User
```bash
curl -X POST http://localhost:5050/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Local Trainer",
    "email": "local.trainer@your-domain.test",
    "password": "choose-a-local-password",
    "role": "Trainer",
    "phone": "044000000"
  }'

# Response: { "token": "eyJhbGc...", "user": {...} }
```

### Login User
```bash
curl -X POST http://localhost:5050/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "local.trainer@your-domain.test",
    "password": "choose-a-local-password"
  }'

# Response: { "token": "eyJhbGc...", "user": {...} }
```

### Get Clients (Protected Route)
```bash
TOKEN="eyJhbGc..." # From login response

curl -X GET http://localhost:5050/api/clients \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 VERIFY EVERYTHING WORKS

### Checklist

- [ ] MySQL running: `mysql -u fitness_user -p`
- [ ] Backend running: `http://localhost:5050` (terminal shows "listening")
- [ ] Frontend running: `http://localhost:5180` (page loads)
- [ ] Database tables created: `SHOW TABLES;` shows ~18 tables
- [ ] Can register new user: Form submits successfully
- [ ] Can login: Redirects to dashboard
- [ ] API responds to curl: `curl http://localhost:5050/health`

---

## 🎉 YOU'RE ALL SET!

```
Local environment is ready!

Frontend:  http://localhost:5180
Backend:   http://localhost:5050
Database:  standup_fitness (MySQL)

Next Steps:
1. Test all 4 roles (Client, Trainer, Admin, Staff)
2. Create real local records for the roles you want to test
3. Test workout plan creation
4. Test PDF export
5. Test file uploads
6. Test notifications
```

---

## 💾 SAVE YOUR PROGRESS

```bash
# Git commit your setup
git add .
git commit -m "Initial local setup complete"
```

---

## 📞 QUICK REFERENCE

| Service | URL/Command | Status Check |
|---------|-------------|--------------|
| **Frontend** | http://localhost:5180 | npm run dev |
| **Backend** | http://localhost:5050 | dotnet run |
| **Database** | localhost:3306 | mysql -u fitness_user -p |
| **API Docs** | http://localhost:5050/swagger | Swagger UI |

---

**Ready to code bro!** 🚀

Any issues? Check troubleshooting section above or ask me!
