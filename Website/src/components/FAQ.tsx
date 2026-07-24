import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const items = [
  { q: 'what is quipped?', a: 'quipped is a lightweight text expansion and emoji extension that blends into every site you use.' },
  { q: 'is my data private?', a: 'everything runs locally in your browser. your quips never leave your machine.' },
  {
    q: 'is quipped watching my screen all the time?',
    a: 'no. quipped only reads the text field you are typing in, and only expands when your trigger matches.',
  },
  { q: 'what can quipped actually do?', a: 'expand short triggers into full text, and search or insert emojis anywhere on the web.' },
  { q: 'which sites does it work with?', a: 'any site you can type on, including gmail, docs, notion, and slack.' },
  { q: 'do i need chrome?', a: 'quipped works on chrome and firefox.' },
  { q: 'is it free?', a: 'yes, 100% free and open source.' },
  { q: 'can i style it to match my site?', a: 'quipped adapts its border radius, font, spacing, and colors to match whatever site you are on.' },
]

export default function FAQ() {
  const [open, setOpen] = useState(2)
  const container = useRef<HTMLDivElement>(null)
  const answer = useRef<Record<number, HTMLDivElement | null>>({})

  useEffect(() => {
    const ctx = gsap.context(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const heading = container.current?.querySelector('.heading')
      gsap.set(heading, { opacity: 0, y: reduced ? 0 : 18 })
      gsap.to(heading, {
        opacity: 1,
        y: 0,
        duration: reduced ? 0 : 0.7,
        ease: 'power2.out',
        scrollTrigger: { trigger: container.current, start: 'top 80%', toggleActions: 'play none none reverse' },
      })

      const item = gsap.utils.toArray<HTMLElement>('.faq-item')
      item.forEach((element, index) => {
        gsap.set(element, { opacity: 0, y: reduced ? 0 : 22 })
        gsap.to(element, {
          opacity: 1,
          y: 0,
          duration: reduced ? 0 : 0.6,
          delay: reduced ? 0 : index * 0.05,
          ease: 'power3.out',
          scrollTrigger: { trigger: element, start: 'top 88%', toggleActions: 'play none none reverse' },
        })
      })
    }, container)
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    items.forEach((_, index) => {
      const element = answer.current[index]
      if (!element) return
      if (index === open) {
        gsap.set(element, { height: 'auto', opacity: 1 })
        const full = element.offsetHeight
        gsap.fromTo(element, { height: 0, opacity: 0 }, { height: full, opacity: 1, duration: 0.35, ease: 'power2.out' })
      } else {
        gsap.to(element, { height: 0, opacity: 0, duration: 0.25, ease: 'power2.in' })
      }
    })
  }, [open])

  return (
    <section ref={container} className="relative overflow-hidden bg-[#0a0a0c] px-8 py-24">
      <div className="pointer-events-none absolute top-40 right-24 hidden w-52 rotate-3 overflow-hidden rounded-xl border border-white/10 bg-[#17171a] p-2 shadow-[0_18px_40px_rgba(0,0,0,0.5)] lg:block">
        <img src="/gifs/emoji.gif" alt="Quipped" className="rounded-lg" />
      </div>

      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        <h2 className="heading mb-6 text-3xl font-black tracking-tight text-white/90">frequently asked</h2>
        {items.map((item, index) => {
          const active = open === index
          return (
            <div
              key={item.q}
              className={`faq-item overflow-hidden rounded-2xl border bg-[#141416] transition-colors ${active ? 'border-white/20' : 'border-white/8'}`}
            >
              <button
                onClick={() => setOpen(active ? -1 : index)}
                className="flex w-full items-center justify-between px-6 py-5 text-left"
              >
                <span className="text-[17px] font-semibold text-white/85">{item.q}</span>
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-base text-white/50 transition-transform duration-300"
                  style={{ transform: active ? 'rotate(45deg)' : 'rotate(0deg)' }}
                >
                  +
                </span>
              </button>
              <div
                ref={(element) => {
                  answer.current[index] = element
                }}
                style={{ height: 0, opacity: 0, overflow: 'hidden' }}
              >
                <p className="px-6 pb-5 text-[14px] leading-relaxed text-white/50">{item.a}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}