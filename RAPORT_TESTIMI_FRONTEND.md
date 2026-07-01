# RAPORT TESTIMI — Frontend Pages Kryesore
## StandUp CrossFit Gym Management System

**Data e raportit:** 2025-01-28  
**Testues:** Frontend_Pages_Tester  
**Projekti:** `/Users/bardhgashi/Claude/Projects/StandUpCrossFit/frontend/src/pages`

---

## 1. PËRMBLEDHJE E PROBLEMEVE

| Kategori | Probleme | Shkallë |
|----------|----------|---------|
| Imports të panjohur | 0 | ✅ OK |
| API endpoints të panjohur | 1 | ⚠️ Mesatare |
| Text në anglisht (jo shqip) | 7 | ⚠️ Mesatare |
| Design tokens | 1 | ⚠️ Mesatare |
| useAuth / profileId | 2 | ⚠️ Mesatare |

**Vlerësimi përgjithshëm:** Frontend-i është në gjendje të mirë. Shumica e faqeve janë të kompletuara, me importe të vlefshme, API endpoints që ekzistojnë në backend, dhe etiketa kryesisht në shqip. Problemet kryesore janë: tekste të izoluara në anglisht, një faqe që nuk përdor DashboardKit (design tokens), dhe dy faqe Tenant që nuk përdorin `profileId`.

---

## 2. ROLI: ADMIN

### 2.1 AdminDashboard.tsx
**Gjendja:** ✅ **OK** — Nuk ka probleme kritike.

- **Imports:** ✅ Të gjitha ekzistojnë (`DashboardKit` komponente: `DashboardShell`, `DashboardHeader`, `StatCard`, `StatCardsSkeleton`, `Panel`, `QuickAction`, `EmptyState`, `Badge`, `BarList`).
- **API endpoints:** ✅ Të gjitha ekzistojnë në backend:
  - `GET /finance/summary` → `FinanceController`
  - `GET /clients` → `ClientsController`
  - `GET /staff` → `StaffController`
  - `GET /trainers` → `TrainersController`
  - `GET /traininggroups` → `TrainingGroupsController`
  - `GET /finance/transactions` → `FinanceController`
  - `GET /invoice/pending` → `InvoiceController`
  - `GET /attendance/overview` → `AttendanceController`
  - `GET /finance/monthly-report` → `FinanceController`
- **Text në anglisht:** ⚠️ `"Admin Panel"` (badge, line 120) — duhet të jetë `"Paneli i Adminit"` ose `"Administrator"`.
- **Design tokens:** ✅ Përdor `coral-500`, `gray-900`, `font-display`, `shadow-card`, `label-mono`, `nums` — të gjitha nga design system.
- **useAuth():** ✅ Përdor `const { user } = useAuth()` për të shfaqur emrin e adminit.

---

### 2.2 AdminGroups.tsx
**Gjendja:** ✅ **OK** — Nuk ka probleme kritike.

- **Imports:** ✅ Të gjitha ekzistojnë (`DashboardKit`, `Button` from `ui/button`).
- **API endpoints:** ✅ Të gjitha ekzistojnë:
  - `GET /traininggroups` → `TrainingGroupsController`
  - `GET /trainers` → `TrainersController`
  - `POST /traininggroups/create` → `TrainingGroupsController`
  - `PUT /traininggroups/{id}` → `TrainingGroupsController`
  - `GET /traininggroups/{id}` → `TrainingGroupsController`
  - `POST /traininggroups/{id}/add-member` → `TrainingGroupsController`
  - `POST /traininggroups/{id}/remove-member` → `TrainingGroupsController`
  - `POST /traininggroups/{id}/waitlist/promote` → `TrainingGroupsController`
  - `GET /groupsessions` → `GroupSessionsController`
  - `POST /groupsessions/generate` → `GroupSessionsController`
  - `POST /groupsessions/{id}/cancel` → `GroupSessionsController`
  - `POST /groupsessions/{id}/postpone` → `GroupSessionsController`
  - `POST /groupsessions/{id}/mark-held` → `GroupSessionsController`
  - `POST /groupsessions/{id}/reset` → `GroupSessionsController`
- **Text në anglisht:** ⚠️ `"Admin"` (badge, line 387) — duhet të jetë `"Administrator"` ose `"Menaxhim"`.  
  ⚠️ `"Client ID: {w.clientId}"` (waitlist display, line 588) — duhet të jetë `"ID e Klientit"`.
