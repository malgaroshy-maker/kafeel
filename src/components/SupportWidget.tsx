import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, X, Send, ChevronDown, CheckCheck, Bell, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface SupportMessage {
  id: string
  subject: string
  message: string
  status: 'open' | 'replied' | 'closed'
  created_at: string
  replies?: SupportReply[]
}

interface SupportReply {
  id: string
  message_id: string
  reply_text: string
  read_by_user: boolean
  created_at: string
}

export function SupportWidget() {
  const { session, displayName, officeId } = useAuth()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'inbox' | 'compose'>('inbox')
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const userId = session?.user?.id ?? null

  const loadMessages = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data: msgs } = await supabase
        .from('support_messages')
        .select('*, replies:support_replies(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (msgs) {
        setMessages(msgs as any)
        let count = 0
        for (const m of msgs as any[]) {
          if (m.replies) {
            count += (m.replies as SupportReply[]).filter(r => !r.read_by_user).length
          }
        }
        setUnreadCount(count)
      }
    } catch (e) {
      console.error('SupportWidget load error:', e)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    loadMessages()
    const interval = setInterval(loadMessages, 60000)
    return () => clearInterval(interval)
  }, [userId, loadMessages])

  // Don't render for non-logged-in users
  if (!session?.user) return null

  const markRepliesRead = async (messageId: string) => {
    try {
      await supabase
        .from('support_replies')
        .update({ read_by_user: true })
        .eq('message_id', messageId)
        .eq('read_by_user', false)
      loadMessages()
    } catch (e) { console.error(e) }
  }

  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || !userId) return
    setSending(true)
    try {
      const { error } = await supabase.from('support_messages').insert({
        user_id: userId,
        office_id: officeId || null,
        display_name: displayName || 'مستخدم',
        subject: subject.trim(),
        message: body.trim(),
        status: 'open'
      })
      if (error) throw error
      setSubject('')
      setBody('')
      setSent(true)
      setTimeout(() => {
        setSent(false)
        setView('inbox')
        loadMessages()
      }, 2000)
    } catch (e) {
      console.error(e)
      alert('حدث خطأ أثناء الإرسال، حاول مرة أخرى.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Floating Button */}
      <div
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          left: '1.5rem',
          zIndex: 9000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '0.5rem',
        }}
        dir="rtl"
      >
        {/* Notification badge pulse */}
        {unreadCount > 0 && !open && (
          <div
            style={{
              background: 'linear-gradient(135deg, #bf953f, #fcf6ba, #aa771c)',
              color: '#0f172a',
              borderRadius: '12px',
              padding: '0.4rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              boxShadow: '0 4px 16px rgba(170,119,28,0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              animation: 'supportPulse 2s infinite',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onClick={() => { setOpen(true); setView('inbox') }}
          >
            <Bell size={14} />
            لديك {unreadCount} رد جديد من الدعم الفني
          </div>
        )}

        <button
          onClick={() => setOpen(o => !o)}
          style={{
            background: open
              ? '#0f172a'
              : 'linear-gradient(135deg, #bf953f 0%, #fcf6ba 40%, #aa771c 100%)',
            color: open ? '#fef08a' : '#0f172a',
            border: '2px solid #d4af37',
            borderRadius: '50%',
            width: '54px',
            height: '54px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(170,119,28,0.4)',
            transition: 'all 0.25s ease',
            position: 'relative',
          }}
          title="راسل الدعم الفني"
        >
          {open ? <X size={22} /> : <MessageCircle size={22} />}
          {unreadCount > 0 && !open && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#ef4444',
              color: '#fff',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--bg-primary, #0f172a)',
            }}>
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          dir="rtl"
          style={{
            position: 'fixed',
            bottom: '5.5rem',
            left: '1.5rem',
            zIndex: 9001,
            width: '360px',
            maxHeight: '520px',
            background: 'var(--surface, #1e293b)',
            border: '1.5px solid #d4af37',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'supportSlideUp 0.25s ease',
          }}
        >
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #bf953f 0%, #fcf6ba 40%, #aa771c 100%)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <MessageCircle size={18} color="#0f172a" />
              <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem' }}>
                الدعم الفني – كفيل
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setView(v => v === 'inbox' ? 'compose' : 'inbox')}
                style={{
                  background: '#0f172a',
                  color: '#fef08a',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.3rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                {view === 'inbox' ? '+ رسالة جديدة' : '← صندوق الوارد'}
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#0f172a', display: 'flex', alignItems: 'center' }}
              >
                <ChevronDown size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>

            {/* COMPOSE VIEW */}
            {view === 'compose' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {sent ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--success, #10b981)' }}>
                    <CheckCheck size={36} style={{ marginBottom: '0.5rem', display: 'block', margin: '0 auto 0.5rem' }} />
                    <p style={{ fontWeight: 'bold', margin: 0 }}>تم إرسال رسالتك بنجاح!</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
                      سنرد عليك في أقرب وقت ممكن.
                    </p>
                  </div>
                ) : (
                  <>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      أرسل رسالتك لفريق الدعم الفني وسيتم الرد عليك مباشرة في الإشعارات.
                    </p>
                    <input
                      type="text"
                      placeholder="موضوع الرسالة..."
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '10px',
                        border: '1.5px solid var(--border-color, #334155)',
                        background: 'var(--bg-secondary, #0f172a)',
                        color: 'var(--text-primary, #f1f5f9)',
                        fontSize: '0.875rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <textarea
                      placeholder="اكتب رسالتك هنا..."
                      value={body}
                      onChange={e => setBody(e.target.value)}
                      rows={5}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '10px',
                        border: '1.5px solid var(--border-color, #334155)',
                        background: 'var(--bg-secondary, #0f172a)',
                        color: 'var(--text-primary, #f1f5f9)',
                        fontSize: '0.875rem',
                        resize: 'none',
                        outline: 'none',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!subject.trim() || !body.trim() || sending}
                      style={{
                        background: 'linear-gradient(135deg, #bf953f, #aa771c)',
                        color: '#0f172a',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '0.65rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        fontSize: '0.9rem',
                        opacity: (!subject.trim() || !body.trim() || sending) ? 0.6 : 1,
                      }}
                    >
                      {sending ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                      {sending ? 'جاري الإرسال...' : 'إرسال الرسالة'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* INBOX VIEW */}
            {view === 'inbox' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {loading && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                    <Loader size={24} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto' }} />
                  </div>
                )}
                {!loading && messages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                    <MessageCircle size={36} style={{ opacity: 0.3, display: 'block', margin: '0 auto 0.75rem' }} />
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>لا توجد رسائل سابقة.</p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem' }}>اضغط "+ رسالة جديدة" للتواصل معنا!</p>
                  </div>
                )}
                {messages.map(msg => {
                  const unread = (msg.replies || []).filter((r: SupportReply) => !r.read_by_user).length
                  return (
                    <div
                      key={msg.id}
                      onClick={() => { if (unread > 0) markRepliesRead(msg.id) }}
                      style={{
                        background: unread > 0 ? 'rgba(191,149,63,0.08)' : 'var(--bg-secondary, #0f172a)',
                        border: unread > 0 ? '1.5px solid rgba(191,149,63,0.4)' : '1px solid var(--border-color, #334155)',
                        borderRadius: '12px',
                        padding: '0.85rem',
                        cursor: unread > 0 ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {msg.subject}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {unread > 0 && (
                            <span style={{
                              background: 'linear-gradient(135deg, #bf953f, #aa771c)',
                              color: '#0f172a',
                              borderRadius: '10px',
                              padding: '0.15rem 0.5rem',
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                            }}>
                              {unread} رد جديد
                            </span>
                          )}
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                            {new Date(msg.created_at).toLocaleDateString('ar-LY')}
                          </span>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {msg.message.length > 80 ? msg.message.substring(0, 80) + '...' : msg.message}
                      </p>

                      {/* Show replies */}
                      {(msg.replies || []).length > 0 && (
                        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {(msg.replies as SupportReply[]).map(reply => (
                            <div
                              key={reply.id}
                              style={{
                                background: reply.read_by_user ? 'var(--surface)' : 'rgba(191,149,63,0.12)',
                                border: '1px solid rgba(191,149,63,0.25)',
                                borderRight: '3px solid #bf953f',
                                borderRadius: '8px',
                                padding: '0.6rem 0.75rem',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#bf953f' }}>
                                  ↩ رد فريق الدعم الفني
                                </span>
                                {!reply.read_by_user && (
                                  <span style={{ fontSize: '0.65rem', background: '#bf953f', color: '#0f172a', borderRadius: '6px', padding: '0.1rem 0.4rem', fontWeight: 'bold' }}>
                                    جديد
                                  </span>
                                )}
                              </div>
                              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                                {reply.reply_text}
                              </p>
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', display: 'block', marginTop: '0.25rem' }}>
                                {new Date(reply.created_at).toLocaleString('ar-LY')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '0.6rem 1.25rem',
            borderTop: '1px solid var(--border-color, #334155)',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
              🛡️ منظومة كفيل – الدعم الفني المباشر
            </span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes supportPulse {
          0%, 100% { box-shadow: 0 4px 16px rgba(170,119,28,0.35); }
          50% { box-shadow: 0 4px 24px rgba(170,119,28,0.7); }
        }
        @keyframes supportSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}

export default SupportWidget
