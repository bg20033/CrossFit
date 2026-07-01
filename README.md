# StandUp CrossFit

Fitness management system for CrossFit operations: clients, trainers, staff, attendance, memberships, finances, invoices, schedules, nutrition, goals, reports, notifications, QR access, and rental tenants.

## Tech Stack

- Frontend: React 18, TypeScript, Vite, React Router, Tailwind CSS, React Query, Zustand, Axios
- Backend: .NET 8 ASP.NET Core Web API, Entity Framework Core, MySQL, JWT bearer authentication
- Tooling: Vitest, Docker, Docker Compose

## Project Structure

```text
StandUpCrossFit/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── features/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── stores/
│   │   ├── types/
│   │   └── utils/
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── Controllers/
│   ├── Data/
│   ├── Infrastructure/
│   ├── Migrations/
│   ├── Models/
│   ├── Services/
│   ├── .env.example
│   ├── Program.cs
│   └── StandUpFitness.csproj
└── package.json
```

## Environment

Backend configuration is read from `backend/appsettings.json` and environment variables. Required production values:

```text
ConnectionStrings__DefaultConnection
JwtSettings__SecretKey
JwtSettings__Issuer
JwtSettings__Audience
Cors__AllowedOrigins__0
```

Optional integrations:

```text
Email__Provider
Email__From
Email__Smtp__Host
Email__Smtp__Port
Email__Smtp__EnableSsl
Email__Smtp__Username
Email__Smtp__Password
Sms__Provider
Sms__Twilio__AccountSid
Sms__Twilio__AuthToken
Sms__Twilio__From
Payments__Provider
Payments__PublicBaseUrl
```

Frontend configuration:

```text
VITE_API_URL
VITE_ALLOWED_HOSTS
```

Use the checked-in `.env.example` files as templates and provide real deployment values outside source control.

## Local Development

Install dependencies:

```bash
npm install
cd frontend && npm install
```

Run MySQL, then apply migrations:

```bash
cd backend
DOTNET_ROLL_FORWARD=Major ASPNETCORE_ENVIRONMENT=Development dotnet ef database update
```

Start both apps from the repository root:

```bash
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5180`
- Backend API: `http://localhost:5050`
- Swagger in development: `http://localhost:5050/swagger`
- Health check: `http://localhost:5050/health`

## Build And Test

Frontend:

```bash
cd frontend
npm run build
npm test -- --run
```

Backend:

```bash
cd backend
DOTNET_ROLL_FORWARD=Major dotnet build
```

## Deployment Notes

- Set `ASPNETCORE_ENVIRONMENT=Production`.
- Use a strong `JwtSettings__SecretKey` with at least 32 characters.
- Set `Cors__AllowedOrigins__0` to the deployed frontend origin.
- Run EF migrations in the deployment pipeline before starting the production API.
- Do not rely on development `appsettings.Development.json` values outside local development.
- Public registration creates client accounts only; privileged users must be created from authenticated admin workflows.

# CrossFit