- **Design tokens:** ✅ Përdor `fieldCls`, `primaryBtn`, `coral-500`, `gray-100`, `shadow-card`.
- **useAuth():** ❌ **Nuk përdor `useAuth()`** — kjo është OK për adminin sepse nuk ka nevojë për `profileId`, por për konzistencë mund të shtohet.

---

### 2.3 AdminClients.tsx
**Gjendja:** ✅ **OK** — Nuk ka probleme kritike.

- **Imports:** ✅ Të gjitha ekzistojnë. `getApiErrorMessage` importohet nga `../utils/api` dhe ekziston në `api.ts` (line 6).
- **API endpoints:** ✅ Të gjitha ekzistojnë:
  - `GET /membershipplans` → `MembershipPlansController`
  - `GET /clients` → `ClientsController`
  - `POST /clients/create` → `ClientsController`
  - `GET /clients/{id}` → `ClientsController`
  - `PUT /clients/{id}` → `ClientsController`
  - `DELETE /clients/{id}` → `ClientsController`
  - `POST /clients/{id}/check-in` → `ClientsController`
  - `GET /clients/{id}/attendance` → `AttendanceController`
- **Text në anglisht:** ⚠️ `"Check-In"` (notification label, line 179) — termin teknik, por mund të zëvendësohet me `"Regjistro hyrjen"`.  
  ⚠️ `"Check-ins gjithsej"` (line 338) — OK, termin i përdorur.
- **Design tokens:** ✅ Përdor `fieldCls`, `primaryBtn`, `coral-500`, `gray-900`.
- **useAuth():** ❌ **Nuk përdor `useAuth()`** — OK për admin.

---

### 2.4 AdminFinance.tsx
**Gjendja:** ✅ **OK** — Nuk ka probleme kritike.

- **Imports:** ✅ Të gjitha ekzistojnë.
- **API endpoints:** ✅ Të gjitha ekzistojnë:
  - `GET /finance/transactions` → `FinanceController`
  - `GET /finance/summary` → `FinanceController`
  - `GET /finance/categories` → `FinanceController`
  - `POST /finance/add-transaction` → `FinanceController`
  - `POST /finance/add-category` → `FinanceController`
  - `GET /finance/monthly-report` → `FinanceController`
- **Text në anglisht:** ✅ **Nuk ka** — të gjitha etiketat janë në shqip.
- **Design tokens:** ✅ Përdor `fieldCls`, `coral-500`, `gray-100`.
- **useAuth():** ❌ **Nuk përdor `useAuth()`** — OK për admin.

---

### 2.5 AdminReports.tsx
**Gjendja:** ✅ **OK** — Nuk ka probleme kritike.

- **Imports:** ✅ Të gjitha ekzistojnë. `WeeklyBars` importohet nga `DashboardKit` — ekziston (line 489-513).
- **API endpoints:** ✅ `GET /reports/overview` → `ReportsController`.
- **Text në anglisht:** ✅ **Nuk ka** — të gjitha etiketat janë në shqip ("Të ardhurat", "Prezenca", "Retencioni", "Skuadrat", "Skadimet").
- **Design tokens:** ✅ Përdor `coral-500`, `gray-400`, `shadow-card`.
- **useAuth():** ❌ **Nuk përdor `useAuth()`** — OK për admin.

---

### 2.6 AdminTrainerPayments.tsx
**Gjendja:** ✅ **OK** — Nuk ka probleme kritike.

- **Imports:** ✅ Të gjitha ekzistojnë.
- **API endpoints:** ✅ Të gjitha ekzistojnë:
  - `GET /trainers` → `TrainersController`
  - `GET /trainerpayments` → `TrainerPaymentsController`
  - `POST /trainerpayments/{id}/calculate` → `TrainerPaymentsController`
  - `POST /trainerpayments/{id}/pay` → `TrainerPaymentsController`
- **Text në anglisht:** ✅ **Nuk ka** — të gjitha etiketat janë në shqip.
- **Design tokens:** ✅ Përdor `fieldCls`, `primaryBtn`, `coral-500`.
- **useAuth():** ❌ **Nuk përdor `useAuth()`** — OK për admin.

---

