import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

const lines = [
  "Hi there, I'm Quippy!",
  'poke me again, I dare you',
  'type ! anywhere to see me work',
  'I live in your browser now',
  'no cap, I save you hours',
]

const link = 'https://github.com/aryan-madan/Quipped/releases/tag/v0.2.0'

const icons = [
  { emoji: '🔥', top: 110, left: 80, right: null },
  { emoji: '📌', top: 70, left: null, right: 100 },
  { emoji: '✨', top: 190, left: 200, right: null },
  { emoji: '💬', top: 150, left: null, right: 240 },
  { emoji: '🚀', top: 260, left: 40, right: null },
  { emoji: '🎯', top: 230, left: null, right: 40 },
  { emoji: '🧠', top: 320, left: 300, right: null },
  { emoji: '⚡', top: 290, left: null, right: 320 },
]

export default function Hero() {
  const section = useRef<HTMLElement>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const text = useRef<HTMLParagraphElement>(null)
  const logo = useRef<HTMLButtonElement>(null)
  const mark = useRef<HTMLHeadingElement>(null)
  const sub = useRef<HTMLParagraphElement>(null)
  const actions = useRef<HTMLDivElement>(null)
  const meta = useRef<HTMLParagraphElement>(null)
  const preview = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState(false)
  const [line, setLine] = useState(0)
  const used = useRef<number[]>([])

  const next = () => {
    if (used.current.length === lines.length) used.current = []
    const pool = lines.map((_, index) => index).filter((index) => !used.current.includes(index))
    const pick = pool[Math.floor(Math.random() * pool.length)]
    used.current.push(pick)
    setLine(pick)
  }

  useEffect(() => {
    if (!bubble.current) return
    gsap.killTweensOf(bubble.current)
    if (hover) {
      next()
      gsap.fromTo(
        bubble.current,
        { opacity: 0, y: 14, scale: 0.92 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.6)' }
      )
    } else {
      gsap.to(bubble.current, { opacity: 0, y: 8, scale: 0.94, duration: 0.22, ease: 'power2.in' })
    }
  }, [hover])

  useEffect(() => {
    if (!hover || !text.current) return
    const word = text.current.querySelectorAll('span')
    gsap.set(word, { opacity: 0, y: 6 })
    gsap.to(word, { opacity: 1, y: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out' })
  }, [line, hover])

  useEffect(() => {
    const ctx = gsap.context(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const group = [logo.current, mark.current, sub.current, actions.current, meta.current]
      gsap.set(group, { opacity: 0, y: reduced ? 0 : 20 })
      gsap.to(group, {
        opacity: 1,
        y: 0,
        duration: reduced ? 0 : 0.8,
        stagger: reduced ? 0 : 0.1,
        ease: 'power3.out',
        clearProps: 'transform',
      })

      gsap.set(preview.current, { opacity: 0, y: reduced ? 0 : 26 })
      gsap.to(preview.current, { opacity: 1, y: 0, duration: reduced ? 0 : 0.9, delay: reduced ? 0 : 0.4, ease: 'power3.out' })

      const item = gsap.utils.toArray<HTMLElement>('.pop')
      item.forEach((element, index) => {
        gsap.set(element, { opacity: 0, scale: 0.3 })
        gsap.to(element, {
          opacity: 1,
          scale: 1,
          duration: reduced ? 0 : 0.5,
          delay: reduced ? 0 : 0.3 + index * 0.08,
          ease: 'back.out(2.4)',
        })
      })
    }, section)
    return () => ctx.revert()
  }, [])

  return (
    <section id="top" ref={section} className="relative min-h-screen overflow-hidden bg-[#0a0a0c]">
      <style>{`
        .pill-btn {
          background: linear-gradient(180deg, #fcfcfc 0%, #e4e4e4 100%);
          border: 0.5px solid rgba(0, 0, 0, 0.12);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            inset 0 -1px 0 rgba(0, 0, 0, 0.05),
            0 1px 0 rgba(255, 255, 255, 0.4),
            0 3px 0 rgba(150, 150, 150, 0.55),
            0 3px 1px rgba(150, 150, 150, 0.55),
            0 6px 12px rgba(0, 0, 0, 0.5);
          transition: box-shadow 0.08s, transform 0.08s cubic-bezier(0.2, 0.9, 0.3, 1), background 0.12s;
        }
        .pill-btn:hover { background: linear-gradient(180deg, #ffffff 0%, #eaeaea 100%); }
        .pill-btn:active {
          transform: translateY(3px);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            inset 0 -1px 0 rgba(0, 0, 0, 0.05),
            0 2px 6px rgba(0, 0, 0, 0.4);
        }
        .ghost-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 0.5px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          transition: background 0.12s, border-color 0.12s;
        }
        .ghost-btn:hover { background: rgba(255, 255, 255, 0.09); border-color: rgba(255, 255, 255, 0.2); }
      `}</style>

      <div className="pointer-events-none fixed top-0 right-0 left-0 z-30 h-32 bg-gradient-to-b from-[#0a0a0c] to-transparent" />
      <div className="pointer-events-none fixed right-0 bottom-0 left-0 z-30 h-32 bg-gradient-to-t from-[#0a0a0c] to-transparent" />

      <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 hidden h-[420px] lg:block">
        {icons.map((item) => (
          <span
            key={item.emoji}
            className="pop absolute text-4xl"
            style={{
              top: item.top ?? undefined,
              left: item.left ?? undefined,
              right: item.right ?? undefined,
            }}
          >
            {item.emoji}
          </span>
        ))}
      </div>

      <div className="relative z-20 flex flex-col items-center gap-6 px-6 pt-24 pb-24 text-center">
        <div className="relative flex flex-col items-center" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
          <div
            ref={bubble}
            style={{ opacity: 0 }}
            className="pointer-events-none absolute -top-10 left-1/2 z-10 w-64 -translate-x-1/2 -translate-y-full rounded-2xl border border-white/10 bg-[#17171a] px-4 py-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_28px_rgba(0,0,0,0.5)]"
          >
            <p ref={text} className="text-[13px] leading-snug text-white/75">
              {lines[line].split(' ').map((word, index) => (
                <span key={index} className="mr-1 inline-block">
                  {word}
                </span>
              ))}
            </p>
            <div className="absolute top-full left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-b border-white/10 bg-[#17171a]" />
          </div>

          <button ref={logo} className="cursor-pointer select-none">
            <img src="logo.svg" alt="Quipped" draggable={false} className="h-20 w-20 transition-transform hover:scale-110" />
          </button>
        </div>

        <h1 ref={mark} className="text-6xl font-black tracking-tighter text-white/95 sm:text-8xl">
          quipped
        </h1>

        <p ref={sub} className="max-w-md text-[16px] leading-relaxed text-white/45">
          a lightweight text expander that lives in your browser
        </p>

        <div ref={actions} className="mt-2 flex items-center gap-3">
          <a href={link} target="_blank" rel="noopener noreferrer" className="pill-btn rounded-xl px-6 py-3 text-sm font-semibold text-black/80">
            download for chrome
          </a>
          <a href={link} target="_blank" rel="noopener noreferrer" className="ghost-btn rounded-xl px-6 py-3 text-sm font-semibold text-white/75">
            get on firefox
          </a>
        </div>
        <p ref={meta} className="text-[11.5px] tracking-tight text-white/30">
          100% free · open source
        </p>

        <div ref={preview} className="mt-6 w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#17171a] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex aspect-video items-center justify-center bg-black/40">
            <span className="flex items-center gap-2 rounded-full bg-black/50 px-5 py-2.5 text-[13px] font-semibold text-white/85 backdrop-blur-sm">
              ▶ play demo
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}