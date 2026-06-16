export default function About() {
  return (
    <div className="w-full">
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">About StandUp CrossFit</h1>

        <div className="prose max-w-none">
          <h2 className="text-2xl font-semibold mt-8 mb-4">Our Mission</h2>
          <p className="text-gray-700 mb-6">
            StandUp CrossFit is dedicated to providing gym owners and fitness professionals with
            a comprehensive management platform that streamlines operations, enhances member experience,
            and maximizes profitability.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">What We Offer</h2>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
            <li>Complete membership and client management</li>
            <li>Schedule and class management system</li>
            <li>Financial tracking and reporting</li>
            <li>Personal training program planning</li>
            <li>Diet and nutrition tracking</li>
            <li>Attendance and progress monitoring</li>
            <li>Staff and role management</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Our Team</h2>
          <p className="text-gray-700 mb-6">
            Built by fitness professionals and software engineers who understand the unique
            challenges of running a modern fitness facility.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Us</h2>
          <p className="text-gray-700">
            Have questions? Reach out to us at <span className="font-semibold">info@standupfit.com</span>
          </p>
        </div>
      </section>
    </div>
  )
}