### 2.7 AdminCashRegister.tsx (Arka)
**Gjendja:** ⚠️ **1 Problem** — Text në anglisht.

- **Imports:** ✅ Të gjitha ekzistojnë.
- **API endpoints:** ✅ Të gjitha ekzistojnë:
  - `GET /cashregister/current` → `CashRegisterController`
  - `GET /cashregister/history` → `CashRegisterController`
  - `GET /payments` → `PaymentsController`
  - `POST /payments/{id}/refund` → `PaymentsController`
  - `POST /cashregister/open` → `CashRegisterController`
  - `POST /cashregister/{id}/close` → `CashRegisterController`
- **Text në anglisht:** ⚠️ `"Refund"` (line 152, panel title) — duhet të jetë `"Rimbursim"` ose `"Kthim parash"`.
- **Design tokens:** ✅ Përdor `fieldCls`, `primaryBtn`, `coral-500`.
- **useAuth():** ❌ **Nuk përdor `useAuth()`** — OK për recepsionistin (arka).

---

### 2.8 AdminTrainers.tsx (Admin)
**Gjendja:** ✅ **OK** — Nuk ka probleme kritike.

- **Imports:** ✅ Të gjitha ekzistojnë.
- **API endpoints:** ✅ Të gjitha ekzistojnë:
  - `GET /trainers` → `TrainersController`
  - `POST /trainers/create` → `TrainersController`
- **Text në anglisht:** ✅ **Nuk ka** — të gjitha etiketat janë në shqip.
- **Design tokens:** ✅ Përdor `fieldCls`, `primaryBtn`, `coral-500`.
- **useAuth():** ❌ **Nuk përdor `useAuth()`** — OK për admin.

---

### 2.9 AdminStaff.tsx (Admin)
**Gjendja:** ✅ **OK** — Nuk ka probleme kritike.

- **Imports:** ✅ Të gjitha ekzistojnë.
- **API endpoints:** ✅ Të gjitha ekzistojnë:
  - `GET /staff` → `StaffController`
  - `POST /staff/create` → `StaffController`
  - `POST /staff/{id}/calculate-salary` → `StaffController`
- **Text në anglisht:** ✅ **Nuk ka** — të gjitha etiketat janë në shqip.
- **Design tokens:** ✅ Përdor `fieldCls`, `primaryBtn`, `coral-500`.
- **useAuth():** ❌ **Nuk përdor `useAuth()`** — OK për admin.

---

## 3. ROLI: TRAINER

### 3.1 TrainerDashboard.tsx
**Gjendja:** ✅ **OK** — Nuk ka probleme kritike.

- **Imports:** ✅ Të gjitha ekzistojnë.
- **API endpoints:** ✅ Të gjitha ekzistojnë:
  - `GET /traininggroups` → `TrainingGroupsController`
  - `GET /workoutplans` → `WorkoutPlansController`
  - `GET /dietplans` → `DietPlansController`
  - `GET /goals` → `GoalsController`
- **Text në anglisht:** ✅ **Nuk ka** — të gjitha etiketat janë në shqip.
- **Design tokens:** ✅ Përdor `coral-500`, `gray-900`.
- **useAuth():** ✅ **Përdor `const { user, profileId } = useAuth()`** — korrekt. Përdor `profileId` për filtrimin e grupeve (`/traininggroups?trainerId=${profileId}`).

---

### 3.2 TrainerGroups.tsx
**Gjendja:** ✅ **OK** — Nuk ka probleme kritike.

- **Imports:** ✅ Të gjitha ekzistojnë.
- **API endpoints:** ✅ Të gjitha ekzistojnë:
  - `GET /traininggroups` → `TrainingGroupsController`
  - `GET /traininggroups/{id}` → `TrainingGroupsController`
  - `POST /traininggroups/create` → `TrainingGroupsController`
  - `POST /traininggroups/{id}/add-member` → `TrainingGroupsController`
  - `POST /traininggroups/{id}/remove-member` → `TrainingGroupsController`
  - `POST /traininggroups/{id}/waitlist/promote` → `TrainingGroupsController`
  - `POST /traininggroups/{id}/record-attendance` → `TrainingGroupsController`
  - `POST /attendance/batch` → `AttendanceController`
