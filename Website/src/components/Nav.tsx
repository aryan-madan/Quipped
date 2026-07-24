import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub } from '@fortawesome/free-brands-svg-icons'

const link = 'https://github.com/aryan-madan/Quipped/releases/tag/v0.2.0'

export default function Nav() {
  const top = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between border-b border-white/5 bg-[#0a0a0c]/70 px-8 py-4 backdrop-blur-md">
      <button onClick={top} className="cursor-pointer text-sm font-bold text-white/85 transition-colors hover:text-white">
        quipped
      </button>
      <div className="flex items-center gap-3">
        <a
          href="https://github.com/aryan-madan/Quipped"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/35 transition-colors hover:text-white/70"
        >
          <FontAwesomeIcon icon={faGithub} className="h-4 w-4" />
        </a>
        <a href={link} target="_blank" rel="noopener noreferrer" className="pill-btn rounded-full px-4 py-1.5 text-[13px] font-semibold text-black/80">
          get quipped
        </a>
      </div>
    </div>
  )
}