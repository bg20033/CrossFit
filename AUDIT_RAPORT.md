# AUDIT — StandUp CrossFit Gym Management System
## Raport i gjendjes aktuale të sistemit

---

## 1. Përmbledhje e Arkitekturës

Sistemi është ndërtuar në **.NET 8 (backend)** dhe **React + Vite (frontend)**. Ka **8 role** të definuara me RBAC dinamik:

| Roli | Qasja |
|------|-------|
| `admin` / `gym_owner` | Të gjitha modulat |
| `trainer` | Grupet, klientët, ushtrimet, dietat |
| `staff` | Klientët, arka, faturat, QR |
| `cashier` | Arka, klientët, faturat, QR |
| `client` | Ushtrimet, dieta, kalendari, progresi, QR |
| `trainer_tenant` | Qiragjinjtë (izoluar) |
| `tenant_client` | Vetëm për tenant trainer |

---

## 2. Çfarë FUNKSIONON ✅

### Autentikimi & Autorizimi
- ✅ Login/Register me JWT + refresh tokens
- ✅ RBAC dinamik me role + permissions (tabela `DynamicRole`, `Permission`, `RolePermission`)
- ✅ Soft-delete për klientët (nuk fshihen, vetëm maskohen)
- ✅ Rate limiting & idempotency keys për transaksione

### Moduli i Grupeve
- ✅ Admin krijon grupe, cakton trajnerin, vendos kapacitetin
- ✅ Orar javor me **multiple slots** (p.sh. Hënë 18:00, Mërkurë 18:00, Premte 18:00)
- ✅ Waitlist automatik kur grupi është plot
- ✅ Promovim automatik nga waitlist kur largohet anëtar
- ✅ Trajneri sheh grupet e veta
- ✅ Prezenca (prezent/mungesë) për çdo klient në grup
- ✅ Batch check-in (të gjithë prezent / mungesë njëkohësisht)

### Moduli i Klientëve
- ✅ Krijim, edit, fshirje (soft)
- ✅ Anëtarësim me `MembershipPlan` (paketa me çmime & ditë)
- ✅ QR kode për hyrje/dalje
- ✅ Logs të hyrjeve (check-in/check-out)
- ✅ Faturat për pagesa
- ✅ Progresi (peshë, masa, body fat, foto)

### Moduli i Financave
- ✅ Të hyra & shpenzime me kategori
- ✅ Raport mujor me grafiqe
- ✅ Arka (Cash Register) — hapje/mbyllje ditore
- ✅ Faturat me items, tax, status (pending/paid/cancelled/refunded)
- ✅ Kur fatura shënohet "paid", krijon automatikisht transaksion "income" në Financë

### Payroll (Stafi)
- ✅ Llogaritje rroge për `Staff` — rrogë bazë + orë shtesë + bonus − zbritje
- ✅ Status: pending / paid / cancelled
- ✅ Historiku i pagave

### Raportet
- ✅ Overview: të hyra, prezenca, retention, grupet, skadimet
- ✅ Occupancy rate për grupet
- ✅ Churn rate & conversion rate

---

## 3. Çfarë NUK FUNKSIONON / MUNGON ❌

### 🚨 GAP-1: Pagesa e Trajnerëve sipas Klientëve **(KRITIKE)**
**Problemi:** Sistemi aktual nuk ka **asnjë mekanizëm** për të paguar trajnerin bazuar në numrin e klientëve që ka në grup.

**Çfarë ka tani:**
- `Trainer` ka vetëm `HourlyRate` (pagesë orare)
- `Payroll` llogarit vetëm për `Staff`, **jo** për `Trainer`
- Nuk ka fushë për `CommissionPerClient` apo `PercentagePerPackage`

**Çfarë kërkon përdoruesi:**
> Trajneri paguhet bazë sa klientëve ka. Psh: 10 klientë × 20€ = 200€. Por nëse hapet ndonjë orë/mungon seancë, duhet përputhur: **(ditë të mbajtura në muaj / ditë totale të planifikuara) × klientë × 20€**

**Mungesat:**
1. Modeli `Trainer` nuk ka `CommissionPerClient`, `TrainerType`, `PaymentModel`
2. Modeli `Salary` është i lidhur vetëm me `Staff` (foreign key `StaffId`), **jo** me `Trainer`
3. Nuk ka tabelë për `TrainerPayment` ose `TrainerCommission`
4. Nuk ka logjikë për të llogaritur se sa seanca u mbajtën vërtet në muaj
5. Nuk ka API endpoint për të gjeneruar pagën e trajnerit
6. Nuk ka UI për adminin të shohë & paguajë komisionet e trajnerëve

---

