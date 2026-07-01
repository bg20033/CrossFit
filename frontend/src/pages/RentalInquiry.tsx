import { useState } from 'react'
import { Button } from '../components/ui/button'
import api from '../utils/api'

export default function RentalInquiry() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/rentals/inquiry', formData)
      setSubmitted(true)
      setError('')
      setFormData({ name: '', email: '', phone: '', message: '' })
      setTimeout(() => setSubmitted(false), 5000)
    } catch (err) {
      setError('Kërkesa nuk u dërgua. Provo përsëri.')
    }
  }

  return (
    <div className="w-full">
      <section className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-2">Qira për hapësirë stërvitjeje</h1>
        <p className="text-gray-600 mb-8">Dërgo kërkesën për orare dhe hapësira të lira.</p>

        {submitted && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            Kërkesa u dërgua. Stafi do të të kontaktojë së shpejti.
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2">Emri</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Telefoni</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Mesazhi</label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={5}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <Button type="submit" size="lg">Dërgo kërkesën</Button>
        </form>
      </section>
    </div>
  )
}