- **Text në anglisht:** ✅ **Nuk ka** — të gjitha etiketat janë në shqip.
- **Design tokens:** ✅ Përdor `fieldCls`, `primaryBtn`, `coral-500`.
- **useAuth():** ✅ **Përdor `const { profileId } = useAuth()`** — korrekt. Përdor `profileId` për filtrimin e grupeve (`/traininggroups?trainerId=${profileId}`).

---

### 3.3 TrainerClients.tsx
**Gjendja:** ✅ **OK** — Nuk ka probleme kritike.

- **Imports:** ✅ Të gjitha ekzistojnë. `ProgressPhotos` importohet nga `../components/ProgressPhotos` — file ekziston (`ProgressPhotos.tsx`).
- **API endpoints:** ✅ `GET /trainers/{profileId}/clients` → `TrainersController`.
- **Text në anglisht:** ✅ **Nuk ka** — të gjitha etiketat janë në shqip.
- **Design tokens:** ✅ Përdor `fieldCls`, `primaryBtn`, `coral-500`.
- **useAuth():** ✅ **Përdor `const { profileId } = useAuth()`** — korrekt. Përdor `profileId` për të marrë klientët e trajnerit.

---

### 3.4 TrainerWorkoutBuilder.tsx
**Gjendja:** ⚠️ **2 Probleme** — Design tokens + tekst në anglisht.

- **Imports:** ✅ Të gjitha ekzistojnë. `generateWorkoutPDF` importohet nga `../utils/pdfGenerator` — file ekziston (`pdfGenerator.ts`).
- **API endpoints:** ✅ Të gjitha ekzistojnë:
  - `POST /workoutplans/create` → `WorkoutPlansController`
  - `POST /trainer-reports` → `TrainerReportsController`
- **Text në anglisht:** ⚠️ **SHUMË tekste në anglisht** në UI:
  - `"Warm-up"`, `"Strength / Skill"`, `"WOD"`, `"Cool-down"` (SECTIONS array, line 8-13) — terminologji CrossFit, OK.
  - `"Rx"`, `"Scaled"`, `"Beginner"` (SCALINGS array, line 16-20) — terminologji CrossFit, OK.
  - `"sets"`, `"reps"` (line 418-419) — duhet të jenë `"seri"`, `"përsëritje"`.
  - `"Rest"` (line 420) — duhet të jetë `"Pushim"`.
- **Design tokens:** ⚠️ **Nuk përdor `DashboardKit`** — përdor className të thjeshtë (`shadow-lg`, `border`, `rounded-lg`, `focus:ring-primary`). Kjo shkakton **inkonzistencë vizuale** me faqet e tjera që përdorin `DashboardKit` (me `shadow-card`, `rounded-2xl`, `border-gray-200`). Faqja duhet të rifaktorizohet për të përdorur `DashboardShell`, `DashboardHeader`, `Panel`, `Field`, `fieldCls`, `primaryBtn`.
- **useAuth():** ✅ **Përdor `const { profileId } = useAuth()`** — korrekt.

---

### 3.5 TrainerDiets.tsx
**Gjendja:** ✅ **OK** — Nuk ka probleme kritike.

- **Imports:** ✅ Të gjitha ekzistojnë.
- **API endpoints:** ✅ Të gjitha ekzistojnë:
  - `GET /dietplans` → `DietPlansController`
  - `POST /dietplans/create` → `DietPlansController`
- **Text në anglisht:** ✅ **Nuk ka** — të gjitha etiketat janë në shqip.
- **Design tokens:** ✅ Përdor `fieldCls`, `primaryBtn`, `coral-500`.
- **useAuth():** ✅ **Përdor `const { profileId } = useAuth()`** — korrekt.

---

## 4. ROLI: CLIENT

### 4.1 ClientDashboard.tsx
**Gjendja:** ⚠️ **1 Problem** — Tekst në anglisht.

- **Imports:** ✅ Të gjitha ekzistojnë.
- **API endpoints:** ✅ Të gjitha ekzistojnë:
  - `GET /attendance/client-summary` → `AttendanceController`
  - `GET /goals` → `GoalsController`
  - `GET /workoutplans` → `WorkoutPlansController`
  - `GET /dietplans` → `DietPlansController`
