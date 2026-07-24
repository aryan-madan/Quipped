import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const slides = [
  {
    gif: '/gifs/create.gif',
    heading: 'quips',
    points: [
      'Create your own text shortcuts using a ! prefix',
      'Works for emails, addresses, signatures, and templates',
      'Type less and say more',
    ],
    side: 'left',
  },
  {
    gif: '/gifs/emoji.gif',
    heading: 'global emoji bar',
    points: [
      'Quickly search and insert emojis from anywhere on the web',
      'No need to leave your keyboard',
      'Works across every site you use',
    ],
    side: 'right',
  },
]

export default function Slides() {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const item = gsap.utils.toArray<HTMLElement>('.slide')
      item.forEach((element) => {
        const text = element.querySelector('.text')
        const frame = element.querySelector('.frame')
        gsap.set([text, frame], { opacity: 0, y: reduced ? 0 : 30 })
        gsap.to([text, frame], {
          opacity: 1,
          y: 0,
          duration: reduced ? 0 : 0.8,
          stagger: reduced ? 0 : 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: element,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
        })
      })
    }, container)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={container} className="bg-[#0a0a0c]">
      {slides.map((slide, index) => (
        <section key={slide.heading} className="slide snap-section flex h-screen items-center px-8">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-14 md:grid-cols-2">
            <div className={`text flex flex-col gap-5 items-start text-left ${slide.side === 'right' ? 'md:order-2' : ''}`}>
              <div className="flex items-center gap-1.5">
                {slides.map((dot, position) => (
                  <span
                    key={dot.heading}
                    className={`h-1.5 rounded-full transition-all ${position === index ? 'w-6 bg-white/60' : 'w-1.5 bg-white/15'}`}
                  />
                ))}
              </div>
              <h3 className="text-3xl font-black tracking-tight text-white/90 sm:text-4xl">{slide.heading}</h3>
              <ul className="flex flex-col gap-3">
                {slide.points.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-[15px] leading-relaxed text-white/50">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className={`frame overflow-hidden rounded-2xl border border-white/10 bg-[#17171a] shadow-[0_20px_60px_rgba(0,0,0,0.5)] ${slide.side === 'right' ? 'md:order-1' : ''}`}>
              <div className="flex items-center justify-center border-b border-white/5 px-4 py-2.5">
                <span className="text-[12px] font-medium text-white/35">Preview</span>
              </div>
              <img src={slide.gif} alt={slide.heading} className="block h-auto w-full" />
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}