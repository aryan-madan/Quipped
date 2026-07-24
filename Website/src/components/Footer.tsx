import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub } from '@fortawesome/free-brands-svg-icons'

gsap.registerPlugin(ScrollTrigger)

const word = 'quipped'

export default function Footer() {
  const footer = useRef<HTMLElement>(null)
  const top = useRef<HTMLDivElement>(null)
  const wordmark = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      gsap.set(top.current, { opacity: 0, y: reduced ? 0 : 18 })
      gsap.to(top.current, {
        opacity: 1,
        y: 0,
        duration: reduced ? 0 : 0.7,
        ease: 'power2.out',
        force3D: true,
        scrollTrigger: {
          trigger: footer.current,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      })

      if (wordmark.current) {
        const letter = wordmark.current.querySelectorAll('span')
        gsap.set(letter, { opacity: 0, y: reduced ? 0 : 24 })
        gsap.to(letter, {
          opacity: 1,
          y: 0,
          duration: reduced ? 0 : 0.6,
          stagger: reduced ? 0 : 0.04,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: footer.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        })
      }
    }, footer)
    return () => ctx.revert()
  }, [])

  return (
    <footer ref={footer} className="overflow-hidden bg-[#0a0a0c] px-8 pt-20">
      <div ref={top} className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center">
        <img src="favicon.png" alt="Quipped" className="h-9 w-9" />
        <p className="text-sm text-white/40">© 2026 Quipped. All rights reserved.</p>
        <div className="mt-2 flex items-center gap-4 text-white/35">
          <a
            href="https://github.com/aryan-madan/Quipped"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-white/70"
          >
            <FontAwesomeIcon icon={faGithub} className="h-4 w-4" />
          </a>
          <a
            href="https://aryanmadan.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-white/40 transition-colors hover:text-white/80"
          >
            Made by Aryan Madan
          </a>
        </div>
      </div>

      <h2
        ref={wordmark}
        className="mt-16 text-center text-[16vw] leading-none font-black tracking-tighter text-white/10 select-none sm:text-[10vw]"
        style={{
          WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 100%)',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 100%)',
        }}
      >
        {word.split('').map((letter, index) => (
          <span key={index} className="inline-block">
            {letter}
          </span>
        ))}
      </h2>
    </footer>
  )
}