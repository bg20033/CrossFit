export default function About() {
  return (
    <div className="w-full">
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">StandUp CrossFit</h1>

        <div className="prose max-w-none">
          <h2 className="text-2xl font-semibold mt-8 mb-4">Sistemi</h2>
          <p className="text-gray-700 mb-6">
            Platforma lidh operacionet kryesore të palestrës në një vend: klientët, trajnerët,
            stafin, oraret, pagesat, faturat, hyrje-daljet dhe raportet.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Modulet kryesore</h2>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
            <li>Menaxhim i klientëve, pakove dhe prezencës</li>
            <li>Orar i grupeve dhe sesioneve personale</li>
            <li>Financa, arka, pagesa dhe fatura</li>
            <li>Plane ushtrimesh, dieta, qëllime dhe progres</li>
            <li>Role dinamike, staf, njoftime dhe raporte</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