### 🚨 GAP-2: Shtimi i Klientëve në Grup — UX e Dëshpëruar
**Problemi:** Për të shtuar një klient në grup, admini/trajneri duhet të di **Client ID** (numër) dhe ta shkruajë manualisht në një input fushë.

**Çfarë ndodh aktualisht:**
```tsx
<Field label="Shto anëtar (Client ID)">
  <input type="number" value={newMemberId} ... />
</Field>
```

**Çfarë duhet:**
- Dropdown searchable me emër/telefon/email të klientit
- Filter "vetëm klientë pa grup" / "vetëm klientë aktivë"
- Shfaqje e anëtarëve aktualë të grupit me foto/emër
- Mundësi të zhvendosësh klient nga një grup në tjetrin

---

### 🚨 GAP-3: Mungon Gjurmimi i Seancave të Anuluara / Shtyra
**Problemi:** Orari i grupit është **fiks javor** (p.sh. çdo Hënë 18:00). Nuk ka mundësi të:
- Anulosh një seancë specifike (p.sh. 15 Korrik, festë)
- Shtysh një seancë për ditë tjetër
- Shënojsh "substitute trainer" për një seancë
- Shënojsh arsye pse u anulua

**Pse është problem:** Pagesa e trajnerit bazohet te **sa seanca u mbajtën vërtet** — pa këtë informacion, nuk mund të llogaritet komisioni i drejtë.

---

### 🚨 GAP-4: Trajneri Nuk Mund të Skanohet për Vetën
**Problemi:** Përdoruesi tha: *"trajneri veq ka me u skanu per veti"*. Aktualisht:
- `Attendance` lidhet me `ClientId`, **jo** me `TrainerId`
- `AttendanceLog` (QR scan) lidhet vetëm me klientë
- Nuk ka regjistrim prezence për trajnerin në grup

**Nevoja:** Trajneri duhet të skanojë QR-in e vet kur fillon seancën (për të konfirmuar se seanca u mbajt, dhe për të llogaritur pagesën).

---

### 🚨 GAP-5: Financat Nuk Përfshijnë Komisionet e Trajnerëve
**Problemi:** Kur admini paguan trajnerin, kjo duhet të regjistrohet si "expense" në Financë, por kategoria aktuale nuk ka lidhje me trajnerë.

**Mungesat:**
- Nuk ka kategori automatike "Trainer Commissions"
- Nuk ka transaksion të lidhur me `TrainerId`
- Nuk ka raport "sa paguam për trajnerët këtë muaj"

---

### 🚨 GAP-6: Admini Nuk Mund të Filetrojë / Zgjedhë ("llutf") Klientët
**Problemi:** Nuk ka filter në listën e klientëve për grup. Admini nuk mund të:
- Filtrerë klientët sipas paketës (plan)
- Filtrerë klientët pa grup
- Filtrerë klientët sipas trajnerit
- Zgjedhë multiple klientë njëkohësisht për t'i shtuar në grup

---

### 🚨 GAP-7: Mungon Lidhja Paketë → Grup
**Problemi:** Klienti blen një paketë (`MembershipPlan`) por **nuk lidhet automatikisht** me një grup. Ky është një hapit manual i shtuar në `AdminGroups` / `TrainerGroups`.

**Si duhet të funksionojë:**
- Kur klienti blen paketën, sistemi sugjeron ose cakton automatikisht një grup me orar të përshtatshëm
- Ose admini në faturë mund të zgjedhë grupin ku futet klienti

---

### 🚨 GAP-8: Kontrolli i Konflikteve të Orarit Mungon
**Problemi:** Dy grupe mund të kenë seancë njëkohësisht në të njëjtën orë. Sistemi nuk:
- Kontrollon nëse trajneri ka grup tjetër në atë orë
- Kontrollon nëse klienti është në dy grupe me orë që përplasen
- Tregon warning për overbooking të hapësirës

---

### 🚨 GAP-9: Raporti i Grupit Nuk Ka Detaje të Mjaftueshme
**Problemi:** Admini nuk ka një raport që tregon:
- Sa seanca u mbajtën këtë muaj për grupin X
- Sa klientë erdhën në secilën seancë (attendance rate per session)
- Cilat seanca u anuluan
- Sa fitoi trajneri nga ky grup

---

### 🚨 GAP-10: Mungon "Substitute Trainer" dhe "Trainer Swap"
**Problemi:** Nëse trajneri i grupit është i sëmurë, nuk ka mekanizëm të:
- Caktojë trajner zëvendësues për një seancë
- Transferojë grupin tek trajner tjetër (midis trajnerëve)

---

## 4. Matricja e Kompletimit