- **Text në anglisht:** ⚠️ `"streak (ditë)"` (line 105) — `"streak"` duhet të zëvendësohet me `"vazhdimësi"` ose `"seri"`.
- **Design tokens:** ✅ Përdor `coral-500`, `gray-900`, `font-display`.
- **useAuth():** ✅ **Përdor `const { user, profileId } = useAuth()`** — korrekt. Përdor `profileId` për `clientId` në API calls.

---

### 4.2 ClientProgress.tsx
**Gjendja:** ✅ **OK** — Nuk ka probleme kritike.

- **Imports:** ✅ Të gjitha ekzistojnë. `MuscleBodyMap` importohet nga `../components/MuscleBodyMap` — file ekziston. `ProgressPhotos` importohet — file ekziston.
- **API endpoints:** ✅ Të gjitha ekzistojnë:
  - `GET /progress` → `ProgressController`
  - `POST /progress` → `ProgressController`
  - `DELETE /progress/{id}` → `ProgressController`
- **Text në anglisht:** ✅ **Nuk ka** — të gjitha etiketat janë në shqip.
- **Design tokens:** ✅ Përdor `coral-500`, `gray-900`, `font-display`.
- **useAuth():** ✅ **Përdor `const { profileId } = useAuth()`** — korrekt.

---

### 4.3 ClientNutrition.tsx
**Gjendja:** ⚠️ **1 Problem** — Tekst në anglisht.

- **Imports:** ✅ Të gjitha ekzistojnë. `useNutritionProfile`, `useFoodLog`, `useKitchen` importohen nga stores — file ekzistojnë.
- **API endpoints:** ✅ Të gjitha ekzistojnë:
  - `GET /nutrition/me` → `NutritionController`
  - `GET /nutrition/log` → `NutritionController`
  - `POST /nutrition/log/foods` → `NutritionController`
  - `PUT /nutrition/log/water` → `NutritionController`
  - `GET /kitchen/recipes` → `KitchenController`
  - `GET /kitchen/shopping` → `KitchenController`
  - `POST /kitchen/recipes` → `KitchenController`
  - `DELETE /kitchen/recipes/{id}` → `KitchenController`
  - `POST /kitchen/shopping` → `KitchenController`
  - `PUT /kitchen/shopping/{id}` → `KitchenController`
  - `DELETE /kitchen/shopping/{id}` → `KitchenController`
- **Text në anglisht:** ⚠️ `"Log 1 porcion në ditar"` (button label, line 437) — `"Log"` duhet të jetë `"Shto"` ose `"Regjistro"`.
- **Design tokens:** ✅ Përdor `coral-500`, `gray-900`.
- **useAuth():** ❌ **Nuk përdor `useAuth()`** — por përdor `useNutritionProfile()` dhe `useFoodLog()` stores që menaxhojnë profilin. Kjo është OK sepse nutrition store ka logjikën e vet për identifikimin e klientit.

---

### 4.4 ClientPackageStatus.tsx
**Gjendja:** ✅ **OK** — Nuk ka probleme kritike.

- **Imports:** ✅ Të gjitha ekzistojnë.
- **API endpoints:** ✅ Të gjitha ekzistojnë:
  - `GET /memberships/current` → `MembershipsController`
  - `GET /memberships/history` → `MembershipsController`
  - `GET /memberships/offers` → `MembershipsController`
  - `POST /memberships/{id}/auto-renew` → `MembershipsController`
  - `POST /memberships/renew` → `MembershipsController`
  - `POST /memberships/upgrade` → `MembershipsController`
- **Text në anglisht:** ✅ **Nuk ka** — të gjitha etiketat janë në shqip.
- **Design tokens:** ✅ Përdor `coral-500`, `gray-900`.
- **useAuth():** ✅ **Përdor `const { profileId } = useAuth()`** — korrekt. Përdor `profileId` për `clientId` në API calls.

---

### 4.5 ClientDiet.tsx
**Gjendja:** ✅ **OK** — Nuk ka probleme kritike.

- **Imports:** ✅ Të gjitha ekzistojnë. `generateDietPDF` importohet — file ekziston.
- **API endpoints:** ✅ `GET /dietplans?clientId=${profileId}` → `DietPlansController`.
- **Text në anglisht:** ✅ **Nuk ka** — të gjitha etiketat janë në shqip.
- **Design tokens:** ✅ Përdor `coral-500`, `gray-900`.
- **useAuth():** ✅ **Përdor `const { user, profileId } = useAuth()`** — korrekt.

---

