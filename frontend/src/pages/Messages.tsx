import { Mail, MessageSquare } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/ui/button'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import api from '../utils/api'
import { DashboardShell, DashboardHeader, Panel, EmptyState, Badge, fieldCls, primaryBtn } from '../components/DashboardKit'

interface Conversation {
  userId: number
  name: string
  email: string
  lastMessage: string
  sentAt: string
  unread: number
}

interface Contact {
  id: number
  name: string
  email: string
  role: string
}

interface Message {
  id: number
  senderUserId: number
  receiverUserId: number
  body: string
  sentAt: string
  readAt?: string | null
  mine: boolean
}

function timeLabel(value?: string) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('sq-AL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function roleLabel(role: string) {
  const map: Record<string, string> = {
    Admin: 'Admin',
    Trainer: 'Trajner',
    Client: 'Klient',
    GymOwner: 'Owner',
    Staff: 'Staf',
    Cashier: 'Arkë',
    TrainerTenant: 'Qiragji',
    TenantClient: 'Klient qiragjiu',
  }
  return map[role] ?? role
}

export default function Messages() {
  const { user } = useAuth()
  const { addNotification } = useNotification()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selected, setSelected] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')
  const [search, setSearch] = useState('')
  const [loadingThread, setLoadingThread] = useState(false)

  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts])

  const fetchInbox = async () => {
    const res = await api.get('/messages/inbox')
    setConversations(res.data ?? [])
  }

  const fetchContacts = async (term = '') => {
    const res = await api.get(`/messages/contacts${term.trim() ? `?q=${encodeURIComponent(term.trim())}` : ''}`)
    setContacts(res.data ?? [])
  }

  const openThread = async (contact: Contact) => {
    setSelected(contact)
    setLoadingThread(true)
    try {
      const res = await api.get(`/messages/thread/${contact.id}`)
      setMessages(res.data ?? [])
      fetchInbox()
    } catch {
      addNotification('Gabim', 'Mesazhet nuk u ngarkuan.', 'error')
    } finally {
      setLoadingThread(false)
    }
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected || !body.trim()) return
    try {
      await api.post('/messages', { receiverUserId: selected.id, body: body.trim() })
      setBody('')
      await openThread(selected)
      await fetchInbox()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || err.response?.data || 'Dërgimi dështoi.', 'error')
    }
  }

  useEffect(() => {
    fetchInbox().catch(() => addNotification('Gabim', 'Inbox nuk u ngarkua.', 'error'))
    fetchContacts().catch(() => addNotification('Gabim', 'Kontaktet nuk u ngarkuan.', 'error'))
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchContacts(search).catch(() => undefined)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [search])

  const conversationContacts = conversations.map((c) => contactById.get(c.userId) ?? {
    id: c.userId,
    name: c.name,
    email: c.email,
    role: '',
  })
  const visibleContacts = contacts.filter((c) => !conversations.some((x) => x.userId === c.id))

  return (
    <DashboardShell>
      <DashboardHeader
        badge={user?.role ? roleLabel(user.role) : 'Inbox'}
        title="Mesazhet"
        subtitle="Biseda të shkurta mes stafit, trajnerëve dhe klientëve."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        <Panel title="Inbox" action={<Badge accent="green">{conversations.reduce((sum, c) => sum + c.unread, 0)} pa lexuara</Badge>}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kërko kontakt..."
            className={`${fieldCls} mb-4`}
          />

          <div className="space-y-2">
            {conversationContacts.length === 0 && visibleContacts.length === 0 ? (
              <EmptyState icon={<MessageSquare className="h-5 w-5" />} text="S'ka biseda ende. Kërko një kontakt për ta nisur." />
            ) : (
              <>
                {conversations.map((c) => {
                  const contact = contactById.get(c.userId) ?? { id: c.userId, name: c.name, email: c.email, role: '' }
                  return (
                    <button
                      key={c.userId}
                      onClick={() => openThread(contact)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        selected?.id === c.userId ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{c.name}</p>
                          <p className="truncate text-xs text-gray-400">{c.email}</p>
                        </div>
                        {c.unread > 0 && <Badge accent="green">{c.unread}</Badge>}
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-gray-500">{c.lastMessage}</p>
                      <p className="mt-1 text-[11px] text-gray-400">{timeLabel(c.sentAt)}</p>
                    </button>
                  )
                })}

                {visibleContacts.length > 0 && (
                  <div className="pt-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Kontakte</p>
                    {visibleContacts.slice(0, 12).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => openThread(c)}
                        className="mb-2 flex w-full items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-left hover:bg-gray-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-gray-800">{c.name}</span>
                          <span className="block truncate text-xs text-gray-400">{c.email}</span>
                        </span>
                        <span className="ml-3 shrink-0 text-xs text-gray-400">{roleLabel(c.role)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </Panel>

        <Panel title={selected ? selected.name : 'Biseda'}>
          {!selected ? (
            <EmptyState icon={<Mail className="h-5 w-5" />} text="Zgjedh një bisedë ose kontakt për të shkruar." />
          ) : (
            <div className="flex min-h-[560px] flex-col">
              <div className="mb-4 border-b border-gray-100 pb-3">
                <p className="text-sm font-semibold text-gray-900">{selected.name}</p>
                <p className="text-xs text-gray-400">{selected.email}{selected.role ? ` · ${roleLabel(selected.role)}` : ''}</p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {loadingThread ? (
                  <p className="py-10 text-center text-sm text-gray-400">Duke ngarkuar...</p>
                ) : messages.length === 0 ? (
                  <EmptyState icon={<MessageSquare className="h-5 w-5" />} text="Bisedë e re. Shkruaje mesazhin e parë." />
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
                        m.mine ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'
                      }`}>
                        <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                        <p className={`mt-1 text-[11px] ${m.mine ? 'text-gray-300' : 'text-gray-400'}`}>{timeLabel(m.sentAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={send} className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Shkruaj mesazh..."
                  rows={2}
                  maxLength={4000}
                  className={fieldCls}
                />
                <Button type="submit" className={`${primaryBtn} self-end`} disabled={!body.trim()}>
                  Dërgo
                </Button>
              </form>
            </div>
          )}
        </Panel>
      </div>
    </DashboardShell>
  )
}
