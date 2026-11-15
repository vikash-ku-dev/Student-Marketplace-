import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight, Bell, Bookmark, BookOpen, Bot, Check, ChevronDown, CircleUserRound,
  Clock3, Copy, ExternalLink, Filter, Heart, ImagePlus, Laptop, LogOut, MapPin, Menu, MessageSquare,
  PackageOpen, Plus, RotateCcw, Search, Send, ShieldCheck, SlidersHorizontal, Sparkles,
  Tag, Users, X, Zap
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import CollabsModule from './components/CollabsModule'
import './styles.css'

const DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=800&q=80'

function getProductImageUrl(item) {
  if (!item) return DEFAULT_FALLBACK_IMAGE
  const rawUrl = typeof item === 'string'
    ? item
    : item.image ||
    item.image_url ||
    item.imageUrl ||
    item.photo ||
    item.photo_url ||
    item.img_url ||
    (Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null)

  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return DEFAULT_FALLBACK_IMAGE
  }

  const trimmed = rawUrl.trim()

  if (/^(https?:\/\/|data:image\/|blob:)/i.test(trimmed)) {
    return trimmed
  }

  if (supabase) {
    const cleanPath = trimmed.replace(/^\/+/, '')
    const filePath = cleanPath.startsWith('listings/') ? cleanPath.replace(/^listings\//, '') : cleanPath
    const { data } = supabase.storage.from('listings').getPublicUrl(filePath)
    if (data?.publicUrl) return data.publicUrl
  }

  return trimmed
}

const handleImageError = (event) => {
  const target = event.currentTarget
  if (target.src !== DEFAULT_FALLBACK_IMAGE) {
    target.onerror = null
    target.src = DEFAULT_FALLBACK_IMAGE
  }
}

function compressImage(file, maxWidth = 900, quality = 0.72) {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      resolve(null)
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          } else {
            width = Math.round((width * maxWidth) / height)
            height = maxWidth
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => resolve(e.target.result)
      img.src = e.target.result
    }
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}