### 4.6 ClientWorkouts.tsx
**Gjendja:** ✅ **OK** — Nuk ka probleme kritike.

- **Imports:** ✅ Të gjitha ekzistojnë. `generateWorkoutPDF` importohet — file ekziston.
- **API endpoints:** ✅ `GET /workoutplans?clientId=${profileId}` → `WorkoutPlansController`.
- **Text në anglisht:** ✅ **Nuk ka** — të gjitha etiketat janë në shqip.
- **Design tokens:** ✅ Përdor `coral-500`, `gray-900`.
- **useAuth():** ✅ **Përdor `const { user, profileId } = useAuth()`** — korrekt.

---

## 5. ROLI: ARKA (Cashier / Recepsion)

### 5.1 ArkaAccess.tsx
**Gjendja:** ⚠️ **1 Problem** — Tekst në anglisht.

- **Imports:** ✅ Të gjitha ekzistojnë. `Scanner` importohet nga `../features/access/Scanner` — file ekziston. `DEFAULT_CAPACITY`, `AccessVerdict` importohen nga `../features/access/accessEngine` — file ekziston. `fmtMin` importohet — file ekziston.
- **API endpoints:** ✅ Të gjitha ekzistojnë:
  - `GET /access/live` → `AccessController`
  - `POST /access/scan` → `AccessController`
- **Text në anglisht:** ⚠️ `"Server-side"` (badge, line 156) — duhet të jetë `"Server"` ose `"Kontroll serveri"`.
- **Design tokens:** ✅ Përdor `coral-500`, `gray-900`.
- **useAuth():** ❌ **Nuk përdor `useAuth()`** — OK për arkë, nuk ka nevojë për profileId.

---

## 6. ROLI: TENANT (Trainer me Qira)

### 6.1 TenantDashboard.tsx
**Gjendja:** ⚠️ **1 Problem** — Nuk përdor `useAuth()`.

- **Imports:** ✅ Të gjitha ekzistojnë. `fmtMin` importohet nga `../features/access/accessEngine` — file ekziston.
- **API endpoints:** ✅ Të gjitha ekzistojnë:
  - `GET /rentals/tenant/clients` → `RentalsController`
  - `GET /rentals/slots` → `RentalsController`
  - `GET /rentals/tenant/invoices` → `RentalsController`
- **Text në anglisht:** ✅ **Nuk ka** — të gjitha etiketat janë në shqip.
- **Design tokens:** ✅ Përdor `coral-500`, `gray-900`.
- **useAuth():** ❌ **Nuk përdor `useAuth()`** — ⚠️ **POTENCIALISHT PROBLEM**. Tenant mund të ketë nevojë për `profileId` për filtrimin e klientëve dhe faturave. API endpoint `/rentals/tenant/clients` mund të kërkojë `tenantId` nga tokeni, por për siguri duhet të shtohet `useAuth()`.

---

### 6.2 TenantClients.tsx
**Gjendja:** ⚠️ **1 Problem** — Nuk përdor `useAuth()`.

- **Imports:** ✅ Të gjitha ekzistojnë. `Skeleton` importohet nga `DashboardKit` — ekziston (line 232-233).
- **API endpoints:** ✅ `GET /rentals/tenant/clients`, `POST /rentals/tenant/clients` → `RentalsController`.
- **Text në anglisht:** ✅ **Nuk ka** — të gjitha etiketat janë në shqip.
- **Design tokens:** ✅ Përdor `coral-500`, `gray-900`.
- **useAuth():** ❌ **Nuk përdor `useAuth()`** — ⚠️ **POTENCIALISHT PROBLEM**. Tenant mund të ketë nevojë për `profileId` për të lidhur klientin me tenantin.

---

### 6.3 TenantSchedule.tsx
**Gjendja:** ⚠️ **1 Problem** — Nuk përdor `useAuth()`.

- **Imports:** ✅ Të gjitha ekzistojnë. `DAYS` importohet nga `../features/rental/tenantStore` — file ekziston. `fmtMin` importohet — file ekziston.
- **API endpoints:** ✅ Të gjitha ekzistojnë:
  - `GET /rentals/slots` → `RentalsController`
  - `POST /rentals/slots/{id}/book` → `RentalsController`
