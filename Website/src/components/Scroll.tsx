import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'

declare global {
  interface Window {
    lenis?: Lenis
  }
}

export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 0.6,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
    })

    window.lenis = lenis

    lenis.on('scroll', () => gsap.ticker.tick())

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)

    let timer: ReturnType<typeof setTimeout>
    let locking = false

    function snap() {
      const item = Array.from(document.querySelectorAll<HTMLElement>('.snap-section'))
      if (!item.length) return
      let closest: HTMLElement | null = null
      let min = Infinity
      item.forEach((element) => {
        const distance = Math.abs(element.getBoundingClientRect().top)
        if (distance < min) {
          min = distance
          closest = element
        }
      })
      if (closest && min > 4 && min < window.innerHeight * 0.55) {
        locking = true
        lenis.scrollTo(closest, {
          duration: 0.9,
          easing: (t: number) => 1 - Math.pow(1 - t, 3),
          onComplete: () => {
            locking = false
          },
        })
      }
    }

    function onScroll() {
      if (locking) return
      clearTimeout(timer)
      timer = setTimeout(snap, 140)
    }

    lenis.on('scroll', onScroll)

    return () => {
      clearTimeout(timer)
      lenis.destroy()
      window.lenis = undefined
    }
  }, [])

  return null
}