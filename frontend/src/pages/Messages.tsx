import { Mail, MessageSquare, Users2 } from 'lucide-react'
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

interface GroupConversation {
  groupId: number
  groupName: string
  membersCount: number
  lastMessage?: string | null
  sentAt?: string | null
  unread: number
}

interface GroupThreadMessage {
  id: number
  senderUserId: number
  senderName: string
  body: string
  sentAt: string
  mine: boolean
}

type Mode = 'individual' | 'group'

function timeLabel(value?: string | null) {
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
  const [mode, setMode] = useState<Mode>('individual')

  // --- Individual (1:1) thread state ---
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selected, setSelected] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')
  const [search, setSearch] = useState('')
  const [loadingThread, setLoadingThread] = useState(false)

  // --- Group chat state (real shared thread per group) ---
  const [groupConvos, setGroupConvos] = useState<GroupConversation[]>([])
  const [selectedGroup, setSelectedGroup] = useState<GroupConversation | null>(null)
  const [groupMessages, setGroupMessages] = useState<GroupThreadMessage[]>([])
  const [groupBody, setGroupBody] = useState('')
  const [loadingGroupThread, setLoadingGroupThread] = useState(false)
  const [sendingGroup, setSendingGroup] = useState(false)

  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts])

  const fetchInbox = async () => {
    const res = await api.get('/messages/inbox')
    setConversations(res.data ?? [])
  }

  const fetchContacts = async (term = '') => {
    const res = await api.get(`/messages/contacts${term.trim() ? `?q=${encodeURIComponent(term.trim())}` : ''}`)
    setContacts(res.data ?? [])
  }

  const fetchGroupConvos = async () => {
    const res = await api.get('/messages/groups')
    setGroupConvos(Array.isArray(res.data) ? res.data : [])
  }

  const openGroupThread = async (g: GroupConversation) => {
    setSelectedGroup(g)
    setLoadingGroupThread(true)
    try {
      const res = await api.get(`/messages/groups/${g.groupId}/thread`)
      setGroupMessages(res.data ?? [])
      fetchGroupConvos()
    } catch {
      addNotification('Gabim', 'Biseda e grupit nuk u ngarkua.', 'error')
    } finally {
      setLoadingGroupThread(false)
    }
  }

  const sendToGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGroup || !groupBody.trim()) return
    setSendingGroup(true)
    try {
      await api.post(`/messages/groups/${selectedGroup.groupId}`, { body: groupBody.trim() })
      setGroupBody('')
      await openGroupThread(selectedGroup)
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Dërgimi te grupi dështoi.', 'error')
    } finally {
      setSendingGroup(false)
    }
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
    fetchGroupConvos().catch(() => addNotification('Gabim', 'Grupet nuk u ngarkuan.', 'error'))
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

  const totalUnreadIndividual = conversations.reduce((sum, c) => sum + c.unread, 0)
  const totalUnreadGroups = groupConvos.reduce((sum, c) => sum + c.unread, 0)

  return (
    <DashboardShell>
      <DashboardHeader
        badge={user?.role ? roleLabel(user.role) : 'Inbox'}
        title="Mesazhet"
        subtitle="Biseda individuale dhe chat i përbashkët për çdo grup."
      />

      <div className="flex gap-2">
        <button
          onClick={() => setMode('individual')}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
            mode === 'individual' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Mail className="h-4 w-4" /> Individual
          {totalUnreadIndividual > 0 && <Badge accent="green">{totalUnreadIndividual}</Badge>}
        </button>
        <button
          onClick={() => setMode('group')}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
            mode === 'group' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Users2 className="h-4 w-4" /> Grupe
          {totalUnreadGroups > 0 && <Badge accent="green">{totalUnreadGroups}</Badge>}
        </button>
      </div>

      {mode === 'individual' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
          <Panel title="Inbox" action={<Badge accent="green">{totalUnreadIndividual} pa lexuara</Badge>}>
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
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
          <Panel title="Grupet" action={<Badge accent="green">{totalUnreadGroups} pa lexuara</Badge>}>
            {groupConvos.length === 0 ? (
              <EmptyState icon={<Users2 className="h-5 w-5" />} text="S'ke asnjë grup ende." />
            ) : (
              <div className="space-y-2">
                {groupConvos.map((g) => (
                  <button
                    key={g.groupId}
                    onClick={() => openGroupThread(g)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      selectedGroup?.groupId === g.groupId ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{g.groupName}</p>
                        <p className="truncate text-xs text-gray-400">{g.membersCount} anëtarë</p>
                      </div>
                      {g.unread > 0 && <Badge accent="green">{g.unread}</Badge>}
                    </div>
                    {g.lastMessage && <p className="mt-2 line-clamp-2 text-xs text-gray-500">{g.lastMessage}</p>}
                    <p className="mt-1 text-[11px] text-gray-400">{timeLabel(g.sentAt)}</p>
                  </button>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={selectedGroup ? selectedGroup.groupName : 'Chat i grupit'}>
            {!selectedGroup ? (
              <EmptyState icon={<Users2 className="h-5 w-5" />} text="Zgjedh një grup për të parë bisedën e përbashkët." />
            ) : (
              <div className="flex min-h-[560px] flex-col">
                <div className="mb-4 border-b border-gray-100 pb-3">
                  <p className="text-sm font-semibold text-gray-900">{selectedGroup.groupName}</p>
                  <p className="text-xs text-gray-400">{selectedGroup.membersCount} anëtarë · bisedë e përbashkët</p>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {loadingGroupThread ? (
                    <p className="py-10 text-center text-sm text-gray-400">Duke ngarkuar...</p>
                  ) : groupMessages.length === 0 ? (
                    <EmptyState icon={<MessageSquare className="h-5 w-5" />} text="Ende s'ka mesazhe. Shkruaj i pari te grupi." />
                  ) : (
                    groupMessages.map((m) => (
                      <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
                          m.mine ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {!m.mine && <p className="mb-0.5 text-[11px] font-semibold text-gray-500">{m.senderName}</p>}
                          <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                          <p className={`mt-1 text-[11px] ${m.mine ? 'text-gray-300' : 'text-gray-400'}`}>{timeLabel(m.sentAt)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={sendToGroup} className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
                  <textarea
                    value={groupBody}
                    onChange={(e) => setGroupBody(e.target.value)}
                    placeholder="Shkruaj mesazh për të gjithë grupin..."
                    rows={2}
                    maxLength={4000}
                    className={fieldCls}
                  />
                  <Button type="submit" className={`${primaryBtn} self-end`} disabled={sendingGroup || !groupBody.trim()}>
                    {sendingGroup ? 'Duke dërguar…' : 'Dërgo'}
                  </Button>
                </form>
              </div>
            )}
          </Panel>
        </div>
      )}
    </DashboardShell>
  )
}