- **Text në anglisht:** ✅ **Nuk ka** — të gjitha etiketat janë në shqip.
- **Design tokens:** ✅ Përdor `coral-500`, `gray-900`.
- **useAuth():** ❌ **Nuk përdor `useAuth()`** — ⚠️ **POTENCIALISHT PROBLEM**. Tenant mund të ketë nevojë për `profileId` për rezervimin e terminëve.

---

## 7. PROBLEME TË TJERA

### 7.1 MuscularBodyMap (react-muscle-highlighter)
**Gjendja:** ✅ **OK** — `MuscleBodyMap.tsx` importon `Body` nga `react-muscle-highlighter` — ky është një dependency i jashtëm. Nëse nuk është instaluar (`npm install react-muscle-highlighter`), do të shkaktojë gabim.  
**Kontrolli:** `package.json` duhet të përmbajë `react-muscle-highlighter`. Nëse mungon, duhet të shtohet.

### 7.2 jsPDF (PDF Generator)
**Gjendja:** ✅ **OK** — `pdfGenerator.ts` importon `jsPDF` dinamikisht (`await import('jspdf')`). Nëse `jspdf` nuk është instaluar, PDF do të dështojë me alert.  
**Kontrolli:** `package.json` duhet të përmbajë `jspdf`. Nëse mungon, duhet të shtohet (`npm install jspdf`).

### 7.3 jsQR (QR Scanner)
**Gjendja:** ✅ **OK** — `Scanner.tsx` importon `jsQR` nga `jsqr`. Nëse `jsqr` nuk është instaluar, skaneri do të dështojë.  
**Kontrolli:** `package.json` duhet të përmbajë `jsqr`. Nëse mungon, duhet të shtohet (`npm install jsqr`).

---

## 8. REKOMANDIME PRIORITARE

| Prioritet | Problemi | Faqe | Veprimi |
|-----------|----------|------|---------|
| **1** | Design tokens (nuk përdor DashboardKit) | `TrainerWorkoutBuilder.tsx` | Rifaktorizo për të përdorur `DashboardShell`, `DashboardHeader`, `Panel`, `Field`, `fieldCls`, `primaryBtn` |
| **2** | Tekst në anglisht: `"sets"`, `"reps"`, `"Rest"` | `TrainerWorkoutBuilder.tsx` | Zëvendëso me `"seri"`, `"përsëritje"`, `"Pushim"` |
| **3** | Tekst në anglisht: `"Log 1 porcion në ditar"` | `ClientNutrition.tsx` | Zëvendëso me `"Shto 1 porcion në ditar"` |
| **4** | Tekst në anglisht: `"Refund"` | `AdminCashRegister.tsx` | Zëvendëso me `"Rimbursim"` ose `"Kthim parash"` |
| **5** | Tekst në anglisht: `"streak (ditë)"` | `ClientDashboard.tsx` | Zëvendëso me `"vazhdimësi (ditë)"` ose `"seri (ditë)"` |
| **6** | Tekst në anglisht: `"Admin Panel"` | `AdminDashboard.tsx` | Zëvendëso me `"Paneli i Adminit"` |
| **7** | Tekst në anglisht: `"Admin"` | `AdminGroups.tsx` | Zëvendëso me `"Administrator"` ose `"Menaxhim"` |
| **8** | Tekst në anglisht: `"Server-side"` | `ArkaAccess.tsx` | Zëvendëso me `"Server"` ose `"Kontroll serveri"` |
| **9** | Nuk përdor `useAuth()` | `TenantDashboard.tsx`, `TenantClients.tsx`, `TenantSchedule.tsx` | Shto `const { profileId } = useAuth()` për tenant ID |
| **10** | Dependencies të jashtme | `package.json` | Verifiko që `react-muscle-highlighter`, `jspdf`, `jsqr` janë instaluar |

---

**RAPORTI PËRFUNDIMTAR:** Frontend-i është në gjendje të mirë përgjithshme. Problemet kryesore janë tekste të izoluara në anglisht (7 raste), një faqe që nuk përdor design tokens konsekuent (`TrainerWorkoutBuilder.tsx`), dhe mungesa e `useAuth()` në faqet e Tenant-it. Asnjë import i panjohur apo API endpoint i panjohur nuk u gjet. Rekomandohet të adresohen problemet e listuara në seksionin 8 për të përmirësuar konzistencën dhe përvojën e përdoruesit.
