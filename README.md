# StandUp CrossFit - Fitness Management System

A comprehensive web application for managing fitness facilities, trainers, clients, and operations.

## Project Structure

```
StandUpCrossFit/
├── frontend/                 # React + Vite + Tailwind + Shadcn UI
│   ├── src/
│   │   ├── pages/           # Landing, About, Login, Register, Dashboard
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # Auth context & state management
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Helper functions & API client
│   │   └── App.tsx          # Main app component with routing
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/                  # .NET 8 Web API
│   ├── Models/              # Entity models (User, Trainer, Client, etc.)
│   ├── Data/                # DbContext & database configuration
│   ├── Controllers/         # API endpoints
│   ├── Program.cs           # App configuration & startup
│   ├── StandUpFitness.csproj
│   ├── appsettings.json
│   └── Dockerfile
│
├── docker-compose.yml       # Docker orchestration
└── README.md               # This file
```

## Tech Stack

### Frontend
- **Framework**: React 18
- **Build**: Vite
- **Styling**: Tailwind CSS
- **Components**: Shadcn UI
- **Routing**: React Router v6
- **State**: Zustand (for auth) + React Context
- **HTTP**: Axios

### Backend
- **Runtime**: .NET 8
- **Database**: MySQL 8.0
- **ORM**: Entity Framework Core
- **Authentication**: JWT
- **API**: RESTful ASP.NET Core

## Features

### Current Implementation
- ✅ User authentication (Register/Login)
- ✅ Role-based access (Admin, Trainer, Client, GymOwner, Staff)
- ✅ Protected routes & JWT tokens
- ✅ Responsive landing page
- ✅ About page
- ✅ Gym rental inquiry form
- ✅ Dashboard placeholder

### Ready to Build
- 👥 Member management (CRUD)
- 📅 Class scheduling & attendance
- 🏋️ Personal training sessions
- 📊 Financial tracking
- 💪 Workout & diet plans
- 📈 Progress tracking
- 👨‍💼 Staff management

## Setup & Running

### Quick Start with Docker

1. **Prerequisites**
   - Docker & Docker Compose installed
   - Port 5000 (API), 5173 (Frontend), 3306 (Database) available

2. **Clone & Run**
   ```bash
   cd StandUpCrossFit
   docker-compose up --build
   ```

3. **Access**
   - Frontend: http://localhost:5173
   - API: http://localhost:5000
   - Swagger: http://localhost:5000/swagger

### Manual Setup (Development)

#### Backend
```bash
cd backend
dotnet restore
dotnet ef database update
dotnet run
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Database Schema

### Core Tables
- **Users** - Authentication & profiles
- **Trainers** - Trainer information & specializations
- **Clients** - Member profiles & subscriptions
- **GymOwners** - Gym facility information
- **Staff** - Employee records

### Operations
- **TrainingGroups** - Class schedules & capacity
- **PersonalSessions** - One-on-one training
- **Attendance** - Member check-ins
- **DietPlans** - Nutrition guidance
- **WorkoutPlans** - Exercise programs
- **Goals** - Member fitness targets

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Sign in
- `GET /api/auth/me` - Get current user (protected)

### Future Endpoints
- `/api/users` - User management
- `/api/clients` - Client management
- `/api/trainers` - Trainer profiles
- `/api/groups` - Class management
- `/api/attendance` - Attendance tracking
- `/api/financial` - Revenue & expenses

## Environment Variables

### Backend (.env or appsettings.json)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=db;Port=3306;Database=standup_fitness;User=root;Password=root123;"
  },
  "JwtSettings": {
    "SecretKey": "your-secret-key-here",
    "ExpiryMinutes": 60,
    "Issuer": "StandUpFitness",
    "Audience": "StandUpFitnessClient"
  }
}
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

## Development Notes

### Authentication Flow
1. User registers with email, password, and role
2. Password hashed with BCrypt
3. JWT token issued on login
4. Token stored in localStorage
5. Included in Authorization header for protected requests
6. Token refreshed on page load via `/api/auth/me`

### Adding New Pages
1. Create page component in `frontend/src/pages/`
2. Add route to `App.tsx`
3. If protected, wrap in `<ProtectedRoute />`

### Adding New API Endpoints
1. Create controller in `backend/Controllers/`
2. Define models if needed
3. Add DbSet to `FitnessContext` if new table
4. Create migration: `dotnet ef migrations add MigrationName`
5. Update database: `dotnet ef database update`

## Next Steps

- [ ] Implement user dashboard with role-specific views
- [ ] Build client management module
- [ ] Create trainer profile & scheduling
- [ ] Add financial tracking & reporting
- [ ] Implement attendance system
- [ ] Create workout & diet plan builders
- [ ] Add notifications system
- [ ] Build mobile app (React Native/Flutter)

## Support

For questions or issues, contact: info@standupfit.com

---

**Built with ❤️ for fitness professionals**
