# Plan Ndreqjeje — StandUp CrossFit Bugs

## Bug-e për t'u rregulluar (të gjitha gjetjet nga TEST_RAPORT)

### Batch 1: Tekste në Anglisht → Shqip (7 files)
1. `AdminDashboard.tsx` — "Admin Panel" → "Paneli i Adminit"
2. `AdminGroups.tsx` — "Admin" (badge) → "Administrator"; "Client ID" → "ID"
3. `AdminCashRegister.tsx` — "Refund" → "Rimbursim"
4. `ClientDashboard.tsx` — "streak (ditë)" → "vazhdimësi (ditë)"
5. `ClientNutrition.tsx` — "Log 1 porcion në ditar" → "Shto 1 porcion në ditar"
6. `ArkaAccess.tsx` — "Server-side" → "Kontroll serveri"
7. `TrainerWorkoutBuilder.tsx` — "sets" → "seri", "reps" → "përsëritje", "Rest" → "Pushim"

### Batch 2: TrainerWorkoutBuilder.tsx — Rifaktorim me DashboardKit
- Zëvendëso className të thjeshtë me DashboardShell, DashboardHeader, Panel, Field, fieldCls, primaryBtn
- Ruaj të gjithë funksionalitetin (workout builder, PDF generator, sections)

### Batch 3: Tenant Pages — Shto useAuth()
- `TenantDashboard.tsx` — shto `const { profileId } = useAuth()` dhe dërgo në API
- `TenantClients.tsx` — shto `const { profileId } = useAuth()` dhe dërgo në API
- `TenantSchedule.tsx` — shto `const { profileId } = useAuth()` dhe dërgo në API

### Batch 4: Backend & Dependencies
- `npm audit fix` në frontend
- Shto navigation properties në backend (AttendanceLog.ScannedBy, InvoiceItem.Group, TrainerCommission.Finance)
- Riemëro koleksionet në User (TrainerProfile → Trainers, ClientProfile → Clients)

### Batch 5: GAP-e të mbetura (features)
- GAP-8: Konflikt orari (TrainingGroupsController)
- GAP-9: Raport grupi detajuar
- GAP-7: Auto-assign klienti në grup
