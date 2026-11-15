import React, { useState, useEffect, useMemo } from 'react'
import {
  Users, Plus, Search, MessageSquare, Heart, ExternalLink,
  Code2, Rocket, Check, X, Lock, Globe, UserCheck, UserPlus,
  SlidersHorizontal, Send, ThumbsUp, ArrowRight, ArrowUpRight,
  Sparkles, Layers, BookOpen, Share2, Shield, Calendar, AlertCircle
} from 'lucide-react'
import { CollabsService, INITIAL_COMMUNITIES } from '../lib/collabsService'

const COMMUNITY_CATEGORIES = [
  'All Communities',
  'Coding & Programming',
  'AI & Machine Learning',
  'Web Development',
  'App Development',
  'Competitive Programming',
  'Hackathons & Innovation',
  'College Academics',
  'Project Collaboration'
]

const PROJECT_CATEGORIES = [
  'All Categories',
  'AI/ML',
  'Web Development',
  'App Development',
  'Robotics',
  'Hackathon Projects',
  'Open Source'
]

const PRESET_COVERS = [
  { label: 'Code & Dev', url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=700&q=80' },
  { label: 'AI & Data', url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=700&q=80' },
  { label: 'Web Tech', url: 'https://images.unsplash.com/photo-1593720213428-28a5b9e94613?auto=format&fit=crop&w=700&q=80' },
  { label: 'Mobile Apps', url: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=700&q=80' },
  { label: 'Innovation', url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=700&q=80' },
  { label: 'Teamwork', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=700&q=80' }
]

export default function CollabsModule({ user, onToast }) {
  const [activeTab, setActiveTab] = useState('discover') // 'discover', 'my-groups', 'projects', 'discussions'
  const [communities, setCommunities] = useState([])
  const [posts, setPosts] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Communities')
  const [selectedProjectCategory, setSelectedProjectCategory] = useState('All Categories')

  // Modals & Active Views
  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [selectedCommunity, setSelectedCommunity] = useState(null)
  const [activeCommentsPostId, setActiveCommentsPostId] = useState(null)
  const [postComments, setPostComments] = useState({})
  const [newCommentText, setNewCommentText] = useState('')
  const [collaborateProject, setCollaborateProject] = useState(null)

  // Load initial data
  const loadData = async () => {
    setLoading(true)
    try {
      const [comms, postList, projList] = await Promise.all([
        CollabsService.getCommunities(user?.id),
        CollabsService.getPosts(null, user?.id),
        CollabsService.getProjects()
      ])
      setCommunities(comms)
      setPosts(postList)
      setProjects(projList)
    } catch (err) {
      console.error('Error loading collabs data:', err)
      onToast?.('Loaded local community data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.id])

  // Filtered communities
  const filteredCommunities = useMemo(() => {
    return communities.filter(c => {
      const matchText = `${c.name} ${c.description} ${c.category}`.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCat = selectedCategory === 'All Communities' || c.category === selectedCategory
      const matchTab = activeTab !== 'my-groups' || c.is_member || c.is_admin
      return matchText && matchCat && matchTab
    })
  }, [communities, searchQuery, selectedCategory, activeTab])

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchText = `${p.title} ${p.description} ${(p.required_skills || []).join(' ')}`.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCat = selectedProjectCategory === 'All Categories' || p.category === selectedProjectCategory
      return matchText && matchCat
    })
  }, [projects, searchQuery, selectedProjectCategory])

  // Handle Join/Leave Community
  const handleToggleMembership = async (e, community) => {
    e.stopPropagation()
    if (!user) {
      onToast?.('Please sign in to join student communities.')
      return
    }

    try {
      if (community.is_member) {
        await CollabsService.leaveCommunity(community.id, user.id)
        setCommunities(prev => prev.map(c => c.id === community.id ? { ...c, is_member: false, member_count: Math.max(1, (c.member_count || 1) - 1) } : c))
        if (selectedCommunity?.id === community.id) {
          setSelectedCommunity(prev => ({ ...prev, is_member: false, member_count: Math.max(1, (prev.member_count || 1) - 1) }))
        }
        onToast?.(`Left ${community.name}`)
      } else {
        const isPrivate = community.visibility === 'private'
        const res = await CollabsService.joinCommunity(community.id, user.id, isPrivate)
        if (res.status === 'pending') {
          onToast?.(`Join request sent to ${community.name} admin.`)
        } else {
          setCommunities(prev => prev.map(c => c.id === community.id ? { ...c, is_member: true, member_count: (c.member_count || 0) + 1 } : c))
          if (selectedCommunity?.id === community.id) {
            setSelectedCommunity(prev => ({ ...prev, is_member: true, member_count: (prev.member_count || 0) + 1 }))
          }
          onToast?.(`Joined ${community.name}!`)
        }
      }
    } catch (err) {
      onToast?.(err.message || 'Could not update membership.')
    }
  }

  // Handle Post Like
  const handleLikePost = async (postId) => {
    if (!user) {
      onToast?.('Sign in to like discussions.')
      return
    }

    try {
      const isLiked = await CollabsService.toggleLike(postId, user.id)
      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p,
        is_liked: isLiked,
        likes_count: Math.max(0, (p.likes_count || 0) + (isLiked ? 1 : -1))
      } : p))
    } catch (err) {
      console.error('Like error:', err)
    }
  }

  // Handle Comments expansion & fetching
  const handleOpenComments = async (postId) => {
    if (activeCommentsPostId === postId) {
      setActiveCommentsPostId(null)
      return
    }
    setActiveCommentsPostId(postId)
    if (!postComments[postId]) {
      const comments = await CollabsService.getComments(postId)
      setPostComments(prev => ({ ...prev, [postId]: comments }))
    }
  }

  // Handle Adding a Comment
  const handleAddComment = async (e, postId) => {
    e.preventDefault()
    if (!newCommentText.trim() || !user) return

    const comment = await CollabsService.addComment(postId, newCommentText, user)
    if (comment) {
      setPostComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), comment]
      }))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p))
      setNewCommentText('')
      onToast?.('Comment posted.')
    }
  }

  return (
    <div className="collabs-root">
      {/* Collabs Hero / Header */}
      <section className="collabs-hero">
        <div className="collabs-hero-content">
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="status-light" />
            <span>CAMPUSDUDE COLLABS // STUDENT COMMUNITY</span>
          </div>
          <h1>Collabs</h1>
          <p className="collabs-subtitle">Connect. Share. Create Together.</p>
          <span className="collabs-tagline-desc">
            Discover peer study groups, tech clubs, hackathon squads, and project collaborators right inside GNDEC.
          </span>
        </div>

        <div className="collabs-hero-actions">
          <button
            className="primary-btn"
            onClick={() => {
              if (!user) {
                onToast?.('Please sign in to create a group.')
                return
              }
              setCreateGroupOpen(true)
            }}
            style={{ padding: '12px 18px', fontSize: '13px' }}
          >
            <Plus size={17} /> Create Group
          </button>
          <button
            className="secondary-btn"
            onClick={() => {
              if (!user) {
                onToast?.('Please sign in to publish a project idea.')
                return
              }
              setCreateProjectOpen(true)
            }}
            style={{ padding: '12px 16px', fontSize: '13px' }}
          >
            <Rocket size={16} /> Post Project Idea
          </button>
        </div>
      </section>

      {/* Main Tabs Navigation */}
      <div className="collabs-nav-tabs">
        <button
          className={`collabs-tab ${activeTab === 'discover' ? 'active' : ''}`}
          onClick={() => { setActiveTab('discover'); setSelectedCommunity(null); }}
        >
          <Globe size={15} />
          <span>Discover</span>
          <span className="collabs-tab-badge">{communities.length}</span>
        </button>

        <button
          className={`collabs-tab ${activeTab === 'my-groups' ? 'active' : ''}`}
          onClick={() => { setActiveTab('my-groups'); setSelectedCommunity(null); }}
        >
          <UserCheck size={15} />
          <span>My Groups</span>
          <span className="collabs-tab-badge">
            {communities.filter(c => c.is_member || c.is_admin).length}
          </span>
        </button>

        <button
          className={`collabs-tab ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => { setActiveTab('projects'); setSelectedCommunity(null); }}
        >
          <Rocket size={15} />
          <span>Project Hub</span>
          <span className="collabs-tab-badge">{projects.length}</span>
        </button>

        <button
          className={`collabs-tab ${activeTab === 'discussions' ? 'active' : ''}`}
          onClick={() => { setActiveTab('discussions'); setSelectedCommunity(null); }}
        >
          <MessageSquare size={15} />
          <span>Discussions</span>
          <span className="collabs-tab-badge">{posts.length}</span>
        </button>
      </div>

      {/* Control Bar: Search & Category Chips */}
      {activeTab !== 'discussions' && (
        <div className="collabs-controls">
          <div className="search-box" style={{ maxWidth: '480px' }}>
            <Search size={17} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'projects' ? 'Search projects, skills (e.g. React, Python, ROS)...' : 'Search communities by name, topic, or keyword...'}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'transparent', color: '#909ba0', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {activeTab === 'projects' ? (
            <div className="collabs-pills-row">
              {PROJECT_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={`collabs-pill ${selectedProjectCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedProjectCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          ) : (
            <div className="collabs-pills-row">
              {COMMUNITY_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={`collabs-pill ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 1 & 2: DISCOVER & MY GROUPS                               */}
      {/* ------------------------------------------------------------- */}
      {(activeTab === 'discover' || activeTab === 'my-groups') && (
        <>
          <div className="result-row" style={{ marginBottom: '16px' }}>
            <span>{filteredCommunities.length} COMMUNITIES {activeTab === 'my-groups' ? 'JOINED BY YOU' : 'ACTIVE ON CAMPUS'}</span>
            <span style={{ font: '10px var(--dp-typography-mono)', color: '#748187' }}>VERIFIED GNDEC CLUBS</span>
          </div>

          {filteredCommunities.length === 0 ? (
            <div className="empty-state">
              <Users size={32} style={{ opacity: 0.5, marginBottom: '10px' }} />
              <h3>{activeTab === 'my-groups' ? 'You have not joined any communities yet' : 'No communities found'}</h3>
              <p>
                {activeTab === 'my-groups'
                  ? 'Explore public groups in the Discover tab and join groups that match your interests.'
                  : 'Try searching for different keywords or create a new student group!'}
              </p>
              {activeTab === 'my-groups' && (
                <button
                  className="primary-btn"
                  onClick={() => setActiveTab('discover')}
                  style={{ marginTop: '16px' }}
                >
                  Browse Communities
                </button>
              )}
            </div>
          ) : (
            <div className="collabs-grid">
              {filteredCommunities.map(community => (
                <article
                  key={community.id}
                  className="collabs-card"
                  onClick={() => setSelectedCommunity(community)}
                >
                  {/* Card Cover */}
                  <div className="collabs-card-cover">
                    <img
                      src={community.image_url || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=700&q=80'}
                      alt={community.name}
                      loading="lazy"
                    />
                    <div className="collabs-card-overlay" />
                    <span className="collabs-card-category">{community.category}</span>
                    <span className={`collabs-card-vis ${community.visibility}`}>
                      {community.visibility === 'private' ? <Lock size={10} /> : <Globe size={10} />}
                      {community.visibility.toUpperCase()}
                    </span>
                  </div>

                  {/* Card Info */}
                  <div className="collabs-card-body">
                    <div className="collabs-card-head">
                      <h3>{community.name}</h3>
                      {community.is_admin && <span className="collabs-role-badge admin">ADMIN</span>}
                      {community.is_member && !community.is_admin && <span className="collabs-role-badge member">MEMBER</span>}
                    </div>

                    <p className="collabs-card-desc">{community.description}</p>

                    <div className="collabs-card-footer">
                      <div className="collabs-members-count">
                        <Users size={14} />
                        <strong>{community.member_count ?? 0}</strong>
                        <span>{(community.member_count === 1) ? 'member' : 'members'}</span>
                      </div>

                      <button
                        className={`collabs-join-btn ${community.is_member ? 'joined' : ''}`}
                        onClick={(e) => handleToggleMembership(e, community)}
                      >
                        {community.is_member ? (
                          <>
                            <Check size={13} />
                            <span>Joined</span>
                          </>
                        ) : (
                          <>
                            <UserPlus size={13} />
                            <span>{community.visibility === 'private' ? 'Request' : 'Join'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: PROJECTS COLLABORATION HUB                             */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'projects' && (
        <>
          <div className="result-row" style={{ marginBottom: '16px' }}>
            <span>{filteredProjects.length} OPEN COLLABORATION PROJECTS</span>
            <button
              className="primary-btn"
              onClick={() => {
                if (!user) {
                  onToast?.('Please sign in to publish your project idea.')
                  return
                }
                setCreateProjectOpen(true)
              }}
              style={{ padding: '8px 12px', fontSize: '11px' }}
            >
              <Plus size={14} /> Post Project Idea
            </button>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="empty-state">
              <Rocket size={32} style={{ opacity: 0.5, marginBottom: '10px' }} />
              <h3>No collaboration projects match your search</h3>
              <p>Be the first to publish a project idea and invite teammates!</p>
            </div>
          ) : (
            <div className="collabs-projects-grid">
              {filteredProjects.map(project => (
                <article key={project.id} className="collabs-project-card">
                  <div className="collabs-project-head">
                    <span className="collabs-project-tag">{project.category}</span>
                    <span className="collabs-status-pill open">● OPEN FOR COLLABORATION</span>
                  </div>

                  <h3>{project.title}</h3>
                  <p>{project.description}</p>

                  {/* Skills badges */}
                  <div className="collabs-skills-container">
                    <span style={{ font: '10px var(--dp-typography-mono)', color: '#748187', alignSelf: 'center' }}>SKILLS:</span>
                    {(project.required_skills || []).map((skill, sIdx) => (
                      <span key={sIdx} className="collabs-skill-chip">{skill}</span>
                    ))}
                  </div>

                  <div className="collabs-project-bottom">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="avatar avatar-small">
                        {(project.author_name || 'S').slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <strong style={{ fontSize: '12px', color: '#253137', display: 'block' }}>{project.author_name}</strong>
                        <small style={{ fontSize: '10px', color: '#77848a' }}>{project.author_branch || 'Creator'}</small>
                      </div>
                    </div>

                    <button
                      className="primary-btn"
                      onClick={() => setCollaborateProject(project)}
                      style={{ padding: '7px 12px', fontSize: '11px' }}
                    >
                      Collaborate <ArrowUpRight size={13} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: DISCUSSIONS FEED                                        */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'discussions' && (
        <div className="collabs-discussions-layout">
          {/* Post Compose Box */}
          <div className="collabs-compose-card">
            <div className="eyebrow" style={{ marginBottom: '8px' }}>
              <span>SHARE WITH THE CAMPUS COMMUNITY</span>
            </div>
            <CreatePostForm
              user={user}
              communities={communities}
              onPostCreated={(newP) => {
                setPosts(prev => [newP, ...prev])
                onToast?.('Post published to community!')
              }}
              onToast={onToast}
            />
          </div>

          {/* Posts Feed */}
          <div className="collabs-posts-stream">
            {posts.map(post => (
              <article key={post.id} className="collabs-post-card">
                <div className="collabs-post-header">
                  <span className="avatar avatar-small">{post.author_initials || 'ST'}</span>
                  <div>
                    <strong style={{ fontSize: '13px', color: '#253137' }}>{post.author_name}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#778489' }}>
                      <span>in {post.community_name || 'Community'}</span>
                      <span>·</span>
                      <span style={{ font: '10px var(--dp-typography-mono)' }}>Recently</span>
                    </div>
                  </div>
                  <span className={`collabs-post-cat-badge ${post.category?.toLowerCase()}`}>
                    {post.category || 'Discussion'}
                  </span>
                </div>

                {post.title && <h3 className="collabs-post-title">{post.title}</h3>}
                <p className="collabs-post-content">{post.content}</p>

                {post.link_url && (
                  <a
                    href={post.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="collabs-post-link-card"
                  >
                    <ExternalLink size={14} />
                    <span>{post.link_url}</span>
                  </a>
                )}

                <div className="collabs-post-actions">
                  <button
                    className={`collabs-action-btn ${post.is_liked ? 'liked' : ''}`}
                    onClick={() => handleLikePost(post.id)}
                  >
                    <Heart size={15} fill={post.is_liked ? 'currentColor' : 'none'} />
                    <span>{post.likes_count || 0} Likes</span>
                  </button>

                  <button
                    className="collabs-action-btn"
                    onClick={() => handleOpenComments(post.id)}
                  >
                    <MessageSquare size={15} />
                    <span>{post.comments_count || 0} Comments</span>
                  </button>
                </div>

                {/* Comments Thread */}
                {activeCommentsPostId === post.id && (
                  <div className="collabs-comments-thread">
                    <div className="collabs-comments-list">
                      {(postComments[post.id] || []).length === 0 ? (
                        <p style={{ margin: 0, fontSize: '12px', color: '#79858a', fontStyle: 'italic' }}>
                          No comments yet. Start the conversation!
                        </p>
                      ) : (
                        (postComments[post.id] || []).map(comment => (
                          <div key={comment.id} className="collabs-comment-item">
                            <span className="avatar" style={{ width: '22px', height: '22px', fontSize: '9px' }}>
                              {comment.author_initials || 'ST'}
                            </span>
                            <div className="collabs-comment-bubble">
                              <strong>{comment.author_name}</strong>
                              <p>{comment.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <form
                      className="collabs-comment-form"
                      onSubmit={(e) => handleAddComment(e, post.id)}
                    >
                      <input
                        value={newCommentText}
                        onChange={e => setNewCommentText(e.target.value)}
                        placeholder="Write a comment..."
                      />
                      <button className="primary-btn" type="submit" disabled={!newCommentText.trim()}>
                        <Send size={13} />
                      </button>
                    </form>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* COMMUNITY DETAIL MODAL                                        */}
      {/* ------------------------------------------------------------- */}
      {selectedCommunity && (
        <CommunityDetailModal
          community={selectedCommunity}
          user={user}
          posts={posts.filter(p => p.community_id === selectedCommunity.id)}
          onClose={() => setSelectedCommunity(null)}
          onToggleMembership={(e) => handleToggleMembership(e, selectedCommunity)}
          onPostCreated={(newP) => {
            setPosts(prev => [newP, ...prev])
            onToast?.('Post published in this community!')
          }}
          onLikePost={handleLikePost}
          onToast={onToast}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* CREATE GROUP MODAL                                            */}
      {/* ------------------------------------------------------------- */}
      {createGroupOpen && (
        <CreateGroupModal
          user={user}
          onClose={() => setCreateGroupOpen(false)}
          onCreated={(newComm) => {
            setCommunities(prev => [newComm, ...prev])
            setCreateGroupOpen(false)
            onToast?.(`Group "${newComm.name}" created successfully!`)
          }}
          onToast={onToast}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* CREATE PROJECT MODAL                                          */}
      {/* ------------------------------------------------------------- */}
      {createProjectOpen && (
        <CreateProjectModal
          user={user}
          onClose={() => setCreateProjectOpen(false)}
          onCreated={(newProj) => {
            setProjects(prev => [newProj, ...prev])
            setCreateProjectOpen(false)
            onToast?.(`Project idea "${newProj.title}" posted to Project Hub!`)
          }}
          onToast={onToast}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* COLLABORATE REACH-OUT MODAL                                   */}
      {/* ------------------------------------------------------------- */}
      {collaborateProject && (
        <CollaborateModal
          project={collaborateProject}
          user={user}
          onClose={() => setCollaborateProject(null)}
          onToast={onToast}
        />
      )}
    </div>
  )
}

// ==============================================================================
// SUBCOMPONENTS: MODALS & FORMS
// ==============================================================================

function CreatePostForm({ user, communities, defaultCommunityId, onPostCreated, onToast }) {
  const [communityId, setCommunityId] = useState(defaultCommunityId || communities[0]?.id || '')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('Discussion')
  const [linkUrl, setLinkUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim()) {
      onToast?.('Please write some content for your post.')
      return
    }
    if (!user) {
      onToast?.('Sign in to publish posts.')
      return
    }

    setSubmitting(true)
    try {
      const newPost = await CollabsService.createPost({
        community_id: communityId || defaultCommunityId || communities[0]?.id,
        title: title.trim(),
        content: content.trim(),
        category,
        link_url: linkUrl.trim() || null
      }, user)

      if (newPost) {
        onPostCreated?.(newPost)
        setTitle('')
        setContent('')
        setLinkUrl('')
      }
    } catch (err) {
      onToast?.(err.message || 'Could not publish post.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="collabs-post-form" onSubmit={handleSubmit}>
      {!defaultCommunityId && (
        <div className="collabs-form-row">
          <label>
            <span>COMMUNITY</span>
            <select value={communityId} onChange={e => setCommunityId(e.target.value)}>
              {communities.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>POST TYPE</span>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="Discussion">Discussion</option>
              <option value="Resource">Resource / Link</option>
              <option value="Question">Academic Question</option>
              <option value="Idea">Project Idea</option>
            </select>
          </label>
        </div>
      )}

      <input
        className="collabs-input"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Post Title (optional)..."
      />

      <textarea
        className="collabs-textarea"
        rows={3}
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Share ideas, questions, code snippets, or collaboration proposals with fellow students..."
        required
      />

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          className="collabs-input"
          style={{ flex: 1 }}
          value={linkUrl}
          onChange={e => setLinkUrl(e.target.value)}
          placeholder="Resource link (e.g. GitHub, Google Drive, Docs URL)..."
        />

        <button
          className="primary-btn"
          type="submit"
          disabled={submitting || !content.trim()}
          style={{ padding: '10px 16px' }}
        >
          {submitting ? 'Publishing...' : 'Publish'} <Send size={14} />
        </button>
      </div>
    </form>
  )
}

function CommunityDetailModal({ community, user, posts, onClose, onToggleMembership, onPostCreated, onLikePost, onToast }) {
  const [detailTab, setDetailTab] = useState('discussions') // 'discussions', 'about', 'members'

  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="collabs-dialog-large">
        {/* Cover Header */}
        <div className="collabs-detail-cover">
          <img src={community.image_url} alt={community.name} />
          <div className="collabs-detail-overlay" />
          <button className="close-btn" onClick={onClose}><X size={18} /></button>

          <div className="collabs-detail-title-box">
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
              <span className="collabs-card-category">{community.category}</span>
              <span className={`collabs-card-vis ${community.visibility}`}>
                {community.visibility === 'private' ? <Lock size={10} /> : <Globe size={10} />}
                {community.visibility.toUpperCase()}
              </span>
            </div>
            <h2>{community.name}</h2>
            <p>{community.description}</p>
          </div>
        </div>

        {/* Action bar & tabs */}
        <div className="collabs-detail-action-bar">
          <div className="collabs-detail-tabs">
            <button
              className={detailTab === 'discussions' ? 'active' : ''}
              onClick={() => setDetailTab('discussions')}
            >
              Discussions ({posts.length})
            </button>
            <button
              className={detailTab === 'about' ? 'active' : ''}
              onClick={() => setDetailTab('about')}
            >
              About & Rules
            </button>
            <button
              className={detailTab === 'members' ? 'active' : ''}
              onClick={() => setDetailTab('members')}
            >
              Members ({community.member_count ?? 0})
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: '#68757a', font: '11px var(--dp-typography-mono)' }}>
              {community.created_by === 'system' ? 'CAMPUS CHANNEL' : `ADMIN: ${community.admin_name || 'Student Admin'}`}
            </span>
            <button
              className={`collabs-join-btn ${community.is_member ? 'joined' : ''}`}
              onClick={onToggleMembership}
            >
              {community.is_member ? <><Check size={13} /> Joined</> : <><UserPlus size={13} /> Join Group</>}
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="collabs-detail-body">
          {detailTab === 'discussions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {community.is_member ? (
                <div style={{ padding: '16px', background: '#e0e5e6', borderRadius: '4px', border: '1px solid #b8c1c4' }}>
                  <CreatePostForm
                    user={user}
                    defaultCommunityId={community.id}
                    onPostCreated={onPostCreated}
                    onToast={onToast}
                  />
                </div>
              ) : (
                <div className="sidebar-note" style={{ margin: 0 }}>
                  <AlertCircle size={16} />
                  <div>
                    <strong>Join to participate in discussions</strong>
                    <span>Members can share resources, ask technical questions, and propose projects.</span>
                  </div>
                </div>
              )}

              {posts.length === 0 ? (
                <div className="empty-state" style={{ padding: '36px 12px' }}>
                  <MessageSquare size={28} style={{ opacity: 0.4, marginBottom: '6px' }} />
                  <h4 style={{ margin: '4px 0', fontSize: '14px' }}>No discussions in this group yet</h4>
                  <p style={{ fontSize: '12px', margin: 0 }}>Be the first member to start a discussion thread!</p>
                </div>
              ) : (
                posts.map(post => (
                  <article key={post.id} className="collabs-post-card">
                    <div className="collabs-post-header">
                      <span className="avatar avatar-small">{post.author_initials || 'ST'}</span>
                      <div>
                        <strong style={{ fontSize: '13px', color: '#253137' }}>{post.author_name}</strong>
                        <div style={{ fontSize: '10px', color: '#778489', font: '10px var(--dp-typography-mono)' }}>Recently</div>
                      </div>
                      <span className={`collabs-post-cat-badge ${post.category?.toLowerCase()}`}>{post.category}</span>
                    </div>

                    {post.title && <h3 className="collabs-post-title">{post.title}</h3>}
                    <p className="collabs-post-content">{post.content}</p>

                    {post.link_url && (
                      <a href={post.link_url} target="_blank" rel="noopener noreferrer" className="collabs-post-link-card">
                        <ExternalLink size={14} />
                        <span>{post.link_url}</span>
                      </a>
                    )}

                    <div className="collabs-post-actions">
                      <button className={`collabs-action-btn ${post.is_liked ? 'liked' : ''}`} onClick={() => onLikePost(post.id)}>
                        <Heart size={14} fill={post.is_liked ? 'currentColor' : 'none'} />
                        <span>{post.likes_count || 0} Likes</span>
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

          {detailTab === 'about' && (
            <div className="collabs-about-pane">
              <h3>Community Guidelines & Purpose</h3>
              <p>{community.description}</p>

              <div className="collabs-rules-box">
                <h4>Rules of Conduct:</h4>
                <ul>
                  <li>Be respectful and constructive in all technical exchanges and project collaborations.</li>
                  <li>Do not spam promotion or unrelated commercial services.</li>
                  <li>Give proper credit when sharing code repositories, academic notes, or study materials.</li>
                  <li>Report any academic integrity violations or abusive behavior to group admins.</li>
                </ul>
              </div>
            </div>
          )}

          {detailTab === 'members' && (
            <div className="collabs-members-pane">
              {community.created_by !== 'system' ? (
                <div className="collabs-member-row">
                  <span className="avatar avatar-small">
                    {(community.admin_name || 'SA').slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <strong>{community.admin_name || 'Student Admin'}</strong>
                    <span style={{ fontSize: '11px', color: '#68757a' }}>Community Founder & Admin</span>
                  </div>
                  <span className="collabs-role-badge admin" style={{ marginLeft: 'auto' }}>ADMIN</span>
                </div>
              ) : (
                <div className="collabs-member-row">
                  <span className="avatar avatar-small">CC</span>
                  <div>
                    <strong>GNDEC Campus Community</strong>
                    <span style={{ fontSize: '11px', color: '#68757a' }}>Official college community channel</span>
                  </div>
                  <span className="collabs-role-badge admin" style={{ marginLeft: 'auto' }}>CAMPUS</span>
                </div>
              )}

              <div className="collabs-member-row">
                <span className="avatar avatar-small">
                  <Users size={14} />
                </span>
                <div>
                  <strong>Enrolled Students</strong>
                  <span style={{ fontSize: '11px', color: '#68757a' }}>
                    {(community.member_count || 0) > 0
                      ? `${community.member_count} active member${community.member_count > 1 ? 's' : ''}`
                      : 'No students enrolled yet. Be the first to join!'}
                  </span>
                </div>
                <span className="collabs-role-badge member" style={{ marginLeft: 'auto' }}>
                  {(community.member_count || 0) > 0 ? `${community.member_count} TOTAL` : 'EMPTY'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CreateGroupModal({ user, onClose, onCreated, onToast }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Coding & Programming')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [imageUrl, setImageUrl] = useState(PRESET_COVERS[0].url)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Group name is required.')
      return
    }
    if (!description.trim()) {
      setError('Please add a short description of what this group is for.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const newComm = await CollabsService.createCommunity({
        name: name.trim(),
        category,
        description: description.trim(),
        visibility,
        image_url: imageUrl
      }, user)

      onCreated(newComm)
    } catch (err) {
      setError(err.message || 'Could not create community.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="dialog" style={{ width: 'min(580px, 100%)' }}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">06 / NEW COMMUNITY</div>
            <h2>Create Student Group</h2>
          </div>
          <button className="close-btn plain" onClick={onClose}><X size={19} /></button>
        </div>

        {error && <div className="auth-message auth-error" style={{ marginBottom: '14px' }}>{error}</div>}

        <form className="listing-form" onSubmit={handleSubmit}>
          <label>
            Group Name
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. GNDEC Autonomous Drone Club"
            />
          </label>

          <div className="form-grid">
            <label>
              Category
              <select value={category} onChange={e => setCategory(e.target.value)}>
                {COMMUNITY_CATEGORIES.filter(c => c !== 'All Communities').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>

            <label>
              Visibility
              <select value={visibility} onChange={e => setVisibility(e.target.value)}>
                <option value="public">Public (Anyone can join)</option>
                <option value="private">Private (Join by request)</option>
              </select>
            </label>
          </div>

          <label>
            Description
            <textarea
              required
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What will members discuss, learn, or build together?"
            />
          </label>

          {/* Preset Cover Selector */}
          <label>
            Choose Cover Image
            <div className="collabs-preset-grid">
              {PRESET_COVERS.map((preset, idx) => (
                <div
                  key={idx}
                  className={`collabs-preset-item ${imageUrl === preset.url ? 'active' : ''}`}
                  onClick={() => setImageUrl(preset.url)}
                >
                  <img src={preset.url} alt={preset.label} />
                  <span>{preset.label}</span>
                </div>
              ))}
            </div>
          </label>

          <button className="primary-btn submit-btn" type="submit" disabled={submitting}>
            {submitting ? 'Creating group...' : 'Launch Community'} <ArrowUpRight size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}

function CreateProjectModal({ user, onClose, onCreated, onToast }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Web Development')
  const [description, setDescription] = useState('')
  const [requiredSkills, setRequiredSkills] = useState('')
  const [contactEmail, setContactEmail] = useState(user?.email || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      setError('Project title and description are required.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const newProj = await CollabsService.createProject({
        title: title.trim(),
        category,
        description: description.trim(),
        required_skills: requiredSkills,
        contact_email: contactEmail.trim()
      }, user)

      onCreated(newProj)
    } catch (err) {
      setError(err.message || 'Could not post project idea.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="dialog" style={{ width: 'min(580px, 100%)' }}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">07 / PROJECT COLLABORATION</div>
            <h2>Publish Project Idea</h2>
          </div>
          <button className="close-btn plain" onClick={onClose}><X size={19} /></button>
        </div>

        {error && <div className="auth-message auth-error" style={{ marginBottom: '14px' }}>{error}</div>}

        <form className="listing-form" onSubmit={handleSubmit}>
          <label>
            Project Title
            <input
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Smart Campus Navigation App"
            />
          </label>

          <div className="form-grid">
            <label>
              Domain / Category
              <select value={category} onChange={e => setCategory(e.target.value)}>
                {PROJECT_CATEGORIES.filter(c => c !== 'All Categories').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>

            <label>
              Contact Email
              <input
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                placeholder="your.email@gndec.edu"
              />
            </label>
          </div>

          <label>
            Required Skills (comma separated)
            <input
              value={requiredSkills}
              onChange={e => setRequiredSkills(e.target.value)}
              placeholder="e.g. React Native, Node.js, UI/UX, Mapbox API"
            />
          </label>

          <label>
            Project Description & Objectives
            <textarea
              required
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the problem you are solving, tech stack, and what teammates you are looking for..."
            />
          </label>

          <button className="primary-btn submit-btn" type="submit" disabled={submitting}>
            {submitting ? 'Publishing project...' : 'Publish to Project Hub'} <Rocket size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}

function CollaborateModal({ project, user, onClose, onToast }) {
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const handleSend = (e) => {
    e.preventDefault()
    setSent(true)
    setTimeout(() => {
      onToast?.(`Collaboration request sent to ${project.author_name}!`)
      onClose()
    }, 1200)
  }

  const copyEmail = () => {
    navigator.clipboard.writeText(project.contact_email || 'student@gndec.edu')
    onToast?.('Email copied to clipboard!')
  }

  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="dialog" style={{ width: 'min(500px, 100%)' }}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">COLLABORATION REQUEST</div>
            <h2 style={{ fontSize: '20px' }}>Join {project.title}</h2>
          </div>
          <button className="close-btn plain" onClick={onClose}><X size={19} /></button>
        </div>

        {sent ? (
          <div className="sent-state">
            <Check size={32} />
            <h3>Request Sent!</h3>
            <p>Your details and message were shared with {project.author_name}.</p>
          </div>
        ) : (
          <form className="listing-form" onSubmit={handleSend}>
            <div style={{ padding: '12px', background: '#dce2e3', borderRadius: '4px', fontSize: '12px', color: '#38454b', border: '1px solid #b7c1c4' }}>
              <strong>Project Lead:</strong> {project.author_name} ({project.contact_email || 'Verified GNDEC Student'})
              <div style={{ marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={copyEmail}
                  style={{ background: 'transparent', color: 'var(--dp-color-accent)', font: '11px var(--dp-typography-mono)', textDecoration: 'underline', padding: 0 }}
                >
                  Copy Contact Email ↗
                </button>
              </div>
            </div>

            <label>
              Your Skills & Introduction
              <textarea
                required
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Introduce yourself, your branch/year, what skills you bring to this project, and your availability..."
              />
            </label>

            <button className="primary-btn submit-btn" type="submit">
              Send Collaboration Proposal <Send size={15} />
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
