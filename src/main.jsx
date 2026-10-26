import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight, Bell, Bookmark, BookOpen, Check, ChevronDown, CircleUserRound,
  Clock3, Filter, Heart, ImagePlus, Laptop, LogOut, MapPin, Menu, MessageSquare,
  PackageOpen, Plus, Search, Send, ShieldCheck, SlidersHorizontal, Sparkles,
  Tag, X, Zap
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './styles.css'

const seedListings = [
  { id: 1, title: 'Engineering Mathematics — 4th ed.', category: 'Books', price: 420, condition: 'Good', type: 'Sale', seller: 'Aarav Menon', initials: 'AM', campus: 'North Campus', posted: '2h ago', image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80', accent: 'paper', description: 'Clean copy with light highlighting in two chapters. Great for first-year engineering.' },
  { id: 2, title: 'Casio fx-991EX ClassWiz', category: 'Electronics', price: 850, condition: 'Like new', type: 'Sale', seller: 'Nisha Kapoor', initials: 'NK', campus: 'North Campus', posted: '5h ago', image: 'https://images.unsplash.com/photo-1616627983827-4e16b16f90a5?auto=format&fit=crop&w=800&q=80', accent: 'blue', description: 'Barely used scientific calculator. Includes original case and fresh battery.' },
  { id: 3, title: 'IKEA desk lamp + organizer', category: 'Room essentials', price: 650, condition: 'Good', type: 'Exchange', seller: 'Kabir Shah', initials: 'KS', campus: 'East Residence', posted: '1d ago', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80', accent: 'amber', description: 'Moving out sale. Looking to exchange for a compact study chair or sell together.' },
  { id: 4, title: 'Lab coat / white coat — M', category: 'Academic supplies', price: 300, condition: 'Like new', type: 'Sale', seller: 'Meera Iyer', initials: 'MI', campus: 'North Campus', posted: '1d ago', image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80', accent: 'mint', description: 'Worn twice, freshly laundered and ready for practicals. Unisex medium.' },
  { id: 5, title: 'Yonex badminton racket', category: 'Sports & hobbies', price: 1200, condition: 'Good', type: 'Sale', seller: 'Rohan Das', initials: 'RD', campus: 'South Campus', posted: '2d ago', image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80', accent: 'orange', description: 'Well maintained racket with a fresh grip. Selling because I switched clubs.' },
  { id: 6, title: 'Mechanical keyboard — 65%', category: 'Electronics', price: 2100, condition: 'Like new', type: 'Exchange', seller: 'Devika Rao', initials: 'DR', campus: 'East Residence', posted: '2d ago', image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80', accent: 'violet', description: 'Hot-swap board with tactile switches. Open to exchanging for a low-profile board.' }
]

const categories = ['All items', 'Books', 'Electronics', 'Room essentials', 'Academic supplies', 'Sports & hobbies']

function AuthGate() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const loadSession = async () => {
      if (isSupabaseConfigured) {
        const { data } = await supabase.auth.getSession()
        if (active) setUser(data.session?.user ?? null)
      } else {
        const demoUser = sessionStorage.getItem('campus-exchange-demo-user')
        if (active && demoUser) setUser({ email: demoUser })
      }
      if (active) setLoading(false)
    }
    loadSession()

    if (!isSupabaseConfigured) return () => { active = false }
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null)
    })
    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  if (loading) return <div className="auth-loading">Loading your campus account...</div>
  return user
    ? <App user={user} onSignOut={() => { setUser(null); sessionStorage.removeItem('campus-exchange-demo-user') }} />
    : <LoginPage onAuthenticated={setUser} />
}

function LoginPage({ onAuthenticated }) {
  const [mode, setMode] = useState('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setPending(true)
    setError('')
    setNotice('')
    try {
      if (!isSupabaseConfigured) {
        if (password.length < 6) throw new Error('Use a password with at least 6 characters.')
        sessionStorage.setItem('campus-exchange-demo-user', email.trim().toLowerCase())
        onAuthenticated({ email: email.trim().toLowerCase() })
        return
      }
      const result = mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
      if (result.error) throw result.error
      if (mode === 'sign-up' && !result.data.session) {
        setNotice('Account created. Check your email to confirm it, then sign in.')
      } else {
        onAuthenticated(result.data.user)
      }
    } catch (authError) {
      setError(authError.message || 'We could not authenticate you. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return <div className="auth-page">
    <div className="auth-panel">
      <div className="auth-brand"><span className="brand-mark">CX</span><span>Campus<span className="brand-accent">Exchange</span></span></div>
      <div className="eyebrow"><span className="status-light" /> CAMPUS NETWORK / SECURE ACCESS</div>
      <h1>{mode === 'sign-in' ? 'Welcome back.' : 'Join the exchange.'}</h1>
      <p className="auth-intro">{mode === 'sign-in' ? 'Sign in to keep your campus marketplace close.' : 'Create your account and start trading with fellow students.'}</p>
      <form className="auth-form" onSubmit={submit}>
        <label>Email address<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@campus.edu" required autoComplete="email" /></label>
        <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 6 characters" required minLength="6" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} /></label>
        {error && <p className="auth-message auth-error" role="alert">{error}</p>}
        {notice && <p className="auth-message auth-notice" role="status">{notice}</p>}
        <button className="primary-btn auth-submit" type="submit" disabled={pending}>{pending ? 'Connecting...' : mode === 'sign-in' ? 'Sign in' : 'Create account'} <ArrowUpRight size={16}/></button>
      </form>
      <button className="auth-switch" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(''); setNotice('') }}>
        {mode === 'sign-in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
      </button>
      {!isSupabaseConfigured && <p className="auth-demo-note">Demo mode is active. Add Supabase credentials to enable production authentication.</p>}
    </div>
  </div>
}

function App({ user, onSignOut }) {
  const [listings, setListings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('campus-exchange-listings')) || seedListings } catch { return seedListings }
  })
  const [saved, setSaved] = useState(() => JSON.parse(localStorage.getItem('campus-exchange-saved') || '[]'))
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All items')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [condition, setCondition] = useState('All conditions')
  const [listingType, setListingType] = useState('All types')
  const [activeView, setActiveView] = useState('discover')
  const [selected, setSelected] = useState(null)
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => localStorage.setItem('campus-exchange-listings', JSON.stringify(listings)), [listings])
  useEffect(() => localStorage.setItem('campus-exchange-saved', JSON.stringify(saved)), [saved])
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 2800); return () => clearTimeout(t) } }, [toast])

  const visibleListings = useMemo(() => listings.filter(item => {
    const textMatch = `${item.title} ${item.category} ${item.seller}`.toLowerCase().includes(query.toLowerCase())
    return textMatch && (category === 'All items' || item.category === category) &&
      (condition === 'All conditions' || item.condition === condition) &&
      (listingType === 'All types' || item.type === listingType) &&
      (activeView !== 'saved' || saved.includes(item.id))
  }), [listings, query, category, condition, listingType, activeView, saved])

  const toggleSaved = (id) => {
    setSaved(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
    setToast(saved.includes(id) ? 'Removed from your saved items' : 'Saved to your shortlist')
  }
  const createListing = (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const listing = { id: Date.now(), title: form.get('title'), category: form.get('category'), price: Number(form.get('price')), condition: form.get('condition'), type: form.get('type'), seller: 'You', initials: 'YO', campus: 'North Campus', posted: 'just now', image: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=800&q=80', accent: 'paper', description: form.get('description') || 'A new listing from your campus.' }
    setListings(current => [listing, ...current]); setModal(null); setActiveView('discover'); setToast('Listing published — nice work!')
  }

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => { setActiveView('discover'); setCategory('All items') }}><span className="brand-mark">CX</span><span>Campus<span className="brand-accent">Exchange</span></span></button>
      <nav className="desktop-nav">
        <button className={activeView === 'discover' ? 'nav-active' : ''} onClick={() => setActiveView('discover')}>Discover</button>
        <button className={activeView === 'saved' ? 'nav-active' : ''} onClick={() => setActiveView('saved')}>Saved <span className="nav-count">{saved.length}</span></button>
        <button onClick={() => setModal('messages')}>Messages <span className="nav-dot" /></button>
      </nav>
      <div className="top-actions">
        <button className="icon-btn notification" aria-label="Notifications"><Bell size={18}/><span /></button>
        <button className="profile-chip" onClick={() => setModal('profile')}><span className="avatar avatar-small">{getInitials(user?.email)}</span><span className="profile-name">{user?.email || 'Your account'}</span><ChevronDown size={14}/></button>
        <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu"><Menu size={21}/></button>
      </div>
    </header>
    {menuOpen && <div className="mobile-nav"><button onClick={() => { setActiveView('discover'); setMenuOpen(false) }}>Discover</button><button onClick={() => { setActiveView('saved'); setMenuOpen(false) }}>Saved ({saved.length})</button><button onClick={() => setModal('messages')}>Messages</button></div>}

    <main>
      <section className="hero">
        <div><div className="eyebrow"><span className="status-light" /> LIVE NETWORK / NORTH CAMPUS</div><h1>Find useful things.<br/><em>Keep them moving.</em></h1><p>A trusted marketplace for your campus community. Buy, sell, and exchange what you need — nearby.</p></div>
        <div className="hero-stats"><div><strong>{listings.length * 38}+</strong><span>ACTIVE LISTINGS</span></div><div><strong>1.2k</strong><span>STUDENTS HERE</span></div><div><strong>4.9</strong><span>TRUST SCORE</span></div></div>
      </section>

      <section className="workspace">
        <aside className="sidebar">
          <div className="section-kicker">01 / EXPLORE</div>
          <div className="category-list">{categories.map((item, index) => <button key={item} className={category === item && activeView !== 'saved' ? 'category-active' : ''} onClick={() => { setCategory(item); setActiveView('discover') }}><span className="category-icon">{index === 0 ? <Sparkles size={15}/> : index === 1 ? <BookOpen size={15}/> : index === 2 ? <Laptop size={15}/> : index === 3 ? <PackageOpen size={15}/> : index === 4 ? <Tag size={15}/> : <Zap size={15}/>}</span>{item}<span className="category-arrow">↗</span></button>)}</div>
          <div className="sidebar-note"><ShieldCheck size={17}/><div><strong>Campus verified</strong><span>Everyone here has a .edu account.</span></div></div>
        </aside>
        <div className="catalog">
          <div className="catalog-head"><div><div className="section-kicker">02 / {activeView === 'saved' ? 'YOUR SHORTLIST' : 'THE EXCHANGE'}</div><h2>{activeView === 'saved' ? 'Saved for later' : category === 'All items' ? 'Fresh on campus' : category}</h2></div><button className="primary-btn" onClick={() => setModal('create')}><Plus size={17}/> List an item</button></div>
          <div className="control-bar"><div className="search-box"><Search size={18}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search books, calculators, furniture..." /><kbd>⌘ K</kbd></div><button className={`filter-btn ${filtersOpen ? 'filter-active' : ''}`} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={16}/> Filters <span className="filter-count">{[condition !== 'All conditions', listingType !== 'All types'].filter(Boolean).length || ''}</span></button></div>
          {filtersOpen && <div className="filters-panel"><label>Condition<select value={condition} onChange={event => setCondition(event.target.value)}><option>All conditions</option><option>Like new</option><option>Good</option></select></label><label>Listing type<select value={listingType} onChange={event => setListingType(event.target.value)}><option>All types</option><option>Sale</option><option>Exchange</option></select></label><button onClick={() => { setCondition('All conditions'); setListingType('All types') }}>Reset</button></div>}
          <div className="result-row"><span>{visibleListings.length} ITEMS IN YOUR AREA</span><button>Recently added <ChevronDown size={13}/></button></div>
          {visibleListings.length ? <div className="listing-grid">{visibleListings.map(item => <article className="listing-card" key={item.id} onClick={() => setSelected(item)}><div className={`listing-image ${item.accent}`}><img src={item.image} alt="" /><span className="type-tag">{item.type === 'Exchange' ? '↔ EXCHANGE' : '● FOR SALE'}</span><button className={`save-btn ${saved.includes(item.id) ? 'is-saved' : ''}`} onClick={event => { event.stopPropagation(); toggleSaved(item.id) }} aria-label="Save listing"><Heart size={17} fill={saved.includes(item.id) ? 'currentColor' : 'none'}/></button></div><div className="listing-info"><div className="listing-category">{item.category} <span>• {item.condition}</span></div><h3>{item.title}</h3><div className="listing-bottom"><strong>₹{item.price.toLocaleString('en-IN')}</strong><span><MapPin size={12}/>{item.campus}</span></div><div className="seller-row"><span className="avatar">{item.initials}</span><span>{item.seller}</span><span className="posted">{item.posted}</span></div></div></article>)}</div> : <div className="empty-state"><Bookmark size={29}/><h3>{activeView === 'saved' ? 'Your shortlist is empty' : 'Nothing matches that search'}</h3><p>{activeView === 'saved' ? 'Tap the heart on an item to keep it here.' : 'Try a different keyword or reset your filters.'}</p></div>}
        </div>
      </section>
    </main>
    <footer><span>© 2025 CAMPUS EXCHANGE / BUILT FOR STUDENTS</span><span><a href="#safety">SAFETY CENTRE</a><a href="#rules">COMMUNITY RULES</a></span></footer>
    {selected && <ListingDetail item={selected} saved={saved.includes(selected.id)} onSave={() => toggleSaved(selected.id)} onClose={() => setSelected(null)} onMessage={() => setModal('messages')} />}
    {modal === 'create' && <CreateModal onClose={() => setModal(null)} onSubmit={createListing}/>}
    {modal === 'messages' && <MessageModal onClose={() => setModal(null)} onToast={setToast}/>}
    {modal === 'profile' && <ProfileModal user={user} onClose={() => setModal(null)} onToast={setToast} onSignOut={onSignOut}/>}
    {toast && <div className="toast"><Check size={17}/>{toast}</div>}
  </div>
}

