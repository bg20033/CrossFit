# Plan Testing — StandUp CrossFit Gym Management

## Konteksti
Projekti StandUp CrossFit ka ~40+ faqe frontend (React+Vite+TS) dhe ~30+ controllers backend (.NET 8). Audit raporti i fundit (2026-06-27) identifikon 10 GAP-e kryesore. Qëllimi: testim i plotë për të gjetur çfarë funksionon, çfarë jo, çfarë ka TypeScript errors, çfarë routes mungojnë, çfarë backend build errors ka.

## Stage 1: Frontend Testing (Paralel)
- **Worker A (Frontend_Build)**: Testo `npm run build` në frontend, gjej TypeScript errors
- **Worker B (Frontend_Routes)**: Testo routes në App.tsx, navItems, lazy imports, mungesat
- **Worker C (Frontend_UI)**: Testo komponentet kryesore (DashboardKit, BodySilhouette, AuthContext, etc.)
- **Worker D (Frontend_Pages)**: Testo çdo page për imports, hooks, API calls, Albanian labels

## Stage 2: Backend Testing (Paralel)
- **Worker E (Backend_Build)**: Testo `dotnet build` në backend, gjej compile errors
- **Worker F (Backend_Controllers)**: Testo controllers për consistency, missing endpoints, models
- **Worker G (Backend_Models)**: Testo models, migrations, foreign keys, relationships

## Stage 3: Integration & Audit (Sequential)
- **Worker H**: Synthesize të gjitha gjetjet, krahaso me AUDIT_RAPORT.md, identifiko progresin e ri
- **Raporti Final**: `TEST_RAPORT.md` me bugs, prioritete, dhe status

## Output
- `TEST_RAPORT.md` — listë e plotë e bug-eve, error-eve, gap-eve të mbetura
