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
  const [fullName, setFullName] = useState('')
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
        : await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim()
            }
          }
        })
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
        {mode === 'sign-up' && (
          <label>
            Full name
            <input
              type="text"
              value={fullName}
              onChange={event => setFullName(event.target.value)}
              placeholder="Enter your full name"
              required
            />
          </label>
        )}
        <label>Email address<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@campus.edu" required autoComplete="email" /></label>
        <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 6 characters" required minLength="6" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} /></label>
        {error && <p className="auth-message auth-error" role="alert">{error}</p>}
        {notice && <p className="auth-message auth-notice" role="status">{notice}</p>}
        <button className="primary-btn auth-submit" type="submit" disabled={pending}>{pending ? 'Connecting...' : mode === 'sign-in' ? 'Sign in' : 'Create account'} <ArrowUpRight size={16} /></button>
      </form>
      <button className="auth-switch" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(''); setNotice('') }}>
        {mode === 'sign-in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
      </button>
      {!isSupabaseConfigured && <p className="auth-demo-note">Demo mode is active. Add Supabase credentials to enable production authentication.</p>}
    </div>
  </div>
}

function App({ user, onSignOut }) {
  const [listings, setListings] = useState([])
  const [selectedListing, setSelectedListing] = useState(null)
  useEffect(() => {
    const loadListings = async () => {
      if (!isSupabaseConfigured || !user?.id) {
        setListings(seedListings)
        return
      }

      // Create or update the current student's profile
      const fullName =
        user.user_metadata?.full_name ||
        user.email?.split('@')[0] ||
        'Student'

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            full_name: fullName,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'id' }
        )

      if (profileError) {
        console.error('Profile error:', profileError.message)
      }

      // Fetch listings created by all students
      const { data, error } = await supabase
        .from('listings')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Listings error:', error.message)
        return
      }

      const formattedListings = data.map(item => {
        const sellerName = item.profiles?.full_name || 'Student'

        return {
          ...item,
          seller: sellerName,
          initials: sellerName
            .split(/\s+/)
            .map(part => part[0])
            .slice(0, 2)
            .join('')
            .toUpperCase(),
          posted: 'Recently',
          image: item.image || 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=800&q=80',
          accent: 'paper'
        }
      })

      setListings(formattedListings)
    }

    loadListings()
  }, [user?.id])
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

  useEffect(() => {
    const loadListings = async () => {
      if (!isSupabaseConfigured || !user?.id) {
        setListings(seedListings)
        return
      }

      // Create or update the current student's profile
      const fullName =
        user.user_metadata?.full_name ||
        user.email?.split('@')[0] ||
        'Student'

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            full_name: fullName,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'id' }
        )

      if (profileError) {
        console.error('Profile error:', profileError.message)
      }

      // Fetch listings created by all students
      const { data, error } = await supabase
        .from('listings')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Listings error:', error.message)
        return
      }

      const formattedListings = data.map(item => {
        const sellerName = item.profiles?.full_name || 'Student'

        return {
          ...item,
          seller: sellerName,
          initials: sellerName
            .split(/\s+/)
            .map(part => part[0])
            .slice(0, 2)
            .join('')
            .toUpperCase(),
          posted: 'Recently',
          image: item.image || 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=800&q=80',
          accent: 'paper'
        }
      })

      setListings(formattedListings)
    }

    loadListings()
  }, [user?.id])
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

  const createListing = async (event) => {
    event.preventDefault()

    if (!isSupabaseConfigured || !user?.id) {
      setToast('Please sign in with your Supabase account.')
      return
    }

    const form = new FormData(event.currentTarget)

    const fullName =
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'Student'

    try {
      // Make sure the seller profile exists
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

      if (profileError) throw profileError

      // Save listing in Supabase
      const { data, error } = await supabase
        .from('listings')
        .insert({
          seller_id: user.id,
          title: form.get('title'),
          category: form.get('category'),
          price: Number(form.get('price')),
          condition: form.get('condition'),
          type: form.get('type'),
          description: form.get('description') || '',
          image: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=800&q=80',
          campus: 'North Campus'
        })
        .select()
        .single()

      if (error) throw error

      const newListing = {
        ...data,
        seller: fullName,
        initials: fullName
          .split(/\s+/)
          .map(part => part[0])
          .slice(0, 2)
          .join('')
          .toUpperCase(),
        posted: 'Just now',
        image: data.image,
        accent: 'paper'
      }

      setListings(current => [newListing, ...current])
      setModal(null)
      setActiveView('discover')
      setToast('Listing published successfully!')

    } catch (error) {
      console.error('Listing creation failed:', error)
      setToast(error.message || 'Could not publish listing.')
    }
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
        <button className="icon-btn notification" aria-label="Notifications"><Bell size={18} /><span /></button>
        <button className="profile-chip" onClick={() => setModal('profile')}><span className="avatar avatar-small">{getInitials(user?.email)}</span><span className="profile-name">{user?.email || 'Your account'}</span><ChevronDown size={14} /></button>
        <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu"><Menu size={21} /></button>
      </div>
    </header>
    {menuOpen && <div className="mobile-nav"><button onClick={() => { setActiveView('discover'); setMenuOpen(false) }}>Discover</button><button onClick={() => { setActiveView('saved'); setMenuOpen(false) }}>Saved ({saved.length})</button><button onClick={() => setModal('messages')}>Messages</button></div>}

    <main>
      <section className="hero">
        <div><div className="eyebrow"><span className="status-light" /> LIVE NETWORK / NORTH CAMPUS</div><h1>Find useful things.<br /><em>Keep them moving.</em></h1><p>A trusted marketplace for your campus community. Buy, sell, and exchange what you need — nearby.</p></div>
        <div className="hero-stats"><div><strong>{listings.length * 38}+</strong><span>ACTIVE LISTINGS</span></div><div><strong>1.2k</strong><span>STUDENTS HERE</span></div><div><strong>4.9</strong><span>TRUST SCORE</span></div></div>
      </section>

      <section className="workspace">
        <aside className="sidebar">
          <div className="section-kicker">01 / EXPLORE</div>
          <div className="category-list">{categories.map((item, index) => <button key={item} className={category === item && activeView !== 'saved' ? 'category-active' : ''} onClick={() => { setCategory(item); setActiveView('discover') }}><span className="category-icon">{index === 0 ? <Sparkles size={15} /> : index === 1 ? <BookOpen size={15} /> : index === 2 ? <Laptop size={15} /> : index === 3 ? <PackageOpen size={15} /> : index === 4 ? <Tag size={15} /> : <Zap size={15} />}</span>{item}<span className="category-arrow">↗</span></button>)}</div>
          <div className="sidebar-note"><ShieldCheck size={17} /><div><strong>Campus verified</strong><span>Everyone here has a .edu account.</span></div></div>
        </aside>
        <div className="catalog">
          <div className="catalog-head"><div><div className="section-kicker">02 / {activeView === 'saved' ? 'YOUR SHORTLIST' : 'THE EXCHANGE'}</div><h2>{activeView === 'saved' ? 'Saved for later' : category === 'All items' ? 'Fresh on campus' : category}</h2></div><button className="primary-btn" onClick={() => setModal('create')}><Plus size={17} /> List an item</button></div>
          <div className="control-bar"><div className="search-box"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search books, calculators, furniture..." /><kbd>⌘ K</kbd></div><button className={`filter-btn ${filtersOpen ? 'filter-active' : ''}`} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={16} /> Filters <span className="filter-count">{[condition !== 'All conditions', listingType !== 'All types'].filter(Boolean).length || ''}</span></button></div>
          {filtersOpen && <div className="filters-panel"><label>Condition<select value={condition} onChange={event => setCondition(event.target.value)}><option>All conditions</option><option>Like new</option><option>Good</option></select></label><label>Listing type<select value={listingType} onChange={event => setListingType(event.target.value)}><option>All types</option><option>Sale</option><option>Exchange</option></select></label><button onClick={() => { setCondition('All conditions'); setListingType('All types') }}>Reset</button></div>}
          <div className="result-row"><span>{visibleListings.length} ITEMS IN YOUR AREA</span><button>Recently added <ChevronDown size={13} /></button></div>
          {visibleListings.length ? <div className="listing-grid">{visibleListings.map(item => <article className="listing-card" key={item.id} onClick={() => setSelected(item)}><div className={`listing-image ${item.accent}`}><img src={item.image} alt="" /><span className="type-tag">{item.type === 'Exchange' ? '↔ EXCHANGE' : '● FOR SALE'}</span><button className={`save-btn ${saved.includes(item.id) ? 'is-saved' : ''}`} onClick={event => { event.stopPropagation(); toggleSaved(item.id) }} aria-label="Save listing"><Heart size={17} fill={saved.includes(item.id) ? 'currentColor' : 'none'} /></button></div><div className="listing-info"><div className="listing-category">{item.category} <span>• {item.condition}</span></div><h3>{item.title}</h3><div className="listing-bottom"><strong>₹{item.price.toLocaleString('en-IN')}</strong><span><MapPin size={12} />{item.campus}</span></div><div className="seller-row"><span className="avatar">{item.initials}</span><span>{item.seller}</span><span className="posted">{item.posted}</span></div></div></article>)}</div> : <div className="empty-state"><Bookmark size={29} /><h3>{activeView === 'saved' ? 'Your shortlist is empty' : 'Nothing matches that search'}</h3><p>{activeView === 'saved' ? 'Tap the heart on an item to keep it here.' : 'Try a different keyword or reset your filters.'}</p></div>}
        </div>
      </section>
    </main>
    <footer><span>© 2025 CAMPUS EXCHANGE / BUILT FOR STUDENTS</span><span><a href="#safety">SAFETY CENTRE</a><a href="#rules">COMMUNITY RULES</a></span></footer>
    {selected && (
  <ListingDetail
    item={selected}
    saved={saved.includes(selected.id)}
    onSave={() => toggleSaved(selected.id)}
    onClose={() => setSelected(null)}
    onMessage={() => {
      setSelectedListing(selected)
      setSelected(null)
      setModal('messages')
    }}
  />
)}
    {modal === 'create' && <CreateModal onClose={() => setModal(null)} onSubmit={createListing} />}
    {modal === 'messages' && (
      <MessageModal
        listing={selectedListing}
        user={user}
        onClose={() => setModal(null)}
        onToast={setToast}
      />
    )}
    {modal === 'profile' && <ProfileModal user={user} onClose={() => setModal(null)} onToast={setToast} onSignOut={onSignOut} />}
    {toast && <div className="toast"><Check size={17} />{toast}</div>}
  </div>
}

