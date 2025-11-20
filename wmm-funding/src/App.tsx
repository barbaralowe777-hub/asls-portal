import { Link, Outlet, useLocation } from 'react-router-dom'

export default function App() {
  const { pathname } = useLocation()
  return (
    <div>
      <header className="wm-header">
        <div className="wm-brand">
          <img
            src="/wmm-logo.png"
            alt="World Machine Money"
            width={40}
            height={40}
            style={{ display: 'block', borderRadius: 6 }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.svg' }}
          />
          <span>World Machine Money</span>
        </div>
        <nav className="wm-nav">
          <Link to="/" className={pathname === '/' ? 'active' : ''}>Eligibility</Link>
          <Link to="/apply" className={pathname.startsWith('/apply') ? 'active' : ''}>Apply</Link>
        </nav>
      </header>
      <main className="wm-container">
        <Outlet />
      </main>
      <footer className="wm-footer">
        © {new Date().getFullYear()} World Machine Money
      </footer>
    </div>
  )
}
