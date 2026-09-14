import { NavLink } from 'react-router-dom'
import { Home, Compass, Users, User } from 'lucide-react'

const navItems = [
  { to: '/', icon: Home, label: 'خانه' },
  { to: '/discover', icon: Compass, label: 'کشف' },
  { to: '/people', icon: Users, label: 'نزدیکان' },
  { to: '/profile', icon: User, label: 'پروفایل' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-900 border-t border-neutral-700 pb-safe">
      <div className="max-w-md mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                isActive ? 'text-primary-400' : 'text-neutral-500 hover:text-neutral-300'
              }`
            }
          >
            <Icon size={22} />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