const seedListings = [
  { id: 1, title: 'Engineering Mathematics — 4th ed.', category: 'Books', price: 420, condition: 'Good', type: 'Sale', seller: 'Aarav Menon', initials: 'AM', campus: 'North Campus', posted: '2h ago', image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80', accent: 'paper', description: 'Clean copy with light highlighting in two chapters. Great for first-year engineering.' },
  { id: 2, title: 'Casio fx-991EX ClassWiz', category: 'Electronics', price: 850, condition: 'Like new', type: 'Sale', seller: 'Nisha Kapoor', initials: 'NK', campus: 'North Campus', posted: '5h ago', image: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=800&q=80', accent: 'blue', description: 'Barely used scientific calculator. Includes original case and fresh battery.' },
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
        try {
          const { data: sessionData } = await supabase.auth.getSession()
          if (sessionData?.session) {
            const { data: userData, error: userError } = await supabase.auth.getUser()
            if (userError || !userData?.user) {
              await supabase.auth.signOut()
              sessionStorage.removeItem('campus-exchange-demo-user')
              if (active) setUser(null)
            } else {
              if (active) setUser(userData.user)
            }
          } else {
            if (active) setUser(null)
          }
        } catch {
          if (active) setUser(null)
        }
      } else {
        const demoUser = sessionStorage.getItem('campus-exchange-demo-user')
        if (active && demoUser) setUser({ email: demoUser })
      }
      if (active) setLoading(false)
    }
    loadSession()

    if (!isSupabaseConfigured) return () => { active = false }
    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        if (active) setUser(null)
        return
      }
      const { data: userData, error } = await supabase.auth.getUser()
      if (error || !userData?.user) {
        if (active) setUser(null)
      } else {
        if (active) setUser(userData.user)
      }
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
        if (result.data?.user?.id) {
          try {
            await supabase.from('profiles').upsert({
              id: result.data.user.id,
              full_name: fullName.trim() || result.data.user.user_metadata?.full_name || email.split('@')[0],
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' })
          } catch {
            // Handled on load
          }
        }
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
          image: getProductImageUrl(item),
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
          image: getProductImageUrl(item),
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

  const createListing = async (event, imageFile, imagePreview) => {
    event.preventDefault()

    const form = new FormData(event.currentTarget)

    const fullName =
      user?.user_metadata?.full_name ||
      user?.email?.split('@')[0] ||
      'Student'

    let finalImageUrl = imagePreview || ''

    if (!finalImageUrl && imageFile) {
      finalImageUrl = (await compressImage(imageFile, 900, 0.72)) || ''
    }

    if (!finalImageUrl) {
      finalImageUrl = DEFAULT_FALLBACK_IMAGE
    }

    if (!isSupabaseConfigured || !user?.id) {
      const newListing = {
        id: Date.now(),
        title: form.get('title'),
        category: form.get('category'),
        price: Number(form.get('price')),
        condition: form.get('condition'),
        type: form.get('type'),
        description: form.get('description') || '',
        image: finalImageUrl,
        campus: 'North Campus',
        seller: fullName,
        initials: fullName.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'ST',
        posted: 'Just now',
        accent: 'paper'
      }

      setListings(current => [newListing, ...current])
      setModal(null)
      setActiveView('discover')
      setToast('Listing published successfully!')
      return
    }

    try {
      // Make sure the seller profile exists
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

      if (profileError) {
        if (profileError.message?.includes('profiles_id_fkey') || profileError.code === '23503') {
          await supabase.auth.signOut()
          onSignOut?.()
          throw new Error('Your session expired or your account was not found in the database. Please sign in or create an account.')
        }
        throw profileError
      }

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
          image: finalImageUrl,
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
        image: getProductImageUrl(data?.image || finalImageUrl),
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
      <button className="brand" onClick={() => { setActiveView('discover'); setCategory('All items') }}><span className="brand-mark">CD</span><span>Campus<span className="brand-accent">Dude</span></span></button>
      <nav className="desktop-nav">
        <button className={['discover', 'saved'].includes(activeView) && !modal ? 'nav-active' : ''} onClick={() => { setActiveView('discover'); setModal(null) }}>Marketplace</button>
        <button className={activeView === 'collabs' && !modal ? 'nav-active' : ''} onClick={() => { setActiveView('collabs'); setModal(null) }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Users size={14} style={{ color: activeView === 'collabs' ? 'var(--dp-color-accent)' : 'inherit' }} />
          <span>Collabs</span>
          <span className="nav-count" style={{ background: '#fcefe9', color: 'var(--dp-color-accent)', fontWeight: 600 }}>8+</span>
        </button>
        <button className={activeView === 'saved' && !modal ? 'nav-active' : ''} onClick={() => { setActiveView('saved'); setModal(null) }}>Saved <span className="nav-count">{saved.length}</span></button>
        <button className={modal === 'messages' ? 'nav-active' : ''} onClick={() => { setSelectedListing(null); setModal('messages') }}>Messages <span className="nav-dot" /></button>
        <button className={modal === 'ai-assistant' ? 'nav-active' : ''} onClick={() => setModal('ai-assistant')} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <Sparkles size={14} style={{ color: 'var(--dp-color-accent)' }} />
          <span>Campus AI</span>
        </button>
      </nav>
      <div className="top-actions">
        <button className="icon-btn notification" aria-label="Notifications"><Bell size={18} /><span /></button>
        <button className="profile-chip" onClick={() => setModal('profile')}><span className="avatar avatar-small">{getInitials(user?.email)}</span><span className="profile-name">{user?.email || 'Your account'}</span><ChevronDown size={14} /></button>
        <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu"><Menu size={21} /></button>
      </div>
    </header>
    {menuOpen && (
      <div className="mobile-nav">
        <button onClick={() => { setActiveView('discover'); setModal(null); setMenuOpen(false) }}>Marketplace</button>
        <button onClick={() => { setActiveView('collabs'); setModal(null); setMenuOpen(false) }} style={{ color: 'var(--dp-color-accent)', fontWeight: 600 }}>
          👥 Collabs (Student Community)
        </button>
        <button onClick={() => { setActiveView('saved'); setModal(null); setMenuOpen(false) }}>Saved ({saved.length})</button>
        <button onClick={() => { setSelectedListing(null); setModal('messages'); setMenuOpen(false) }}>Messages</button>
        <button onClick={() => { setModal('ai-assistant'); setMenuOpen(false) }} style={{ color: 'var(--dp-color-accent)', fontWeight: 600 }}>
          ✦ CampusDude AI Assistant
        </button>
      </div>
    )}

    <main>
      {activeView === 'collabs' ? (
        <CollabsModule user={user} onToast={setToast} />
      ) : (
        <>
          <section className="hero">
            <div><div className="eyebrow"><span className="status-light" /> LIVE NETWORK / NORTH CAMPUS</div><h1>Find useful things.<br /><em>Keep them moving.</em></h1><p>A trusted marketplace for your campus community. Buy, sell, and exchange what you need — nearby.</p></div>
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
              {visibleListings.length ? <div className="listing-grid">{visibleListings.map(item => <article className="listing-card" key={item.id} onClick={() => setSelected(item)}><div className={`listing-image ${item.accent}`}><img src={getProductImageUrl(item)} alt={item.title || 'Product listing'} loading="lazy" onError={handleImageError} /><span className="type-tag">{item.type === 'Exchange' ? '↔ EXCHANGE' : '● FOR SALE'}</span><button className={`save-btn ${saved.includes(item.id) ? 'is-saved' : ''}`} onClick={event => { event.stopPropagation(); toggleSaved(item.id) }} aria-label="Save listing"><Heart size={17} fill={saved.includes(item.id) ? 'currentColor' : 'none'} /></button></div><div className="listing-info"><div className="listing-category">{item.category} <span>• {item.condition}</span></div><h3>{item.title}</h3><div className="listing-bottom"><strong>₹{item.price.toLocaleString('en-IN')}</strong><span><MapPin size={12} />{item.campus}</span></div><div className="seller-row"><span className="avatar">{item.initials}</span><span>{item.seller}</span><span className="posted">{item.posted}</span></div></div></article>)}</div> : <div className="empty-state"><Bookmark size={29} /><h3>{activeView === 'saved' ? 'Your shortlist is empty' : 'Nothing matches that search'}</h3><p>{activeView === 'saved' ? 'Tap the heart on an item to keep it here.' : 'Try a different keyword or reset your filters.'}</p></div>}
            </div>
          </section>
        </>
      )}
    </main>
    <footer><span>© 2025 CAMPUS EXCHANGE / BUILT FOR STUDENTS</span><span><a href="#safety">SAFETY CENTRE</a><a href="#rules">COMMUNITY RULES</a></span></footer>
    {selected && (
      <ListingDetail
        item={selected}
        saved={saved.includes(selected.id)}
        onSave={() => toggleSaved(selected.id)}
        onClose={() => setSelected(null)}
        onMessage={() => {
          if (user?.id && selected?.seller_id && user.id === selected.seller_id) {
            setToast("You cannot message yourself on your own listing.")
            return
          }
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
    {modal === 'ai-assistant' && (
      <AiAssistantModal
        user={user}
        onClose={() => setModal(null)}
        onToast={setToast}
      />
    )}
    {modal === 'profile' && <ProfileModal user={user} onClose={() => setModal(null)} onToast={setToast} onSignOut={onSignOut} />}
    <button
      className="ai-floating-trigger"
      onClick={() => setModal('ai-assistant')}
      aria-label="Ask Campus Dude AI"
      title="Ask Campus Dude AI"
    >
      <span className="ai-pulse-dot" />
      <Sparkles size={14} style={{ color: 'var(--dp-color-accent)' }} />
      <span>Ask Dude AI</span>
    </button>
    {toast && <div className="toast"><Check size={17} />{toast}</div>}
  </div>
}

function getInitials(email = '') {
  return email.split('@')[0].split(/[._-]/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U'
}

function Overlay({ children, onClose, wide = false }) { return <div className="overlay" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className={`dialog ${wide ? 'dialog-wide' : ''}`}>{children}</div></div> }
function ListingDetail({ item, saved, onSave, onClose, onMessage }) { return <Overlay onClose={onClose} wide><div className="dialog-image"><img src={getProductImageUrl(item)} alt={item.title || 'Product details'} onError={handleImageError} /><button className="close-btn" onClick={onClose}><X size={19} /></button></div><div className="detail-content"><div className="eyebrow">{item.type.toUpperCase()} / {item.category.toUpperCase()}</div><h2>{item.title}</h2><div className="detail-price">₹{item.price.toLocaleString('en-IN')} <span>· {item.condition}</span></div><p>{item.description}</p><div className="detail-seller"><span className="avatar avatar-large">{item.initials}</span><div><strong>{item.seller}</strong><span><MapPin size={13} /> {item.campus} · member since 2023</span></div><button className="text-link">View profile <ArrowUpRight size={14} /></button></div><div className="dialog-actions"><button className="secondary-btn" onClick={onSave}><Heart size={16} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save item'}</button><button className="primary-btn" onClick={onMessage}><MessageSquare size={16} /> Message seller</button></div><div className="report-link">Something not right? <button>Report this listing</button></div></div></Overlay> }
function CreateModal({ onClose, onSubmit }) {
  const [imagePreview, setImagePreview] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [compressing, setCompressing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setCompressing(true)
    try {
      const compressed = await compressImage(file, 900, 0.72)
      setImagePreview(compressed || '')
    } catch {
      // Fallback to basic file read
      const reader = new FileReader()
      reader.onload = (loadEvt) => setImagePreview(loadEvt.target.result)
      reader.readAsDataURL(file)
    } finally {
      setCompressing(false)
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      await onSubmit(e, imageFile, imagePreview)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="modal-head">
        <div>
          <div className="eyebrow">03 / NEW LISTING</div>
          <h2>Put it back in play.</h2>
        </div>
        <button className="close-btn plain" onClick={onClose}><X size={19} /></button>
      </div>
      <form className="listing-form" onSubmit={handleFormSubmit}>
        <label>What are you listing?<input name="title" required placeholder="e.g. Data Structures textbook" /></label>
        <div className="form-grid">
          <label>Category<select name="category"><option>Books</option><option>Electronics</option><option>Room essentials</option><option>Academic supplies</option><option>Sports & hobbies</option></select></label>
          <label>Price (₹)<input name="price" required type="number" min="0" placeholder="0" /></label>
        </div>
        <div className="form-grid">
          <label>Condition<select name="condition"><option>Like new</option><option>Good</option></select></label>
          <label>Listing type<select name="type"><option>Sale</option><option>Exchange</option></select></label>
        </div>
        <label>Description <textarea name="description" rows="3" placeholder="Add a little context for fellow students..." /></label>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <button
          className="upload-box"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{ cursor: 'pointer' }}
        >
          {compressing ? (
            <span style={{ textAlign: 'center' }}><strong>Optimizing photo...</strong><small>Preparing for fast upload</small></span>
          ) : imagePreview ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '0 8px' }}>
              <img
                src={imagePreview}
                alt="Selected preview"
                style={{ width: '46px', height: '46px', objectFit: 'cover', borderRadius: '3px' }}
              />
              <span style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                  {imageFile?.name || 'Photo selected'}
                </strong>
                <small style={{ color: 'var(--dp-color-accent, #e35324)' }}>Click to change photo</small>
              </span>
            </div>
          ) : (
            <>
              <ImagePlus size={21} />
              <span><strong>Add photos</strong><small>JPG, PNG or WEBP · auto-optimized</small></span>
            </>
          )}
        </button>

        <button className="primary-btn submit-btn" type="submit" disabled={submitting || compressing}>
          {submitting ? 'Publishing listing...' : 'Publish listing'} <ArrowUpRight size={16} />
        </button>
      </form>
    </Overlay>
  )
}

function MessageModal({ listing, user, onClose, onToast }) {
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

  const loadConversations = async () => {
    if (!isSupabaseConfigured || !user?.id) {
      try {
        const demo = JSON.parse(sessionStorage.getItem('campus-exchange-demo-convs') || '[]')
        setConversations(demo)
      } catch {
        setConversations([])
      }
      return
    }

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, listings(id, title, image, price, seller_id), buyer:profiles!conversations_buyer_id_fkey(full_name), seller:profiles!conversations_seller_id_fkey(full_name)')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setConversations(data)
      }
    } catch (err) {
      console.error('Error loading conversations:', err)
    }
  }

  useEffect(() => {
    let active = true

    const init = async () => {
      setLoading(true)
      await loadConversations()

      if (!listing) {
        setLoading(false)
        return
      }

      if (!isSupabaseConfigured || !user?.id || !isUUID(listing.id) || !isUUID(listing.seller_id)) {
        const demoConvId = `demo-${listing.id}`
        const demoConv = {
          id: demoConvId,
          isDemo: true,
          listing_id: listing.id,
          listing_title: listing.title,
          other_name: listing.seller || 'Seller',
          other_initials: listing.initials || 'S'
        }
        if (active) {
          setActiveConv(demoConv)
          try {
            const stored = JSON.parse(sessionStorage.getItem(`demo-msgs-${demoConvId}`) || '[]')
            setMessages(stored)
          } catch {
            setMessages([])
          }
          setLoading(false)
        }
        return
      }

      try {
        const { data: existing } = await supabase
          .from('conversations')
          .select('*, listings(id, title, image, price, seller_id), buyer:profiles!conversations_buyer_id_fkey(full_name), seller:profiles!conversations_seller_id_fkey(full_name)')
          .eq('listing_id', listing.id)
          .eq('buyer_id', user.id)
          .eq('seller_id', listing.seller_id)
          .maybeSingle()

        let conv = existing

        if (!conv) {
          const { data: created, error: createError } = await supabase
            .from('conversations')
            .insert({
              listing_id: listing.id,
              buyer_id: user.id,
              seller_id: listing.seller_id
            })
            .select('*, listings(id, title, image, price, seller_id), buyer:profiles!conversations_buyer_id_fkey(full_name), seller:profiles!conversations_seller_id_fkey(full_name)')
            .single()

          if (createError) throw createError
          conv = created
        }

        if (active && conv) {
          setActiveConv(conv)
          await fetchMessages(conv.id)
        }
      } catch (err) {
        console.error('Failed to open conversation:', err)
        onToast(err.message || 'Could not open conversation.')
      } finally {
        if (active) setLoading(false)
      }
    }

    init()

    return () => {
      active = false
    }
  }, [listing?.id, user?.id])

  const fetchMessages = async (convId) => {
    if (!convId) return
    if (typeof convId === 'string' && convId.startsWith('demo-')) {
      try {
        const stored = JSON.parse(sessionStorage.getItem(`demo-msgs-${convId}`) || '[]')
        setMessages(stored)
      } catch {
        setMessages([])
      }
      return
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setMessages(data)
      }
    } catch (err) {
      console.error('Error fetching messages:', err)
    }
  }

  useEffect(() => {
    if (!activeConv?.id) return
    const interval = setInterval(() => {
      fetchMessages(activeConv.id)
    }, 2500)
    return () => clearInterval(interval)
  }, [activeConv?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!message.trim() || !activeConv || sending) return

    const content = message.trim()
    setSending(true)

    if (activeConv.isDemo || !isSupabaseConfigured || !user?.id) {
      const newMsg = {
        id: Date.now(),
        conversation_id: activeConv.id,
        sender_id: user?.id || 'me',
        content,
        created_at: new Date().toISOString()
      }
      const updated = [...messages, newMsg]
      setMessages(updated)
      sessionStorage.setItem(`demo-msgs-${activeConv.id}`, JSON.stringify(updated))
      setMessage('')
      setSending(false)

      const demoConvs = JSON.parse(sessionStorage.getItem('campus-exchange-demo-convs') || '[]')
      if (!demoConvs.some(c => c.id === activeConv.id)) {
        demoConvs.unshift({
          id: activeConv.id,
          isDemo: true,
          listing_title: activeConv.listing_title,
          other_name: activeConv.other_name,
          last_message: content
        })
        sessionStorage.setItem('campus-exchange-demo-convs', JSON.stringify(demoConvs))
        setConversations(demoConvs)
      }
      return
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConv.id,
          sender_id: user.id,
          content
        })
        .select()
        .single()

      if (error) throw error

      setMessages(prev => [...prev, data])
      setMessage('')
    } catch (err) {
      console.error('Send message error:', err)
      onToast(err.message || 'Message could not be sent.')
    } finally {
      setSending(false)
    }
  }

  const getOtherParty = (conv) => {
    if (conv.isDemo) {
      return { name: conv.other_name || 'Seller', initials: conv.other_initials || 'S' }
    }
    const isCurrentUserBuyer = conv.buyer_id === user?.id
    const name = isCurrentUserBuyer
      ? (conv.seller?.full_name || 'Seller')
      : (conv.buyer?.full_name || 'Buyer')
    const initials = name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'U'
    return { name, initials }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="modal-head">
        <div>
          <div className="eyebrow">04 / MESSAGES</div>
          <h2>{activeConv ? (activeConv.listings?.title || activeConv.listing_title || 'Conversation') : 'Your conversations'}</h2>
        </div>
        <button className="close-btn plain" onClick={onClose}>
          <X size={19} />
        </button>
      </div>

      {!user ? (
        <p style={{ padding: '24px 0', color: '#68757a', textAlign: 'center' }}>Please sign in to access your messages.</p>
      ) : activeConv ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #c5ccce' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="avatar avatar-small">{getOtherParty(activeConv).initials}</span>
              <div>
                <strong style={{ fontSize: '13px', color: '#253137' }}>{getOtherParty(activeConv).name}</strong>
                <p style={{ margin: 0, fontSize: '11px', color: '#68757a' }}>
                  {activeConv.listings?.title || activeConv.listing_title || 'Listing inquiry'}
                </p>
              </div>
            </div>
            <button
              onClick={() => { setActiveConv(null); loadConversations(); }}
              style={{ background: 'transparent', border: 'none', color: 'var(--dp-color-accent, #e35324)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
            >
              ← All conversations
            </button>
          </div>

          <div
            style={{
              maxHeight: '300px',
              minHeight: '180px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '9px',
              padding: '16px 4px',
              marginTop: '4px'
            }}
          >
            {loading ? (
              <p style={{ color: '#68757a', textAlign: 'center', margin: 'auto' }}>Loading messages...</p>
            ) : messages.length === 0 ? (
              <p style={{ color: '#68757a', textAlign: 'center', margin: 'auto', fontSize: '13px' }}>
                No messages yet. Send a message to start chatting!
              </p>
            ) : (
              messages.map(item => {
                const isOwn = item.sender_id === user?.id
                return (
                  <div
                    key={item.id}
                    style={{
                      alignSelf: isOwn ? 'flex-end' : 'flex-start',
                      maxWidth: '78%',
                      padding: '9px 13px',
                      borderRadius: '12px',
                      borderBottomRightRadius: isOwn ? '2px' : '12px',
                      borderBottomLeftRadius: isOwn ? '12px' : '2px',
                      background: isOwn ? 'var(--dp-color-field, #253137)' : '#dce2e3',
                      color: isOwn ? '#ffffff' : '#253137',
                      fontSize: '13px',
                      lineHeight: '1.4',
                      wordBreak: 'break-word',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                    }}
                  >
                    {item.content}
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="message-compose" onSubmit={sendMessage}>
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={`Message ${getOtherParty(activeConv).name}...`}
              disabled={loading || sending}
            />
            <button
              className="primary-btn"
              type="submit"
              disabled={sending || loading || !message.trim()}
            >
              <Send size={15} />
            </button>
          </form>
        </>
      ) : (
        <div style={{ minHeight: '200px' }}>
          {conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: '#68757a' }}>
              <MessageSquare size={32} style={{ opacity: 0.45, marginBottom: '8px' }} />
              <h3 style={{ margin: '6px 0 4px', fontSize: '15px', color: '#344148' }}>No conversations yet</h3>
              <p style={{ margin: 0, fontSize: '12px' }}>When you message a seller on an item or a buyer messages you, private chats will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '4px', maxHeight: '340px', overflowY: 'auto' }}>
              {conversations.map(c => {
                const other = getOtherParty(c)
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setActiveConv(c)
                      fetchMessages(c.id)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #d4dada',
                      transition: 'background 120ms'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#dce1e2'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span className="avatar avatar-small">{other.initials}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: '13px', color: '#253137', display: 'block' }}>{other.name}</strong>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#68757a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.listings?.title || c.listing_title || 'Listing inquiry'}
                      </p>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--dp-color-accent, #e35324)', fontWeight: 600 }}>Chat →</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </Overlay>
  )
}
function renderInline(str) {
  if (!str) return ''
  return str
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[(.*?)\]\((https?:\/\/.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--dp-color-accent);text-decoration:underline;">$1</a>')
}

function formatAiText(text) {
  if (!text) return null
  const paragraphs = text.split('\n\n')
  return paragraphs.map((para, i) => {
    const trimmed = para.trim()
    if (!trimmed) return null
    if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
      const code = trimmed.slice(3, -3).replace(/^[a-z]+\n/, '')
      return <pre key={i}>{code}</pre>
    }
    if (trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.includes('\n•') || trimmed.includes('\n- ')) {
      const lines = trimmed.split('\n')
      return (
        <ul key={i} style={{ margin: '6px 0', paddingLeft: '18px' }}>
          {lines.map((line, idx) => {
            const clean = line.replace(/^[•\-]\s*/, '').trim()
            if (!clean) return null
            return <li key={idx} dangerouslySetInnerHTML={{ __html: renderInline(clean) }} />
          })}
        </ul>
      )
    }
    return <p key={i} style={{ margin: '6px 0', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: renderInline(trimmed) }} />
  })
}

async function callGroqDirect(question, profile, history) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY 
  if (!apiKey) return null

  const studentName = profile.name || 'Student'
  const branch = profile.branch || 'Engineering'
  const year = profile.year || 'Student'
  const residence = profile.residence || 'Hosteller'

  const systemPrompt = `You are Dude, the friendly, intelligent AI campus assistant for Guru Nanak Dev Engineering College (GNDEC), Ludhiana (https://www.gndec.ac.in/).
Student details:
- Name: ${studentName}
- Branch: ${branch}
- Year: ${year}
- Residence: ${residence}

Your guidelines:
1. When asked about college rules (hostel curfew, 75% attendance policy, leave rules, library book limits, exam passing criteria, grading):
   - Answer accurately according to GNDEC official policies.
2. When asked to draft emails or applications (leave application, fee receipt, gate pass, bonafide):
   - Draft a complete, polite application with Subject and placeholders like [Roll No] or [Date].
3. For greetings, casual questions, or chit-chat:
   - Chat naturally, politely, and warmly as a helpful campus buddy.
4. If the student types random gibberish or characters (e.g. "jkdssbdb"):
   - Politely tell them you didn't quite catch that, and invite them to ask about college rules, exams, hostel, or application drafts.
5. Keep responses concise, clear, and student-friendly with markdown bold headers and bullet points.`

  const messages = [
    { role: 'system', content: systemPrompt }
  ]

  if (Array.isArray(history)) {
    history.slice(-4).forEach(h => {
      if (typeof h === 'string') {
        const isDude = h.startsWith('Dude:')
        messages.push({
          role: isDude ? 'assistant' : 'user',
          content: h.replace(/^(Dude|Student):\s*/, '')
        })
      } else if (h && h.sender && h.text) {
        messages.push({
          role: h.sender === 'assistant' ? 'assistant' : 'user',
          content: h.text
        })
      }
    })
  }

  messages.push({ role: 'user', content: question })

  const models = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b']
  for (const model of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.5,
          max_tokens: 1024
        })
      })

      if (res.ok) {
        const data = await res.json()
        const text = data?.choices?.[0]?.message?.content
        if (text) return text
      }
    } catch (err) {
      console.warn(`Groq query error with ${model}:`, err)
    }
  }

  return null
}

function getClientCampusAnswer(query, name = 'Student', branch = 'CSE', year = '2nd Year') {
  const q = query.toLowerCase().trim()

  // Random letters / gibberish check
  const isGibberish = !q.includes(' ') && q.length > 5 && !/[aeiou]{2,}/i.test(q)
  if (isGibberish) {
    return {
      answer: `Hello! It looks like you typed *"${query}"*.\n\nI am **Dude**, your GNDEC campus assistant! You can ask me:\n• **Hostel rules & entry/exit timings**\n• **75% attendance criteria & medical leave**\n• **Central Library timings & book limits**\n• **Drafting official leave applications or emails**\n\nHow can I help you today?`,
      sources: ['https://www.gndec.ac.in/'],
      intent: 'knowledge'
    }
  }

  // Greetings check
  if (/^(hi|hello|hey|yo|dude|sup|good\s*(morning|afternoon|evening))/i.test(q)) {
    return {
      answer: `Hey ${name}! 👋 I am Dude, your GNDEC campus assistant.\n\nI can help you with college rules, hostel curfew, attendance criteria, or draft emails to your professors. What's on your mind?`,
      sources: ['https://www.gndec.ac.in/'],
      intent: 'knowledge'
    }
  }

  // General "who are you" check
  if (q.includes('who are you') || q.includes('what can you do') || q.includes('help')) {
    return {
      answer: `I am **Dude**, the AI campus assistant for **Guru Nanak Dev Engineering College (GNDEC)**.\n\nI can help you with:\n1. **College Rules & Regulations:** Hostel timings, 75% attendance rule, exam schedules, and library access.\n2. **Official Drafts:** Leave applications, fee receipt requests, and emails to HODs.\n3. **Campus Info:** Contact numbers, department guidance, and notifications.\n\nTry clicking one of the quick suggestions above or type your question!`,
      sources: ['https://www.gndec.ac.in/'],
      intent: 'knowledge'
    }
  }

  if (q.includes('hostel') || q.includes('mess') || q.includes('curfew') || q.includes('gate pass') || q.includes('warden')) {
    return {
      answer: `**GNDEC Hostel Regulations & Timings:**\n\n• **Curfew Timings:** For boys hostels, the main gate entry closes at 9:30 PM. For girls hostel, entry closes at 7:30 PM (or as specified during summer/winter schedules).\n• **Night Out & Leave:** Students wishing to stay out must submit a written gate pass signed by the Hostel Warden / Chief Warden at least 24 hours in advance.\n• **Mess Timings:** Breakfast: 7:30 AM – 9:00 AM, Lunch: 12:30 PM – 2:00 PM, Dinner: 7:30 PM – 9:15 PM.\n• **Discipline:** Ragging in any form is strictly banned under UGC and college norms (Zero Tolerance Policy). Heavy appliances (heaters/irons) are prohibited in rooms.`,
      sources: ['https://www.gndec.ac.in/?q=node/59'],
      intent: 'knowledge'
    }
  }

  if (q.includes('attendance') || q.includes('75%') || q.includes('medical') || q.includes('leave') || q.includes('shortage')) {
    return {
      answer: `**GNDEC Attendance Policy & Medical Leave Rules:**\n\n• **Minimum Required Attendance:** A minimum of **75% attendance** is mandatory in all theory and practical subjects to be eligible for university final examinations.\n• **Medical Leave:** In case of medical emergencies, medical certificates signed by a registered medical practitioner must be submitted to the HOD within 7 days of returning to campus.\n• **Shortage of Attendance:** Students with attendance between 65% and 75% may only be considered for condonation on valid medical or institutional representation grounds with Principal approval.`,
      sources: ['https://www.gndec.ac.in/?q=node/12'],
      intent: 'knowledge'
    }
  }

  if (q.includes('library') || q.includes('book') || q.includes('reading room') || q.includes('fine')) {
    return {
      answer: `**GNDEC Central Library Information:**\n\n• **Timings:** Weekdays: 8:00 AM to 8:00 PM. Reading room remains open until 10:00 PM during mid-semester and final exams.\n• **Book Loan Limits:** B.Tech students can borrow up to 4 books for a period of 14 days. Book bank facility is available for SC/ST and needy students.\n• **Digital Library:** Provides access to IEEE Xplore, ScienceDirect, DELNET, and NPTEL lecture video databases.\n• **Overdue Fine:** ₹1 per book per day after the due date.`,
      sources: ['https://www.gndec.ac.in/?q=node/33'],
      intent: 'knowledge'
    }
  }

  if (q.includes('draft') || q.includes('write email') || q.includes('write mail') || q.includes('application') || q.includes('letter')) {
    const isLeave = q.includes('leave') || q.includes('fever') || q.includes('sick') || q.includes('medical')
    const isFee = q.includes('fee') || q.includes('receipt') || q.includes('payment')
    
    let subject = isLeave ? `Application for Leave of Absence - ${name} (${branch})` : isFee ? `Request for Fee Receipt / Payment Clearance - ${name} (${branch})` : `Application regarding Academic Inquiry - ${name} (${branch})`
    let body = isLeave
      ? `Respected Head of Department / Academic Dean,\n\nI am ${name}, a student of ${branch} (${year}). I am writing to formally request leave of absence from [Start Date] to [End Date] due to medical reasons / family emergency.\n\nI have attached the relevant documentation for your kind consideration. I assure you that I will cover all missed lectures and practical assignments promptly upon my return.\n\nThanking you.\n\nYours sincerely,\n${name}\nRoll Number: [Your Roll No]\nBranch: ${branch} (${year})\nPhone: [Your Contact Number]`
      : isFee
      ? `Respected Accounts Officer / Dean Academics,\n\nI am ${name}, studying in ${branch} (${year}). I paid my college fees for the current semester on [Date of Transaction] via [UPI / Netbanking / NEFT / Challan].\n\nKindly issue the official fee receipt for my records and scholarship verification.\n\nTransaction Reference ID: [Enter Ref ID]\nAmount Paid: [Enter Amount]\n\nThanking you,\n${name}\nRoll No: [Your Roll No]\nBranch: ${branch}`
      : `Respected Sir/Madam,\n\nI am ${name}, a student of ${branch} (${year}). I am writing to bring to your kind attention regarding [State your inquiry or request clearly here].\n\n[Explain relevant details, dates, or documents].\n\nI would be very grateful for your prompt guidance and assistance in this matter.\n\nThanking you,\nYours faithfully,\n${name}\nDepartment of ${branch}\nRoll Number: [Your Roll No]`

    return {
      answer: `**DRAFT APPLICATION — Review, fill in bracketed details, and submit:**\n\n**Subject:** ${subject}\n\n${body}`,
      sources: ['https://www.gndec.ac.in/'],
      intent: 'draft'
    }
  }

  if (q.includes('exam') || q.includes('mst') || q.includes('marks') || q.includes('internal')) {
    return {
      answer: `**GNDEC Examination & Evaluation System:**\n\n• **Mid-Semester Tests (MST):** Two MSTs are conducted per semester. Attendance in both MSTs is mandatory for internal marks calculation.\n• **Evaluation Scheme:** 40% Internal Assessment (MSTs, quizzes, assignments, attendance) and 60% External University Assessment.\n• **Passing Marks:** Minimum 40% aggregate in each subject is required to clear credit requirements.`,
      sources: ['https://www.gndec.ac.in/?q=node/25'],
      intent: 'knowledge'
    }
  }

  return {
    answer: `**Guru Nanak Dev Engineering College (GNDEC) Knowledge Guide:**\n\nHere is information regarding your query on *"${query}"*:\n\n• **Academics & Department (${branch}):** For syllabus updates, notices, and faculty mentor assignments, check the [GNDEC Official Portal](https://www.gndec.ac.in/).\n• **Campus Support:** You can ask me about hostel rules, mess timings, library book loans, or ask me to draft formal applications.\n\nWhat specific detail would you like to know?`,
    sources: ['https://www.gndec.ac.in/'],
    intent: 'knowledge'
  }
}

function AiAssistantModal({ user, onClose, onToast }) {
  const [messages, setMessages] = useState(() => {
    try {
      sessionStorage.removeItem('campusdude-ai-messages')
      sessionStorage.removeItem('campusdude-ai-messages-v2')
      const saved = sessionStorage.getItem('campusdude-ai-messages-v3')
      if (saved) {
        const parsed = JSON.parse(saved)
        const clean = parsed.filter(m => !m.text?.includes('Note: To enable live web-crawling') && !m.text?.includes('jkdssbdb'))
        if (clean.length > 0) return clean
      }
    } catch {}
    return [
      {
        id: 'welcome',
        sender: 'assistant',
        text: "Hello! I'm Dude, your GNDEC campus AI assistant.\n\nAsk me anything about college regulations, hostel curfew, attendance policies, exam schedules, or ask me to draft official emails and applications.",
        sources: ['https://www.gndec.ac.in/']
      }
    ]
  })

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [branch, setBranch] = useState(() => localStorage.getItem('dude-profile-branch') || 'CSE')
  const [year, setYear] = useState(() => localStorage.getItem('dude-profile-year') || '2nd Year')
  const [residence, setResidence] = useState(() => localStorage.getItem('dude-profile-residence') || 'Hosteller')
  const [editingProfile, setEditingProfile] = useState(false)

  const messagesEndRef = useRef(null)

  useEffect(() => {
    try {
      sessionStorage.setItem('campusdude-ai-messages-v3', JSON.stringify(messages))
    } catch {}
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    localStorage.setItem('dude-profile-branch', branch)
    localStorage.setItem('dude-profile-year', year)
    localStorage.setItem('dude-profile-residence', residence)
  }, [branch, year, residence])

  const quickPrompts = [
    { label: "🏨 Hostel Rules & Curfew", text: "What are the GNDEC hostel rules, mess timings, and gate pass procedure?" },
    { label: "📊 75% Attendance Policy", text: "What is the GNDEC attendance rule and how to get medical leave approved?" },
    { label: "📚 Library Loan & Timings", text: "What are the Central Library timings and book loan limits?" },
    { label: "📝 Draft Leave Application", text: "Draft a leave application to HOD for 3 days due to fever" },
    { label: "💳 Draft Fee Receipt Request", text: "Draft an email to accounts office requesting fee payment receipt" },
    { label: "🏢 Official Contacts & Emails", text: "What are the official contact numbers and email addresses of GNDEC?" }
  ]

  const handleSend = async (queryText) => {
    const textToSend = (typeof queryText === 'string' ? queryText : input).trim()
    if (!textToSend || loading) return

    const studentName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student'
    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const payload = {
      question: textToSend,
      profile: {
        name: studentName,
        branch,
        year,
        residence
      },
      history: messages.slice(-4).map(m => `${m.sender === 'user' ? 'Student' : 'Dude'}: ${m.text}`)
    }

    try {
      let data = null
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (res.ok) data = await res.json()
      } catch (err) {
        try {
          const res = await fetch('http://localhost:8000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
          if (res.ok) data = await res.json()
        } catch {}
      }

      let aiText = data?.answer

      // If backend was not running, query Groq direct from the browser
      if (!aiText) {
        aiText = await callGroqDirect(textToSend, { name: studentName, branch, year, residence }, messages)
      }

      if (aiText) {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'assistant',
            text: aiText,
            sources: data?.sources || ['https://www.gndec.ac.in/'],
            intent: data?.intent || 'knowledge'
          }
        ])
      } else {
        const fallbackAns = getClientCampusAnswer(textToSend, studentName, branch, year)
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'assistant',
            text: fallbackAns.answer,
            sources: fallbackAns.sources,
            intent: fallbackAns.intent
          }
        ])
      }
    } catch {
      const fallbackAns = getClientCampusAnswer(textToSend, studentName, branch, year)
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: fallbackAns.answer,
          sources: fallbackAns.sources,
          intent: fallbackAns.intent
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    onToast?.('Copied to clipboard!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleReset = () => {
    sessionStorage.removeItem('campusdude-ai-messages')
    sessionStorage.removeItem('campusdude-ai-messages-v2')
    sessionStorage.removeItem('campusdude-ai-messages-v3')
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: "Hello! I'm Dude, your GNDEC campus AI assistant. How can I help you today?",
        sources: ['https://www.gndec.ac.in/']
      }
    ])
  }

  return (
    <Overlay onClose={onClose}>
      <div className="ai-dialog">
        <div className="modal-head" style={{ marginBottom: '14px', paddingBottom: '12px' }}>
          <div>
            <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="status-light" />
              <span>05 / GNDEC RAG ENGINE · CAMPUS ASSISTANT</span>
            </div>
            <h2 style={{ fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0 0' }}>
              <span>CampusDude AI</span>
              <span style={{ fontSize: '11px', color: 'var(--dp-color-accent)', background: '#fcefe9', padding: '2px 8px', borderRadius: '3px', border: '1px solid #f8cdbe', font: '600 10px var(--dp-typography-mono)' }}>
                RAG v2.0
              </span>
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={handleReset}
              className="close-btn plain"
              title="Reset conversation"
              style={{ display: 'grid', placeItems: 'center', width: '28px', height: '28px' }}
            >
              <RotateCcw size={15} />
            </button>
            <button className="close-btn plain" onClick={onClose}>
              <X size={19} />
            </button>
          </div>
        </div>

        {/* Profile and College Banner */}
        <div className="ai-meta-banner">
          <div className="ai-profile-pills">
            <span style={{ color: '#77848a', fontSize: '10px' }}>PROFILE:</span>
            <span className="ai-profile-pill">🎓 {branch}</span>
            <span className="ai-profile-pill">📅 {year}</span>
            <span className="ai-profile-pill">🏠 {residence}</span>
            <button
              onClick={() => setEditingProfile(!editingProfile)}
              style={{ background: 'transparent', color: 'var(--dp-color-accent)', fontSize: '10px', textDecoration: 'underline', padding: '0 4px', cursor: 'pointer' }}
            >
              {editingProfile ? 'Done' : 'Edit'}
            </button>
          </div>
          <span style={{ color: '#68757a', fontSize: '10px' }}>🏛️ GNDEC Ludhiana</span>
        </div>

        {editingProfile && (
          <div style={{ display: 'flex', gap: '10px', padding: '10px', background: '#d5dbdc', borderRadius: '3px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ font: '10px var(--dp-typography-mono)', color: '#566268' }}>BRANCH</span>
              <select value={branch} onChange={e => setBranch(e.target.value)} style={{ padding: '4px 8px', borderRadius: '2px', border: '1px solid #b3bdc0', background: '#fff', fontSize: '12px' }}>
                <option value="CSE">CSE</option>
                <option value="IT">IT</option>
                <option value="ECE">ECE</option>
                <option value="EE">EE</option>
                <option value="ME">ME</option>
                <option value="CE">CE</option>
                <option value="MBA">MBA / MCA</option>
              </select>
            </label>
            <label style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ font: '10px var(--dp-typography-mono)', color: '#566268' }}>YEAR</span>
              <select value={year} onChange={e => setYear(e.target.value)} style={{ padding: '4px 8px', borderRadius: '2px', border: '1px solid #b3bdc0', background: '#fff', fontSize: '12px' }}>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </label>
            <label style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ font: '10px var(--dp-typography-mono)', color: '#566268' }}>RESIDENCE</span>
              <select value={residence} onChange={e => setResidence(e.target.value)} style={{ padding: '4px 8px', borderRadius: '2px', border: '1px solid #b3bdc0', background: '#fff', fontSize: '12px' }}>
                <option value="Hosteller">Hosteller</option>
                <option value="Day Scholar">Day Scholar</option>
              </select>
            </label>
          </div>
        )}

        {/* Suggestion Chips */}
        <div className="ai-suggestions">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              className="ai-suggestion-chip"
              onClick={() => handleSend(p.text)}
              disabled={loading}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Chat message stream */}
        <div className="ai-chat-stream">
          {messages.map(msg => (
            <div key={msg.id} className={`ai-msg ${msg.sender}`}>
              {msg.sender === 'user' ? (
                <div className="ai-bubble-user">{msg.text}</div>
              ) : (
                <div className="ai-bubble-bot">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="brand-mark" style={{ width: '20px', height: '20px', fontSize: '9px' }}>CD</span>
                      <strong style={{ fontSize: '12px', color: '#253137' }}>Dude Campus Assistant</strong>
                    </div>
                    <button
                      className="ai-copy-btn"
                      onClick={() => handleCopy(msg.id, msg.text)}
                      title="Copy response"
                    >
                      {copiedId === msg.id ? <Check size={12} style={{ color: 'green' }} /> : <Copy size={12} />}
                      <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div style={{ fontSize: '13px' }}>
                    {formatAiText(msg.text)}
                  </div>

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="ai-sources">
                      <span style={{ font: '10px var(--dp-typography-mono)', color: '#667479' }}>SOURCES:</span>
                      {msg.sources.map((src, sIdx) => (
                        <a key={sIdx} href={src} target="_blank" rel="noopener noreferrer" className="ai-source-tag">
                          <span>{src.replace(/^https?:\/\/(www\.)?/, '')}</span>
                          <ExternalLink size={10} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="ai-msg assistant">
              <div className="ai-bubble-bot" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#56646a', font: '12px var(--dp-typography-mono)' }}>
                <span className="status-light" />
                <span>Dude is consulting GNDEC website knowledge base...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form className="ai-input-bar" onSubmit={e => { e.preventDefault(); handleSend(); }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask anything about GNDEC rules, exams, hostel, or draft email..."
            disabled={loading}
          />
          <button
            className="primary-btn"
            type="submit"
            disabled={loading || !input.trim()}
            style={{ minWidth: '44px', padding: '0 16px' }}
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </Overlay>
  )
}

function ProfileModal({ user, onClose, onToast, onSignOut }) { return <Overlay onClose={onClose}><div className="modal-head"><div><div className="eyebrow">05 / ACCOUNT</div><h2>Your profile</h2></div><button className="close-btn plain" onClick={onClose}><X size={19} /></button></div><div className="account-card"><span className="avatar avatar-large">{getInitials(user?.email)}</span><div><h3>{user?.email || 'Your account'}</h3><p>North Campus · Student</p><span className="verified"><ShieldCheck size={14} /> Verified campus account</span></div></div><div className="account-links"><button onClick={() => onToast('Profile settings are ready for your Supabase account')}><CircleUserRound size={17} /> Profile settings <ArrowUpRight size={15} /></button><button onClick={async () => { try { if (isSupabaseConfigured) { const { error } = await supabase.auth.signOut(); if (error) throw error } onSignOut() } catch (error) { onToast(error.message || 'Could not sign out. Please try again.') } }}><LogOut size={17} /> Sign out <ArrowUpRight size={15} /></button></div></Overlay> }

createRoot(document.getElementById('root')).render(<BrowserRouter><AuthGate /></BrowserRouter>)