| Moduli | Status | Vërejtje |
|--------|--------|----------|
| RBAC & Role | ✅ 90% | Mungon vetëm "assign multiple roles per user" |
| Admin → Grupet | ✅ 70% | Krijimi, editimi, orari javor OK; mungon anulimi i seancave |
| Admin → Klientët në grup | ⚠️ 40% | Shtohet me ID numerik; UX shumë e keqe |
| Admin → Financat | ✅ 80% | Hyrje/dalje, arka, fatura OK; mungon komisionet |
| Trajneri → Prezenca | ✅ 60% | Markon prezent/mungesë; mungon skanimi i vet |
| Trajneri → Pagesa | ❌ 0% | **Nuk ekziston fare** |
| Trajneri → Raporti PDF | ✅ 80% | `TrainerWeeklyReport` ekziston |
| Punëtori → Arka | ✅ 80% | Hap/mbyll, transaksione OK |
| Punëtori → Rroga | ✅ 70% | Llogaritje bazë/orë shtesë OK; vetëm për Staff |
| Klienti → Kalendari | ✅ 70% | Sheh orarin; mungon njoftim për anulime |
| Klienti → Paketa | ✅ 75% | Blen, shikon skadimin; mungon auto-assign në grup |

---

## 5. Rekomandime Prioritare

### Prioritet 1 (MUST HAVE — Bllokon pagesën e trajnerëve)
1. **Shto `TrainerCommission` model** — lidhet me `TrainerId`, `Month`, `Year`, `ClientCount`, `RatePerClient`, `SessionsHeld`, `SessionsPlanned`, `TotalAmount`, `Status`
2. **Shto `GroupSession` model** — çdo seancë specifike e grupit (datë, status: held/cancelled/postponed, trainerId, substituteTrainerId)
3. **Shto `TrainerCommissionRate` në `Trainer`** — sa € merr për klient (default: 0)
4. **Krijo endpoint `/trainers/{id}/calculate-commission`** — llogarit sipas formulës: `SessionsHeld / SessionsPlanned * ClientCount * RatePerClient`
5. **Krijo UI për adminin** — shiko & pagua komisionet e trajnerëve
6. **Lidh komisionin si expense në Financë** — kur admini paguan, krijohet automatikisht transaksion "expense" kategorizuar "Trainer Commissions"

### Prioritet 2 (UX & Operacione)
7. **Zëvendëso inputin "Client ID" me searchable dropdown** — shfaq emër, email, telefon; filtro vetëm klientë aktivë pa grup
8. **Lejo shtim multi-klient në grup** — zgjedh multiple nga lista, shto të gjithë njëkohësisht
9. **Shto "Session Exception"** — admini mund të anulojë/shtyjë një seancë specifike me arsye
10. **Shto trajner zëvendësues (substitute)** — për seancë të vetme ose periodike

### Prioritet 3 (Optimizime)
11. **Lidh faturën e klientit me grupin** — në `InvoiceItem` shto `GroupId` që kur blihet paketa, klienti caktohet automatikisht në grup
12. **Shto konflikt-check për oraret** — kur krijohet/ndryshohet grup, kontrollo nëse trajneri/klienti ka grup tjetër në atë orë
13. **Shto raportin "Trainer Earnings per Group"** — për adminin
14. **Lejo trajnerin të skanohet për veten** — `AttendanceLog` për trajnerë (ose tabelë e re `TrainerSessionLog`)

---

## 6. Modeli i Propozuar për Pagesën e Trajnerit

```
TrainerPayment (monthly)
├── trainerId
├── month / year
├── clientCount (sa klientë ka pasur në fillim të muajit)
├── ratePerClient (€20)
├── sessionsPlanned (sa seanca ishin planifikuar)
├── sessionsHeld (sa u mbajtën vërtet)
├── sessionsCancelled (sa u anuluan)
├── proratedAmount = (sessionsHeld / sessionsPlanned) * clientCount * ratePerClient
├── bonus
├── deductions
├── totalAmount
├── status: pending / paid / cancelled
└── paidDate
```

Formula e pagesës:
```
Pagesa = (Seancat e mbajtura / Seancat e planifikuara) × Numri i klientëve × Komisioni për klient
```

Shembull: Grupi ka 3 seanca në javë (12 në muaj). Nëse u anuluan 2 seanca (10 të mbajtura), me 10 klientë × 20€:
```
(10 / 12) × 10 × 20 = 166.67€ (jo 200€)
```

---

*Audit kryer më: 2026-06-27*
*Sistemi: StandUp CrossFit Gym Management*
*Backend: .NET 8 | Frontend: React + Vite | DB: MySQL (EF Core)*
