import { Gift } from 'lucide-react'

interface GiftWheelProps {
  spinning: boolean
  onSpin: () => void
  disabled?: boolean
}

function slicePath(index: number, total = 6, radius = 78) {
  const start = (index / total) * Math.PI * 2 - Math.PI / 2
  const end = ((index + 1) / total) * Math.PI * 2 - Math.PI / 2
  const x0 = 100 + radius * Math.cos(start)
  const y0 = 100 + radius * Math.sin(start)
  const x1 = 100 + radius * Math.cos(end)
  const y1 = 100 + radius * Math.sin(end)
  return `M 100 100 L ${x0.toFixed(3)} ${y0.toFixed(3)} A ${radius} ${radius} 0 0 1 ${x1.toFixed(3)} ${y1.toFixed(3)} Z`
}

const LIGHTS = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2 - Math.PI / 2
  const radius = 89.5
  return {
    cx: 100 + radius * Math.cos(angle),
    cy: 100 + radius * Math.sin(angle),
  }
})

export default function GiftWheel({ spinning, onSpin, disabled }: GiftWheelProps) {
  const locked = disabled || spinning

  return (
    <div className="relative w-full mb-5 overflow-hidden rounded-3xl border border-primary-200/70 bg-gradient-to-b from-[#fbf6eb] via-[#f7f0e2] to-[#f3ead8] px-4 py-6">
      <span className="gift-wheel-sparkle gift-wheel-sparkle-a" />
      <span className="gift-wheel-sparkle gift-wheel-sparkle-b" />
      <span className="gift-wheel-sparkle gift-wheel-sparkle-c" />
      <span className="gift-wheel-sparkle gift-wheel-sparkle-d" />
      <span className="gift-wheel-ribbon gift-wheel-ribbon-a" />
      <span className="gift-wheel-ribbon gift-wheel-ribbon-b" />

      <button
        type="button"
        onClick={onSpin}
        disabled={locked}
        aria-label="شروع کشف هدیه"
        className="relative mx-auto flex h-[276px] w-[260px] items-center justify-center disabled:opacity-80"
      >
        <svg
          viewBox="0 0 40 28"
          className="pointer-events-none absolute top-[6px] z-20 h-8 w-10 drop-shadow-[0_4px_6px_rgba(120,80,20,0.35)]"
        >
          <defs>
            <linearGradient id="gift-pointer-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f6e2a8" />
              <stop offset="45%" stopColor="#e0b94a" />
              <stop offset="100%" stopColor="#b8860b" />
            </linearGradient>
          </defs>
          <path
            d="M20 2 C26 2 31 8 31 14 C31 20 20 28 20 28 C20 28 9 20 9 14 C9 8 14 2 20 2 Z"
            fill="url(#gift-pointer-fill)"
            stroke="#c4962c"
            strokeWidth="1.2"
          />
          <path d="M16 8 C18 6 22 6 24 8" fill="none" stroke="#fff6d6" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        </svg>

        <div className={`gift-wheel-disk ${spinning ? 'gift-wheel-spin' : 'gift-wheel-idle'}`}>
          <svg viewBox="0 0 200 200" className="h-[236px] w-[236px] drop-shadow-[0_12px_24px_rgba(176,132,48,0.28)]">
            <defs>
              <radialGradient id="gift-wheel-gold-slice" cx="50%" cy="40%" r="70%">
                <stop offset="0%" stopColor="#f0d48a" />
                <stop offset="55%" stopColor="#d7b056" />
                <stop offset="100%" stopColor="#c4963c" />
              </radialGradient>
              <radialGradient id="gift-wheel-cream-slice" cx="50%" cy="40%" r="70%">
                <stop offset="0%" stopColor="#fffdf8" />
                <stop offset="70%" stopColor="#f6eedd" />
                <stop offset="100%" stopColor="#efe4cd" />
              </radialGradient>
              <linearGradient id="gift-wheel-rim" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f8e7b0" />
                <stop offset="35%" stopColor="#e2c36a" />
                <stop offset="70%" stopColor="#c9a227" />
                <stop offset="100%" stopColor="#8d6a18" />
              </linearGradient>
              <filter id="gift-wheel-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <circle cx="100" cy="100" r="96" fill="url(#gift-wheel-rim)" />
            <circle cx="100" cy="100" r="88.5" fill="#f3ead8" />

            {Array.from({ length: 6 }, (_, i) => (
              <path
                key={i}
                d={slicePath(i)}
                fill={i % 2 === 0 ? 'url(#gift-wheel-gold-slice)' : 'url(#gift-wheel-cream-slice)'}
              />
            ))}

            <circle cx="100" cy="100" r="88.5" fill="none" stroke="#e8c97a" strokeWidth="1.2" opacity="0.55" />
            <circle cx="100" cy="100" r="96" fill="none" stroke="url(#gift-wheel-rim)" strokeWidth="15" />
            <circle cx="100" cy="100" r="103.5" fill="none" stroke="#f6e7b4" strokeWidth="2.2" opacity="0.55" />
            <circle cx="100" cy="100" r="88" fill="none" stroke="#a67c1a" strokeWidth="1.4" opacity="0.35" />

            {LIGHTS.map((light, i) => (
              <g key={i} filter="url(#gift-wheel-glow)">
                <circle cx={light.cx} cy={light.cy} r="3.1" fill="#fff8dc" />
                <circle cx={light.cx} cy={light.cy} r="1.6" fill="#fff" />
              </g>
            ))}
          </svg>
        </div>

        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-b from-[#f6e2a8] via-[#e0b94a] to-[#b8860b] shadow-[0_6px_16px_rgba(140,96,20,0.35),inset_0_2px_4px_rgba(255,255,255,0.55)] ring-[6px] ring-[#d7b056]/80">
          <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-gradient-to-b from-[#c9a227] to-[#a67c1a] shadow-inner">
            <Gift size={22} className="text-white" strokeWidth={2.2} />
          </div>
        </div>
      </button>

      <p className="mt-1 text-center text-xs font-medium text-primary-700">
        {spinning ? 'گردونه در حال چرخش است...' : 'برای شروع کشف، گردونه را بچرخان'}
      </p>
    </div>
  )
}
