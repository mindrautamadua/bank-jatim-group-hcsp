'use client'

import { useRef, useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { askAssistant, type AskResult, type ChatTurn } from '@/app/(app)/assistant/actions'
import type { Answer, AnswerItem, Tone } from '@/lib/assistant'
import { Sparkles, Send, Loader2, ArrowUpRight, Info } from 'lucide-react'

const KODE_RE = /(PBI\.1\.[ab]\.\d|PBI\.1|PP\.\d|KS\.\d|F\.\d)/g
const toneText: Record<Tone, string> = { green: 'text-bbgreen', amber: 'text-bbamber', red: 'text-bbred', neutral: 'text-bbmuted' }
const toneDot: Record<Tone, string> = { green: 'var(--bb-green)', amber: 'var(--bb-amber)', red: 'var(--bb-red)', neutral: '#9aa8a3' }

interface Msg {
  role: 'user' | 'assistant'
  kind: 'text' | 'rule'
  text?: string
  answer?: Answer
  note?: string
  suggestions?: string[]
}

const GREETING: Msg = {
  role: 'assistant',
  kind: 'text',
  text: 'Halo. Saya Strategic Assistant untuk eksekusi Blueprint HCM 2026-2030. Saya menjawab dari data dan knowledge graph (tanpa mengarang). Silakan bertanya, atau pilih salah satu di bawah.',
  suggestions: [
    'Program apa yang paling berisiko?',
    'Apa dampak bila PP.6 terlambat?',
    'Area maturity mana yang gap-nya terbesar?',
    'Program apa yang paling fondasional?',
  ],
}

function linkifyKodes(text: string, base: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  KODE_RE.lastIndex = 0
  while ((m = KODE_RE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const kode = m[0]
    if (kode === 'PBI.1') out.push(<strong key={`${base}-${m.index}`} className="font-mono text-bbgreen-dark">{kode}</strong>)
    else out.push(<Link key={`${base}-${m.index}`} href={`/portfolio/${encodeURIComponent(kode)}`} className="font-mono font-semibold text-bbgreen hover:underline">{kode}</Link>)
    last = KODE_RE.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function renderInline(text: string, base: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((seg, i) =>
    seg.startsWith('**') && seg.endsWith('**')
      ? <strong key={`${base}-b${i}`} className="font-semibold text-bbink">{linkifyKodes(seg.slice(2, -2), `${base}-b${i}`)}</strong>
      : <span key={`${base}-s${i}`}>{linkifyKodes(seg, `${base}-s${i}`)}</span>
  )
}

function RichText({ text }: { text: string }) {
  const lines = text.split('\n')
  const out: ReactNode[] = []
  let bullets: string[] = []
  const flush = (k: number) => {
    if (bullets.length) {
      out.push(<ul key={`ul-${k}`} className="my-1.5 space-y-1 pl-1">{bullets.map((b, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed text-bbink"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-bbgreen" />{<span>{renderInline(b, `li-${k}-${i}`)}</span>}</li>
      ))}</ul>)
      bullets = []
    }
  }
  lines.forEach((line, i) => {
    const t = line.trim()
    if (/^[-*]\s+/.test(t)) bullets.push(t.replace(/^[-*]\s+/, ''))
    else { flush(i); if (t) out.push(<p key={`p-${i}`} className="text-sm leading-relaxed text-bbink">{renderInline(t, `p-${i}`)}</p>) }
  })
  flush(lines.length)
  return <div className="space-y-1.5">{out}</div>
}

function ItemRow({ it }: { it: AnswerItem }) {
  const body = (
    <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-bbgreen-light/40">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: toneDot[it.tone ?? 'neutral'] }} />
      {it.kode && <span className="font-mono text-[11px] font-bold text-bbgreen-dark">{it.kode}</span>}
      <span className="min-w-0 flex-1 truncate text-sm text-bbink" title={it.primary}>{it.primary}</span>
      {it.secondary && <span className="hidden shrink-0 text-[11px] text-bbmuted sm:inline">{it.secondary}</span>}
      {it.badge && <span className={`shrink-0 font-display text-xs font-bold tabular-nums ${toneText[it.tone ?? 'neutral']}`}>{it.badge}</span>}
      {it.href && <ArrowUpRight size={13} className="shrink-0 text-bbgreen opacity-60" />}
    </div>
  )
  return it.href ? <Link href={it.href} className="bb-press block">{body}</Link> : body
}

function RuleAnswer({ answer, note }: { answer: Answer; note?: string }) {
  return (
    <div>
      {note && <div className="mb-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700"><Info size={13} className="mt-0.5 shrink-0" />{note}</div>}
      <p className="mb-1.5 font-display text-sm font-semibold text-bbink">{answer.title}</p>
      <div className="space-y-2">
        {answer.blocks.map((b, i) =>
          b.kind === 'text'
            ? <p key={i} className="text-sm leading-relaxed text-bbmuted">{linkifyKodes(b.text, `rt-${i}`)}</p>
            : <div key={i}>
                {b.title && <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-bbmuted">{b.title}</div>}
                <div className="space-y-0.5">{b.items.map((it, j) => <ItemRow key={j} it={it} />)}</div>
              </div>
        )}
      </div>
    </div>
  )
}

export default function AssistantChat() {
  const [messages, setMessages] = useState<Msg[]>([GREETING])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [messages, pending])

  function autoGrow() {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }

  async function send(q: string) {
    const question = q.trim()
    if (!question || pending) return
    setInput('')
    if (taRef.current) taRef.current.style.height = 'auto'
    const history: ChatTurn[] = messages
      .filter((m) => m.kind !== 'rule' || m.answer)
      .map((m) => ({ role: m.role, content: m.role === 'user' ? (m.text ?? '') : m.text ?? m.answer?.title ?? '' }))
      .filter((h) => h.content)
    setMessages((prev) => [...prev, { role: 'user', kind: 'text', text: question }])
    setPending(true)
    try {
      const res: AskResult = await askAssistant(question, history)
      const msg: Msg = res.mode === 'llm'
        ? { role: 'assistant', kind: 'text', text: res.text, suggestions: res.suggestions }
        : { role: 'assistant', kind: 'rule', answer: res.answer, note: res.note, suggestions: res.answer.suggestions }
      setMessages((prev) => [...prev, msg])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', kind: 'text', text: 'Maaf, terjadi kendala memproses pertanyaan. Silakan coba lagi.' }])
    } finally {
      setPending(false)
    }
  }

  const lastSuggest = [...messages].reverse().find((m) => m.role === 'assistant')?.suggestions ?? []

  return (
    <div className="bb-card flex h-[calc(100svh-13rem)] max-h-[calc(100dvh-9rem)] min-h-[60svh] flex-col overflow-hidden p-0 sm:min-h-[460px]">
      <div ref={scrollRef} role="log" aria-live="polite" aria-relevant="additions" className="flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-6">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'assistant' && (
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-bbgreen-light text-bbgreen"><Sparkles size={16} /></span>
            )}
            <div className={m.role === 'user'
              ? 'max-w-[85%] rounded-2xl rounded-tr-sm bg-bbgreen px-3.5 py-2.5 text-sm text-white'
              : 'max-w-[88%] rounded-2xl rounded-tl-sm border border-bbborder bg-white px-3.5 py-3'}>
              {m.role === 'user'
                ? m.text
                : m.kind === 'rule' && m.answer
                  ? <RuleAnswer answer={m.answer} note={m.note} />
                  : <RichText text={m.text ?? ''} />}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex gap-3">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-bbgreen-light text-bbgreen"><Sparkles size={16} /></span>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-bbborder bg-white px-4 py-3 text-sm text-bbmuted">
              <Loader2 size={15} className="animate-spin" /> Menelusuri data & knowledge graph...
            </div>
          </div>
        )}
      </div>

      {lastSuggest.length > 0 && !pending && (
        <div className="flex flex-wrap gap-2 border-t border-bbborder px-4 py-2.5 md:px-6">
          {lastSuggest.map((s) => (
            <button key={s} onClick={() => send(s)} className="bb-press rounded-full border border-bbborder bg-white px-3 py-1.5 text-xs font-medium text-bbmuted transition-colors hover:border-bbgreen hover:text-bbgreen-dark">
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); send(input) }}
        className="flex items-end gap-2 border-t border-bbborder px-4 py-3 md:px-6"
      >
        <textarea
          ref={taRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); autoGrow() }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
          rows={1}
          aria-label="Tanya asisten"
          placeholder="Tanya tentang program, risiko, dependensi, kematangan… (Enter kirim, Shift+Enter baris baru)"
          className="max-h-40 flex-1 resize-none rounded-lg border border-bbborder bg-white px-3.5 py-2.5 text-sm text-bbink outline-none transition-colors placeholder:text-bbfaint focus:border-bbgreen focus:ring-2 focus:ring-bbgreen/20"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="bb-press grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-bbgreen text-white transition-colors hover:bg-bbgreen-dark disabled:opacity-50"
          aria-label="Kirim"
        >
          <Send size={17} />
        </button>
      </form>
    </div>
  )
}
