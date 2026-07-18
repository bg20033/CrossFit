// Rreth Nesh — përmbajtje gjenerike (kërkesë 2026-07-03): themeluar 2026, Suharekë.
// TODO: zëvendëso hartën embed me lokacionin e saktë kur të kesh adresën.
const pillars = [
  {
    title: 'Sistem, jo improvizim',
    desc: 'Orare, grupe, qasje me QR dhe një aplikacion ku e sheh gjithçka — anëtarësinë, orarin, progresin.',
  },
  {
    title: 'Trajnerë të certifikuar',
    desc: 'Çdo trajner sjell përvojë, çertifikata dhe program të përshtatur për ty — jo shabllon i kopjuar.',
  },
  {
    title: 'Komunitet i vërtetë',
    desc: 'Ke grupin tënd, orarin tënd dhe njerëz që e vënë re kur mungon — dhe të presin kur kthehesh.',
  },
]

export default function About() {
  return (
    <div className="w-full bg-cream text-cocoa">
      <section className="px-5 pt-14">
        <div className="mx-auto max-w-[900px] text-center">
          <div className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.14em] text-clay">Rreth Nesh</div>
          <h1 className="mb-6 font-newsreader text-[clamp(36px,5vw,58px)] font-normal leading-[1.05] tracking-[-0.02em]">
            Stand Up <span className="italic text-clay">CrossFit</span>
          </h1>
          <p className="mx-auto max-w-[640px] text-[16.5px] leading-relaxed text-[#5C5346]">
            Themeluar në 2026 në qytetin e Suharekës, Stand Up CrossFit është më shumë
            se një palestër — është një sistem i plotë stërvitjeje: grupe, trajnerë,
            orare dhe progres i ndjekur nga afër, në një vend të vetëm. Nisëm me një
            qëllim të thjeshtë: t'i japim çdo anëtari trajnimin, vëmendjen dhe
            komunitetin që meriton, pavarësisht nga niveli me të cilin fillon.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-6 py-16">
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-3">
          {pillars.map((p, i) => (
            <div key={p.title} className="rounded-[18px] border border-cocoa/10 bg-paper p-6">
              <div className="mb-3 font-newsreader text-[15px] italic text-clay">0{i + 1}</div>
              <h3 className="mb-2.5 font-newsreader text-[21px] font-medium leading-snug">{p.title}</h3>
              <p className="text-[14px] leading-[1.6] text-[#5C5346]">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-sand">
        <div className="mx-auto grid max-w-[1100px] grid-cols-1 items-start gap-10 px-6 py-16 lg:grid-cols-2">
          <div>
            <div className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.14em] text-clay">Na gjej</div>
            <h2 className="mb-5 font-newsreader text-[clamp(28px,3.4vw,40px)] font-normal leading-[1.05] tracking-[-0.02em]">
              Suharekë, Kosovë
            </h2>
            <p className="mb-6 text-[15.5px] leading-relaxed text-[#5C5346]">
              Salla jonë ndodhet në qytetin e Suharekës. Na kontakto ose na vizito —
              klasa e parë hyrëse është nga ne.
            </p>
            <div className="flex flex-wrap gap-8">
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
                  <a href="mailto:standupcrossfit.ks@gmail.com" className="transition hover:text-clay">
                    standupcrossfit.ks@gmail.com
                  </a>
                  <br />
                  <a href="tel:+38348481159" className="transition hover:text-clay">
                    +383 48 481 159
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-cocoa/10">
            <iframe
              title="Lokacioni — Suharekë"
              src="https://www.google.com/maps?q=Suharek%C3%AB%2C%20Kosov%C3%AB&output=embed"
              width="100%"
              height="360"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