function getInitials(email = '') {
  return email.split('@')[0].split(/[._-]/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U'
}

function Overlay({ children, onClose, wide = false }) { return <div className="overlay" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className={`dialog ${wide ? 'dialog-wide' : ''}`}>{children}</div></div> }
function ListingDetail({ item, saved, onSave, onClose, onMessage }) { return <Overlay onClose={onClose} wide><div className="dialog-image"><img src={item.image} alt={item.title}/><button className="close-btn" onClick={onClose}><X size={19}/></button></div><div className="detail-content"><div className="eyebrow">{item.type.toUpperCase()} / {item.category.toUpperCase()}</div><h2>{item.title}</h2><div className="detail-price">₹{item.price.toLocaleString('en-IN')} <span>· {item.condition}</span></div><p>{item.description}</p><div className="detail-seller"><span className="avatar avatar-large">{item.initials}</span><div><strong>{item.seller}</strong><span><MapPin size={13}/> {item.campus} · member since 2023</span></div><button className="text-link">View profile <ArrowUpRight size={14}/></button></div><div className="dialog-actions"><button className="secondary-btn" onClick={onSave}><Heart size={16} fill={saved ? 'currentColor' : 'none'}/> {saved ? 'Saved' : 'Save item'}</button><button className="primary-btn" onClick={onMessage}><MessageSquare size={16}/> Message seller</button></div><div className="report-link">Something not right? <button>Report this listing</button></div></div></Overlay> }
function CreateModal({ onClose, onSubmit }) { return <Overlay onClose={onClose}><div className="modal-head"><div><div className="eyebrow">03 / NEW LISTING</div><h2>Put it back in play.</h2></div><button className="close-btn plain" onClick={onClose}><X size={19}/></button></div><form className="listing-form" onSubmit={onSubmit}><label>What are you listing?<input name="title" required placeholder="e.g. Data Structures textbook" /></label><div className="form-grid"><label>Category<select name="category"><option>Books</option><option>Electronics</option><option>Room essentials</option><option>Academic supplies</option><option>Sports & hobbies</option></select></label><label>Price (₹)<input name="price" required type="number" min="0" placeholder="0" /></label></div><div className="form-grid"><label>Condition<select name="condition"><option>Like new</option><option>Good</option></select></label><label>Listing type<select name="type"><option>Sale</option><option>Exchange</option></select></label></div><label>Description <textarea name="description" rows="3" placeholder="Add a little context for fellow students..." /></label><button className="upload-box" type="button"><ImagePlus size={21}/><span><strong>Add photos</strong><small>JPG or PNG · up to 5MB</small></span></button><button className="primary-btn submit-btn" type="submit">Publish listing <ArrowUpRight size={16}/></button></form></Overlay> }
function MessageModal({ onClose, onToast }) { const [sent, setSent] = useState(false); return <Overlay onClose={onClose}><div className="modal-head"><div><div className="eyebrow">04 / MESSAGES</div><h2>Your conversations</h2></div><button className="close-btn plain" onClick={onClose}><X size={19}/></button></div>{sent ? <div className="sent-state"><Check size={26}/><h3>Message sent.</h3><p>You'll see replies from sellers here.</p><button className="secondary-btn" onClick={onClose}>Close</button></div> : <><div className="conversation"><span className="avatar">NK</span><div><strong>Nisha Kapoor</strong><p>Is the calculator still available?</p><small>Yesterday · Casio fx-991EX</small></div><span className="unread" /></div><div className="message-compose"><input placeholder="Write a message..." /><button className="primary-btn" onClick={() => { setSent(true); onToast('Message sent to Nisha') }}><Send size={15}/></button></div></>}</Overlay> }
function ProfileModal({ user, onClose, onToast, onSignOut }) { return <Overlay onClose={onClose}><div className="modal-head"><div><div className="eyebrow">05 / ACCOUNT</div><h2>Your profile</h2></div><button className="close-btn plain" onClick={onClose}><X size={19}/></button></div><div className="account-card"><span className="avatar avatar-large">{getInitials(user?.email)}</span><div><h3>{user?.email || 'Your account'}</h3><p>North Campus · Student</p><span className="verified"><ShieldCheck size={14}/> Verified campus account</span></div></div><div className="account-links"><button onClick={() => onToast('Profile settings are ready for your Supabase account')}><CircleUserRound size={17}/> Profile settings <ArrowUpRight size={15}/></button><button onClick={async () => { try { if (isSupabaseConfigured) { const { error } = await supabase.auth.signOut(); if (error) throw error } onSignOut() } catch (error) { onToast(error.message || 'Could not sign out. Please try again.') } }}><LogOut size={17}/> Sign out <ArrowUpRight size={15}/></button></div></Overlay> }

createRoot(document.getElementById('root')).render(<BrowserRouter><AuthGate /></BrowserRouter>)
