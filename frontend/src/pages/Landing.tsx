import { FormEvent, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../utils/api'

/*
 * Faqja publike e Stand Up CrossFit — sipas dizajnit të marketingut.
 * Seksionet: Hero + statistika, Vlerat, Manifesti, Programet, Trajnerët,
 * Orari javor, Anëtarësia, FAQ, Lokacioni + forma e kontaktit.
 * Trajnerët dhe pakot vijnë LIVE nga /api/public/landing (pa auth);
 * listat statike më poshtë mbeten si fallback kur API s'përgjigjet
 * ose s'ka ende të dhëna. Orari/programet mbeten statike (për tani).
 */

const img = (id: string, w = 700) =>
  `url('https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80')`

// TODO: zëvendëso fotot Unsplash me fotot reale të sallës.
// Klasat e sallës — vetëm këto gjashtë (kërkesë e pronarit 2026-07-03).
const programs = [
  { name: 'Calisthenics', tag: 'Peshë trupore', desc: 'Kontroll dhe forcë me peshën e trupit — nga lëvizjet bazë deri te elementet e avancuara si muscle-up dhe handstand.', bg: img('photo-1571019613454-1cb2f99b2d8b') },
  { name: 'Aerobik', tag: 'Kardio', desc: 'Punë intensive kardiovaskulare për të ndërtuar kapacitet dhe për të djegur yndyrë — energji dhe ritëm në çdo seancë.', bg: img('photo-1554284126-aa88f22d8b74') },
  { name: 'Ngritje Olimpike', tag: 'Teknikë', desc: 'Teknikë e dedikuar me shtangë — snatch, clean & jerk — me trajnim praktik dhe korrigjim të lëvizjes.', bg: img('photo-1526401485004-46910ecc8e51') },
  { name: 'Forcë', tag: 'Strength', desc: 'Ndërtim force me lëvizje bazë — squat, bench, deadlift — me progresion të matshëm javë pas jave.', bg: img('photo-1534438327276-14e5300c3a48') },
  { name: 'Qëndrueshmëri', tag: 'Endurance', desc: 'Kapacitet dhe rezistencë për seanca të gjata — punë e vazhdueshme që e ngren kufirin tënd.', bg: img('photo-1517838277536-f5f99be501cd') },
  { name: 'Balancë', tag: 'Ekuilibër & mobilitet', desc: 'Kontroll trupor, stabilitet dhe mobilitet — themeli që i mban të gjitha lëvizjet e tjera të sigurta.', bg: img('photo-1599058917212-d750089bc07e') },
]

const coaches = [
  { name: 'Marcus Reyes', role: 'Trajner Kryesor', tag: 'Ngritje olimpike', bg: img('photo-1594381898411-846e7d193883') },
  { name: 'Dana Whitlock', role: 'Trajnere', tag: 'Gjimnastikë & mobilitet', bg: img('photo-1550345332-09e3ac987658') },
  { name: 'Theo Nkemelu', role: 'Trajner', tag: 'Qëndrueshmëri & rrema', bg: img('photo-1541534741688-6078c6bfb5c5') },
  { name: 'Priya Anand', role: 'Trajnere', tag: 'Themelet & fillestarët', bg: img('photo-1518611012118-696072aa579a') },
  { name: 'Sam Okafor', role: 'Trajner', tag: 'Powerlifting', bg: img('photo-1549060279-7e168fcee0c2') },
  { name: 'Lena Fischer', role: 'Trajnere', tag: 'Mobilitet & rikuperim', bg: img('photo-1517836357463-d25dfeac3438') },
  { name: 'Jesse Cormier', role: 'Trajner', tag: 'Metcon & kondicion', bg: img('photo-1583454110551-21f2fa2afe61') },
  { name: 'Aisha Rahman', role: 'Trajnere', tag: 'Ushqyerja & shprehitë', bg: img('photo-1526506118085-60ce8714f8c5') },
  { name: 'Nathan Brooks', role: 'Trajner', tag: 'Përgatitje për gara', bg: img('photo-1584464491033-06628f3a6b7b') },
  { name: 'Camila Duarte', role: 'Trajnere', tag: 'Kettlebell & core', bg: img('photo-1517963879433-6ad2b056d712') },
]

// Orari javor — gjenerik Hën–Sht (të njëjtat blloqe çdo ditë) derisa admini të
// konfigurojë grupet reale te sistemi; ai orar i saktë del te aplikacioni i klientit.
const scheduleDays = 'E Hënë – E Shtunë'
const scheduleBlocks = [
  { time: '06:00 – 08:00', name: 'WOD i Mëngjesit', level: 'Të gjitha nivelet' },
  { time: '09:00 – 11:00', name: 'Forcë & Ngritje Olimpike', level: 'I hapur' },
  { time: '17:00 – 19:00', name: 'Calisthenics & Balancë', level: 'Të gjitha nivelet' },
  { time: '19:00 – 21:00', name: 'Aerobik & Qëndrueshmëri', level: 'Të gjitha nivelet' },
]

// Planet — 3 pakot bazë (kërkesë e pronarit 2026-07-03). Këto janë fallback;
// nëse admini i shton si Pakot reale te /admin/plans, faqja i merr live nga API.
const plans = [
  {
    name: 'Bazik',
    blurb: 'Qasje e plotë në klasa grupi — fillo me themelet.',
    monthly: 70,
    popular: false,
    features: ['Klasa grupi pa limit', 'Qasje e plotë në aplikacion', 'Tracking i progresit & qëllimeve', 'Qasje me QR dhe orari i grupit tënd'],
  },
  {
    name: 'Pro',
    blurb: 'Gjithçka nga Bazik, plus plan nutricioni i personalizuar.',
    monthly: 100,
    popular: true,
    features: ['Gjithçka nga Bazik', 'Plan nutricioni i personalizuar', 'Ndjekje mujore e planit nga trajneri', 'Raporte javore progresi'],
  },
  {
    name: 'Personal Trainer',
    blurb: 'Gjithçka nga Pro, plus trajnim personal 1-me-1.',
    monthly: 250,
    popular: false,
    features: ['Gjithçka nga Pro', 'Seanca trajnimi personal 1-me-1', 'Program i skicuar vetëm për ty', 'Prioritet në rezervime'],
  },
]

const faqs = [
  { q: 'A më duhet përvojë për të filluar?', a: 'Aspak. Më shumë se gjysma e anëtarëve tanë s’kishin prekur kurrë shtangë para se të vinin. Të gjithë fillojnë me Themelet, ku trajneri t’i mëson lëvizjet një-me-një para se t’i bashkohesh klasës në grup.' },
  { q: 'Çfarë është në fakt një “WOD”?', a: 'Workout of the Day — stërvitja e ditës e dizajnuar nga trajneri, që e bën bashkë gjithë klasa. Ndryshon çdo ditë dhe gjithmonë shkallëzohet, kështu që fillestari dhe garuesi stërviten krah për krah, secili me intensitetin e duhur.' },
  { q: 'Si të filloj?', a: 'Rezervo një klasë hyrëse falas me formularin më poshtë. Bisedojmë për qëllimet e tua, ta tregojmë sallën dhe të vëmë në lëvizje. Zero presion dhe pa anëtarësi të detyruar.' },
  { q: 'Çfarë duhet të marr me vete në klasën e parë?', a: 'Rroba të rehatshme sportive, një shishe uji dhe atlete. Kaq — pjesën tjetër e sigurojmë ne, dhe trajneri të udhëzon gjatë gjithë kohës.' },
  { q: 'A ofroni drop-in për vizitorët?', a: 'Po. Sportistët në udhëtim janë gjithmonë të mirëseardhur për një seancë të vetme. Vetëm na shkruaj paraprakisht që të ta ruajmë vendin.' },
  { q: 'A mund ta ngrij ose anuloj anëtarësinë?', a: 'Kurdo. Nuk ka kontratë afatgjatë — mund ta ngrish për udhëtim a lëndim, dhe ta anulosh me 30 ditë njoftim, pa pyetje.' },
]

const values = ['Më shumë se një palestër', 'Progres që matet', 'Raporte nga trajneri yt', 'Grupi yt të pret']

// Manifesti — pse s'jemi "edhe një gym": sistemi, tracking-u, raportet, grupi.
const pillars = [
  {
    title: 'Sistem, jo improvizim',
    desc: 'Orare, grupe, qasje me QR dhe një aplikacion ku e sheh gjithçka — anëtarësinë, orarin, progresin. Asgjë nuk mbetet në letër a në kokën e dikujt.',
  },
  {
    title: 'Tracking i vërtetë',
    desc: 'Çdo stërvitje, qëllim dhe matje regjistrohet. E sheh saktë ku ishe muajin e kaluar dhe ku je sot — me numra, jo me përshtypje.',
  },
  {
    title: 'Raporte që flasin',
    desc: 'Trajneri yt përgatit raporte javore me plan, dietë dhe ushtrime — të personalizuara për ty, jo shabllon i shkarkuar nga interneti.',
  },
  {
    title: 'Ke grup. Ke vend.',
    desc: 'Këtu nuk je një abonim anonim. Ke grupin tënd, orarin tënd dhe njerëz që e vënë re kur mungon — dhe të presin kur kthehesh.',
  },
]

// Pool fotosh për kartelat e trajnerëve live (derisa të vijnë fotot reale).
const coachImgIds = [
  'photo-1594381898411-846e7d193883', 'photo-1550345332-09e3ac987658', 'photo-1541534741688-6078c6bfb5c5',
  'photo-1518611012118-696072aa579a', 'photo-1549060279-7e168fcee0c2', 'photo-1517836357463-d25dfeac3438',
  'photo-1583454110551-21f2fa2afe61', 'photo-1526506118085-60ce8714f8c5', 'photo-1584464491033-06628f3a6b7b',
  'photo-1517963879433-6ad2b056d712',
]

interface PublicTrainer {
  id: number
  name: string
  specialization: string | null
  trainerType: string | null
  photoUrl: string | null
  title: string | null
  bio: string | null
  workExperience: string | null
  certifications: string | null
  trainings: string | null
}
interface PublicPlan { id: number; name: string; description: string | null; price: number; durationDays: number; sessionsTotal: number | null; planType: string | null }

// Fotot e trajnerëve vijnë si /uploads/... nga backend — kthej URL absolute.
function resolvedPhoto(url: string | null) {
  if (!url) return null
  if (url.startsWith('http')) return url
  const base = (api.defaults.baseURL || '').replace(/\/api\/?$/, '')
  return `${base}${url}`
}

const durationLabel = (d: number) => (d >= 28 && d <= 31 ? '/muaj' : d >= 360 && d <= 370 ? '/vit' : ` / ${d} ditë`)

const planFeatures = (p: PublicPlan) => [
  p.sessionsTotal && p.sessionsTotal > 0 ? `${p.sessionsTotal} seanca të përfshira` : 'Klasa grupi pa limit',
  'Tracking i progresit & qëllimeve në aplikacion',
  'Plan dhe raporte nga trajneri yt',
  'Qasje me QR dhe orari i grupit tënd',
]

function Eyebrow({ children, onDark = false }: { children: string; onDark?: boolean }) {
  return (
    <div className={`mb-3.5 text-[13px] font-bold uppercase tracking-[0.14em] ${onDark ? 'text-clay-mid' : 'text-clay'}`}>
      {children}
    </div>
  )
}

function LevelPill({ children }: { children: string }) {
  return (
    <span className="whitespace-nowrap rounded-full border border-olive/35 px-3 py-[5px] text-xs font-semibold text-olive">
      {children}
    </span>
  )
}

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [liveTrainers, setLiveTrainers] = useState<PublicTrainer[]>([])
  const [livePlans, setLivePlans] = useState<PublicPlan[]>([])
  const { hash } = useLocation()

  // Trajnerët dhe pakot reale — statiket mbeten fallback.
  useEffect(() => {
    api.get('/public/landing').then((r) => {
      if (Array.isArray(r.data?.trainers)) setLiveTrainers(r.data.trainers)
      if (Array.isArray(r.data?.plans)) setLivePlans(r.data.plans)
    }).catch(() => {})
  }, [])

  const coachList = liveTrainers.length > 0
    ? liveTrainers.map((t, i) => {
        const photo = resolvedPhoto(t.photoUrl)
        return {
          name: t.name,
          role: t.title || (t.trainerType === 'personal' ? 'Trajner Personal' : 'Trajner'),
          tag: t.specialization || 'CrossFit',
          bio: t.bio || t.workExperience || t.certifications || '',
          bg: photo ? `url('${photo}')` : img(coachImgIds[i % coachImgIds.length]),
        }
      })
    : coaches.map((c) => ({ ...c, bio: '' }))
  const usingLivePlans = livePlans.length > 0
  // "Më i kërkuari" = pako e mesme sipas çmimit (vjen e renditur nga API).
  const popularIdx = usingLivePlans && livePlans.length >= 3 ? Math.floor(livePlans.length / 2) : -1

  const stats = [
    { value: '1,200+', label: 'anëtarë të trajnuar' },
    { value: String(coachList.length), label: 'trajnerë të certifikuar' },
    { value: '4.9★', label: 'vlerësim mesatar' },
  ]

  // Scroll te seksioni kur ndryshon hash-i (p.sh. nga header-i).
  useEffect(() => {
    if (!hash) return
    const el = document.querySelector(hash)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])


  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="w-full bg-cream text-cocoa">
      {/* HERO */}
      <section id="top" className="px-5 pt-5">
        <div
          className="relative mx-auto flex min-h-[560px] max-w-[1360px] items-end overflow-hidden rounded-[26px] bg-[#2A241D] bg-cover md:min-h-[640px]"
          style={{ backgroundImage: img('photo-1534438327276-14e5300c3a48', 1900), backgroundPosition: 'center 30%' }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(30,25,19,0.28)_0%,rgba(30,25,19,0.15)_40%,rgba(30,25,19,0.82)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(30,25,19,0.62)_0%,rgba(30,25,19,0.12)_55%,rgba(30,25,19,0)_80%)]" />

          <div className="absolute left-7 top-7 inline-flex items-center gap-2 rounded-full border border-cream/30 bg-cream/15 px-[15px] py-2 text-[13px] font-semibold text-cream backdrop-blur-sm">
            <span className="h-[7px] w-[7px] rounded-full bg-[#6BBF7B] shadow-[0_0_0_4px_rgba(107,191,123,0.25)]" />
            Po rezervojmë klasa hyrëse falas
          </div>

          <div className="relative z-[2] w-full p-8 md:p-16">
            <div className="max-w-[760px]">
              <h1 className="mb-5 font-newsreader text-[clamp(48px,7vw,104px)] font-normal leading-[0.96] tracking-[-0.025em] text-[#F7F3EA]">
                Paraqitu.
                <br />
                Ngrihu.
                <br />
                <span className="italic text-clay-light">Forcohu.</span>
              </h1>
              <p className="mb-8 max-w-[520px] text-[clamp(17px,1.5vw,20px)] leading-[1.55] text-[#F7F3EA]/85">
                Kjo nuk është thjesht palestër — është sistem. Trajnim në grupe të vogla,
                progres që matet stërvitje pas stërvitjeje, raporte nga trajneri yt dhe
                një vend ku të njohin me emër. Dita e parë a viti i dhjetë — ke grup, ke vend.
              </p>
              <div className="flex flex-wrap gap-3.5">
                <a
                  href="#contact"
                  className="rounded-full bg-clay px-[30px] py-4 text-base font-semibold text-[#F7F3EA] shadow-[0_14px_30px_-12px_rgba(176,96,58,0.8)] transition hover:bg-clay/90"
                >
                  Rezervo klasën tënde falas
                </a>
                <a
                  href="#programs"
                  className="rounded-full border border-[#F7F3EA]/35 bg-[#F7F3EA]/10 px-7 py-4 text-base font-semibold text-[#F7F3EA] backdrop-blur-sm transition hover:bg-[#F7F3EA]/20"
                >
                  Shiko programet
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Statistikat nën hero */}
        <div className="mx-auto grid max-w-[1360px] grid-cols-3">
          {stats.map((s, i) => (
            <div key={s.label} className={`px-4 py-6 text-center md:px-6 ${i < stats.length - 1 ? 'border-r border-cocoa/10' : ''}`}>
              <div className="font-newsreader text-[clamp(24px,3vw,40px)] leading-none">{s.value}</div>
              <div className="mt-1.5 text-[13.5px] text-[#6E6456]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* VLERAT */}
      <section className="mt-5 border-y border-cocoa/10">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-[22px] text-sm font-semibold text-[#6E6456]">
          {values.map((v) => (
            <span key={v}>◇ {v}</span>
          ))}
        </div>
      </section>

      {/* MANIFESTI — pse jemi më shumë se një palestër */}
      <section id="why" className="mx-auto max-w-[1200px] scroll-mt-24 px-6 pt-24">
        <div className="rounded-[26px] bg-paper px-7 py-14 md:px-14">
          <div className="mx-auto mb-12 max-w-[680px] text-center">
            <Eyebrow>Filozofia jonë</Eyebrow>
            <h2 className="mb-5 font-newsreader text-[clamp(32px,4vw,52px)] font-normal leading-[1.05] tracking-[-0.02em]">
              Nuk jemi palestër.
              <br />
              Jemi <span className="italic text-clay">më shumë se palestër</span>.
            </h2>
            <p className="text-[16.5px] leading-relaxed text-[#5C5346]">
              Një palestër të jep çelësin dhe të harron. Ne të japim një sistem: grupin tënd,
              orarin tënd, trajnerin që ta ndjek progresin dhe raportet që ta tregojnë zi mbi
              të bardhë se po ecën. Stërvitja është vetëm ora e parë — pjesa tjetër është
              mënyra si punojmë.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((p, i) => (
              <div key={p.title} className="rounded-[18px] border border-cocoa/10 bg-cream p-6">
                <div className="mb-3 font-newsreader text-[15px] italic text-clay">0{i + 1}</div>
                <h3 className="mb-2.5 font-newsreader text-[21px] font-medium leading-snug">{p.title}</h3>
                <p className="text-[14px] leading-[1.6] text-[#5C5346]">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROGRAMET */}
      <section id="programs" className="mx-auto max-w-[1200px] scroll-mt-24 px-6 pb-20 pt-24">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-5">
          <div>
            <Eyebrow>Programet</Eyebrow>
            <h2 className="max-w-[620px] font-newsreader text-[clamp(32px,3.8vw,48px)] font-normal leading-[1.05] tracking-[-0.02em]">
              Klasa të ndërtuara për të të çuar përpara
            </h2>
          </div>
          <p className="max-w-[340px] text-base leading-relaxed text-[#5C5346]">
            Çdo seancë udhëhiqet nga trajneri dhe shkallëzohet. Zgjidh një drejtim ose
            kombinoji të gjitha — anëtarësia mbulon gjithë sallën.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <div key={p.name} className="overflow-hidden rounded-[18px] border border-cocoa/10 bg-paper">
              <div className="aspect-[16/10] bg-[#D8CDBA] bg-cover bg-center" style={{ backgroundImage: p.bg }} />
              <div className="px-[22px] pb-[26px] pt-[22px]">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <h3 className="font-newsreader text-[22px] font-medium">{p.name}</h3>
                  <LevelPill>{p.tag}</LevelPill>
                </div>
                <p className="text-[14.5px] leading-[1.55] text-[#5C5346]">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TRAJNERËT */}
      <section id="coaches" className="scroll-mt-24 bg-sand">
        <div className="mx-auto max-w-[1200px] px-6 py-24">
          <div className="mx-auto mb-14 max-w-[620px] text-center">
            <Eyebrow>Trajnerët</Eyebrow>
            <h2 className="mb-4 font-newsreader text-[clamp(32px,3.8vw,48px)] font-normal leading-[1.05] tracking-[-0.02em]">
              Njerëz që ta dinë emrin
            </h2>
            <p className="text-[16.5px] leading-relaxed text-[#5C5346]">
              Të certifikuar, me përvojë dhe të përkushtuar. Trajnerët tanë e shkruajnë
              programin, udhëheqin çdo klasë, ta ndjekin progresin dhe t’i përgatisin
              raportet — ata e dinë ku ke mbetur edhe kur ti e harron.
            </p>
          </div>
          <div className="mx-auto flex max-w-[980px] flex-wrap justify-center gap-x-8 gap-y-10">
            {coachList.map((c) => (
              <div key={c.name} className="w-[168px] text-center sm:w-[188px]">
                <div
                  className="mb-4 aspect-[3/4] rounded-2xl bg-[#CFC4B0] bg-cover bg-center shadow-[0_18px_34px_-20px_rgba(36,31,24,0.45)] ring-1 ring-cocoa/5"
                  style={{ backgroundImage: c.bg }}
                />
                <h3 className="font-newsreader text-[19px] font-medium">{c.name}</h3>
                <div className="mb-1 text-[13px] font-semibold text-clay">{c.role}</div>
                <div className="text-[13px] text-[#5C5346]">{c.tag}</div>
                {c.bio && <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug text-[#6E6456]">{c.bio}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ORARI JAVOR */}
      <section id="schedule" className="mx-auto max-w-[1200px] scroll-mt-24 px-6 pb-20 pt-24">
        <div className="mx-auto mb-11 max-w-[620px] text-center">
          <Eyebrow>Orari javor</Eyebrow>
          <h2 className="mb-4 font-newsreader text-[clamp(32px,3.8vw,48px)] font-normal leading-[1.05] tracking-[-0.02em]">
            Hapur {scheduleDays}
          </h2>
          <p className="text-[16.5px] leading-relaxed text-[#5C5346]">
            Katër blloqe stërvitjeje çdo ditë, nga mëngjesi te mbrëmja — zgjidh orën
            që të përshtatet dhe eja. Grupi yt i saktë, me orarin dhe trajnerin tënd,
            konfigurohet kur bëhesh anëtar dhe e sheh gjithmonë në aplikacion.
          </p>
        </div>
        <div className="mx-auto flex max-w-[760px] flex-col gap-2.5">
          {scheduleBlocks.map((s) => (
            <div
              key={s.time}
              className="grid grid-cols-[64px_1fr] items-center gap-3 rounded-[14px] border border-cocoa/10 bg-paper px-5 py-4 sm:grid-cols-[150px_1fr_auto] sm:gap-[18px] sm:px-[22px]"
            >
              <div className="font-newsreader text-lg sm:text-xl">{s.time}</div>
              <div className="text-[15.5px] font-bold">{s.name}</div>
              <div className="col-span-2 justify-self-start sm:col-span-1 sm:justify-self-auto">
                <LevelPill>{s.level}</LevelPill>
              </div>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-10 flex max-w-[760px] flex-col items-center gap-4 rounded-[20px] border border-cocoa/10 bg-paper px-8 py-9 text-center">
          <p className="max-w-[480px] text-[16.5px] leading-relaxed text-[#5C5346]">
            Çdo grup ka orarin, trajnerin dhe shokët e vet. Duam të shohim nëse ka
            vend të lirë pikërisht për ty — na shkruaj dhe të gjejmë grupin e duhur.
          </p>
          <a
            href="#contact"
            className="rounded-full bg-clay px-7 py-3.5 text-[15px] font-semibold text-cream transition hover:bg-clay/90"
          >
            Shiko nëse ka grupe të lira
          </a>
        </div>
      </section>

      {/* ANËTARËSIA */}
      <section id="pricing" className="scroll-mt-24 bg-cocoa text-cream">
        <div className="mx-auto max-w-[1200px] px-6 py-24">
          <div className="mx-auto mb-5 max-w-[560px] text-center">
            <Eyebrow onDark>Anëtarësia</Eyebrow>
            <h2 className="mb-5 text-white  font-newsreader text-[clamp(32px,3.8vw,48px)] font-normal leading-[1.05] tracking-[-0.02em]">
              Plane të thjeshta. Pa kontrata.
            </h2>
          </div>
          {usingLivePlans ? (
            <div className="grid grid-cols-1 items-stretch gap-[22px] pt-7 lg:grid-cols-3">
              {livePlans.map((p, i) => (
                <div
                  key={p.id}
                  className={`relative flex flex-col rounded-[20px] p-8 ${
                    i === popularIdx ? 'border-[1.5px] border-clay bg-cream/10' : 'border border-cream/15 bg-cream/5'
                  }`}
                >
                  {i === popularIdx && (
                    <div className="absolute right-[18px] top-[18px] rounded-full bg-clay px-[11px] py-[5px] text-[11px] font-bold uppercase tracking-[0.06em] text-cream">
                      Më i kërkuari
                    </div>
                  )}
                  <h3 className="mb-1.5 font-newsreader text-2xl text-white font-medium">{p.name}</h3>
                  <p className="mb-[22px] min-h-[42px] text-sm leading-normal opacity-75">
                    {p.description || 'Anëtarësi me grup, orar dhe ndjekje progresi.'}
                  </p>
                  <div className="mb-6 flex items-baseline gap-1.5">
                    <span className="font-newsreader text-[46px] leading-none">€{p.price}</span>
                    <span className="text-sm opacity-70">{durationLabel(p.durationDays)}</span>
                  </div>
                  <a
                    href="#contact"
                    className={`rounded-full py-[13px] text-center text-[15px] font-semibold transition ${
                      i === popularIdx ? 'bg-clay text-cream hover:bg-clay/90' : 'border border-cream/35 text-cream hover:bg-cream/10'
                    }`}
                  >
                    Fillo tani
                  </a>
                  <div className="my-6 h-px bg-cream/15" />
                  <div className="flex flex-col gap-[11px]">
                    {planFeatures(p).map((f) => (
                      <div key={f} className="flex gap-2.5 text-sm">
                        <span className="text-clay-mid">✓</span>
                        <span className="opacity-90">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <div className="grid grid-cols-1 items-stretch gap-[22px] lg:grid-cols-3">
            {plans.map((pl) => (
              <div
                key={pl.name}
                className={`relative flex flex-col rounded-[20px] p-8 ${
                  pl.popular
                    ? 'border-[1.5px] border-clay bg-cream/10'
                    : 'border border-cream/15 bg-cream/5'
                }`}
              >
                {pl.popular && (
                  <div className="absolute right-[18px] top-[18px] rounded-full bg-clay px-[11px] py-[5px] text-[11px] font-bold uppercase tracking-[0.06em] text-cream">
                    Më i kërkuari
                  </div>
                )}
                <h3 className="mb-1.5 font-newsreader text-2xl font-medium">{pl.name}</h3>
                <p className="mb-[22px] min-h-[42px] text-sm leading-normal opacity-75">{pl.blurb}</p>
                <div className="mb-6 flex items-baseline gap-1.5">
                  <span className="font-newsreader text-[46px] leading-none">€{pl.monthly}</span>
                  <span className="text-sm opacity-70">/muaj</span>
                </div>
                <a
                  href="#contact"
                  className={`rounded-full py-[13px] text-center text-[15px] font-semibold transition ${
                    pl.popular
                      ? 'bg-clay text-cream hover:bg-clay/90'
                      : 'border border-cream/35 text-cream hover:bg-cream/10'
                  }`}
                >
                  Fillo tani
                </a>
                <div className="my-6 h-px bg-cream/15" />
                <div className="flex flex-col gap-[11px]">
                  {pl.features.map((f) => (
                    <div key={f} className="flex gap-2.5 text-sm">
                      <span className="text-clay-mid">✓</span>
                      <span className="opacity-90">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-[840px] scroll-mt-24 px-6 pb-20 pt-24">
        <div className="mb-12 text-center">
          <Eyebrow>Pyetje</Eyebrow>
          <h2 className="font-newsreader text-[clamp(32px,3.8vw,48px)] font-normal leading-[1.05] tracking-[-0.02em]">
            Gjithçka që po pyesje veten
          </h2>
        </div>
        <div className="flex flex-col gap-3">
          {faqs.map((f, i) => {
            const open = openFaq === i
            return (
              <div key={f.q} className="overflow-hidden rounded-[14px] border border-cocoa/10 bg-paper">
                <button
                  onClick={() => setOpenFaq(open ? -1 : i)}
                  className="flex w-full items-center justify-between gap-4 px-[22px] py-5 text-left text-[16.5px] font-semibold text-cocoa"
                  aria-expanded={open}
                >
                  {f.q}
                  <span
                    className={`inline-block text-[22px] font-normal text-clay transition-transform duration-200 ${open ? 'rotate-45' : ''}`}
                  >
                    +
                  </span>
                </button>
                {open && <div className="px-[22px] pb-[22px] text-[15px] leading-relaxed text-[#5C5346]">{f.a}</div>}
              </div>
            )
          })}
        </div>
      </section>

      {/* LOKACIONI / KONTAKTI */}
      <section id="contact" className="scroll-mt-24 bg-sand">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-start gap-14 px-6 py-24 lg:grid-cols-2">
          <div>
            <Eyebrow>Na vizito</Eyebrow>
            <h2 className="mb-6 font-newsreader text-[clamp(32px,3.8vw,46px)] font-normal leading-[1.05] tracking-[-0.02em]">
              Klasa e parë është nga ne
            </h2>
            <p className="mb-8 text-[16.5px] leading-relaxed text-[#5C5346]">
              Na lër të dhënat dhe ne e organizojmë një seancë hyrëse falas. Pa anëtarësi
              të detyruar, pa presion — vetëm eja të lëvizim bashkë.
            </p>
            <div
              className="mb-6 aspect-video rounded-2xl bg-[#CFC4B0] bg-cover bg-center"
              style={{ backgroundImage: img('photo-1526401485004-46910ecc8e51', 900) }}
            />
            {/* TODO: zëvendëso me adresën dhe kontaktet reale kur t'i kesh. */}
            <div className="flex flex-wrap gap-8">
              <div>
                <div className="mb-1.5 text-sm font-bold">Lokacioni</div>
                <div className="text-[14.5px] leading-normal text-[#5C5346]">
                  Suharekë, Kosovë
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-sm font-bold">Orari</div>
                <div className="text-[14.5px] leading-normal text-[#5C5346]">
                  E Hënë – E Shtunë
                  <br />
                  06:00 – 21:00
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-sm font-bold">Na kontakto</div>
                <div className="text-[14.5px] leading-normal text-[#5C5346]">
                  info@standupcrossfit.com
                  <br />
                  +383 44 000 000
                </div>
              </div>
            </div>
          </div>

          <form
            onSubmit={onSubmit}
            className="rounded-[20px] border border-cocoa/10 bg-paper p-8 shadow-[0_24px_50px_-30px_rgba(36,31,24,0.3)]"
          >
            <h3 className="mb-[22px] font-newsreader text-2xl font-medium">Rezervo klasën tënde hyrëse</h3>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-[7px] text-[13px] font-semibold text-[#413A30]">
                Emri i plotë
                <input
                  type="text"
                  name="fullName"
                  required
                  placeholder="Filan Fisteku"
                  className="rounded-[10px] border border-cocoa/20 bg-cream px-[15px] py-[13px] text-[15px] font-normal text-cocoa outline-none transition focus:border-clay"
                />
              </label>
              <label className="flex flex-col gap-[7px] text-[13px] font-semibold text-[#413A30]">
                Email
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="ti@email.com"
                  className="rounded-[10px] border border-cocoa/20 bg-cream px-[15px] py-[13px] text-[15px] font-normal text-cocoa outline-none transition focus:border-clay"
                />
              </label>
              <label className="flex flex-col gap-[7px] text-[13px] font-semibold text-[#413A30]">
                Niveli i përvojës
                <select
                  name="experience"
                  className="rounded-[10px] border border-cocoa/20 bg-cream px-[15px] py-[13px] text-[15px] font-normal text-cocoa outline-none transition focus:border-clay"
                >
                  <option>Fillestar total</option>
                  <option>Me pak përvojë fitnesi</option>
                  <option>CrossFitter me përvojë</option>
                </select>
              </label>
              <label className="flex flex-col gap-[7px] text-[13px] font-semibold text-[#413A30]">
                Diçka që duhet ta dimë?
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Qëllime, lëndime, pyetje…"
                  className="resize-y rounded-[10px] border border-cocoa/20 bg-cream px-[15px] py-[13px] text-[15px] font-normal text-cocoa outline-none transition focus:border-clay"
                />
              </label>
              <button
                type="submit"
                className="mt-1 rounded-full bg-clay py-[15px] text-[15.5px] font-semibold text-cream transition hover:bg-clay/90"
              >
                Rezervo klasën falas
              </button>
              {submitted && (
                <div className="text-center text-sm font-semibold text-olive">
                  Faleminderit — të kontaktojmë brenda një dite! ✦
                </div>
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