function getInitials(email = '') {
  return email.split('@')[0].split(/[._-]/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U'
}

function Overlay({ children, onClose, wide = false }) { return <div className="overlay" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className={`dialog ${wide ? 'dialog-wide' : ''}`}>{children}</div></div> }
function ListingDetail({ item, saved, onSave, onClose, onMessage }) { return <Overlay onClose={onClose} wide><div className="dialog-image"><img src={item.image} alt={item.title} /><button className="close-btn" onClick={onClose}><X size={19} /></button></div><div className="detail-content"><div className="eyebrow">{item.type.toUpperCase()} / {item.category.toUpperCase()}</div><h2>{item.title}</h2><div className="detail-price">₹{item.price.toLocaleString('en-IN')} <span>· {item.condition}</span></div><p>{item.description}</p><div className="detail-seller"><span className="avatar avatar-large">{item.initials}</span><div><strong>{item.seller}</strong><span><MapPin size={13} /> {item.campus} · member since 2023</span></div><button className="text-link">View profile <ArrowUpRight size={14} /></button></div><div className="dialog-actions"><button className="secondary-btn" onClick={onSave}><Heart size={16} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save item'}</button><button className="primary-btn" onClick={onMessage}><MessageSquare size={16} /> Message seller</button></div><div className="report-link">Something not right? <button>Report this listing</button></div></div></Overlay> }
function CreateModal({ onClose, onSubmit }) { return <Overlay onClose={onClose}><div className="modal-head"><div><div className="eyebrow">03 / NEW LISTING</div><h2>Put it back in play.</h2></div><button className="close-btn plain" onClick={onClose}><X size={19} /></button></div><form className="listing-form" onSubmit={onSubmit}><label>What are you listing?<input name="title" required placeholder="e.g. Data Structures textbook" /></label><div className="form-grid"><label>Category<select name="category"><option>Books</option><option>Electronics</option><option>Room essentials</option><option>Academic supplies</option><option>Sports & hobbies</option></select></label><label>Price (₹)<input name="price" required type="number" min="0" placeholder="0" /></label></div><div className="form-grid"><label>Condition<select name="condition"><option>Like new</option><option>Good</option></select></label><label>Listing type<select name="type"><option>Sale</option><option>Exchange</option></select></label></div><label>Description <textarea name="description" rows="3" placeholder="Add a little context for fellow students..." /></label><button className="upload-box" type="button"><ImagePlus size={21} /><span><strong>Add photos</strong><small>JPG or PNG · up to 5MB</small></span></button><button className="primary-btn submit-btn" type="submit">Publish listing <ArrowUpRight size={16} /></button></form></Overlay> }

function MessageModal({ listing, user, onClose, onToast }) {
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [conversationId, setConversationId] = useState(null)

  useEffect(() => {
    if (!listing?.id || !user?.id) return

    let active = true

    const loadConversation = async () => {
      setLoading(true)

      try {
        const { data: existing, error: searchError } = await supabase
          .from('conversations')
          .select('*')
          .eq('listing_id', listing.id)
          .eq('buyer_id', user.id)
          .eq('seller_id', listing.seller_id)
          .maybeSingle()

        if (searchError) throw searchError

        let conversation = existing

        if (!conversation) {
          const { data, error } = await supabase
            .from('conversations')
            .insert({
              listing_id: listing.id,
              buyer_id: user.id,
              seller_id: listing.seller_id
            })
            .select()
            .single()

          if (error) throw error
          conversation = data
        }

        if (!active) return

        setConversationId(conversation.id)

        const { data: loadedMessages, error: messagesError } =
          await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: true })

        if (messagesError) throw messagesError

        if (active) setMessages(loadedMessages || [])
      } catch (error) {
        console.error('Conversation error:', error)
        onToast(error.message || 'Could not load conversation')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadConversation()

    return () => {
      active = false
    }
  }, [listing?.id, user?.id])

  const sendMessage = async (event) => {
    event.preventDefault()

    if (!message.trim() || !conversationId || sending) return

    setSending(true)

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: message.trim()
        })
        .select()
        .single()

      if (error) throw error

      setMessages(previous => [...previous, data])
      setMessage('')
    } catch (error) {
      console.error('Send message error:', error)
      onToast(error.message || 'Message could not be sent')
    } finally {
      setSending(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="modal-head">
        <div>
          <div className="eyebrow">04 / MESSAGES</div>
          <h2>{listing?.title || 'Conversation'}</h2>
        </div>
        <button className="close-btn plain" onClick={onClose}>
          <X size={19} />
        </button>
      </div>

      {!listing || !user ? (
        <p>Please select a listing and log in first.</p>
      ) : (
        <>
          <div className="conversation">
            <span className="avatar">{listing.initials}</span>
            <div>
              <strong>{listing.seller}</strong>
              <p>{listing.title}</p>
            </div>
          </div>

          <div className="message-list">
            {loading ? (
              <p>Loading messages...</p>
            ) : messages.length === 0 ? (
              <p>Start the conversation by sending a message.</p>
            ) : (
              messages.map(item => (
                <div
                  key={item.id}
                  className={
                    item.sender_id === user.id
                      ? 'message-bubble own'
                      : 'message-bubble'
                  }
                >
                  {item.content}
                </div>
              ))
            )}
          </div>

          <form className="message-compose" onSubmit={sendMessage}>
            <input
              value={message}
              onChange={event => setMessage(event.target.value)}
              placeholder="Write a message..."
              disabled={loading || !conversationId}
            />
            <button
              className="primary-btn"
              type="submit"
              disabled={sending || loading || !conversationId}
            >
              <Send size={15} />
            </button>
          </form>
        </>
      )}
    </Overlay>
  )
}
function ProfileModal({ user, onClose, onToast, onSignOut }) { return <Overlay onClose={onClose}><div className="modal-head"><div><div className="eyebrow">05 / ACCOUNT</div><h2>Your profile</h2></div><button className="close-btn plain" onClick={onClose}><X size={19} /></button></div><div className="account-card"><span className="avatar avatar-large">{getInitials(user?.email)}</span><div><h3>{user?.email || 'Your account'}</h3><p>North Campus · Student</p><span className="verified"><ShieldCheck size={14} /> Verified campus account</span></div></div><div className="account-links"><button onClick={() => onToast('Profile settings are ready for your Supabase account')}><CircleUserRound size={17} /> Profile settings <ArrowUpRight size={15} /></button><button onClick={async () => { try { if (isSupabaseConfigured) { const { error } = await supabase.auth.signOut(); if (error) throw error } onSignOut() } catch (error) { onToast(error.message || 'Could not sign out. Please try again.') } }}><LogOut size={17} /> Sign out <ArrowUpRight size={15} /></button></div></Overlay> }

createRoot(document.getElementById('root')).render(<BrowserRouter><AuthGate /></BrowserRouter>)
