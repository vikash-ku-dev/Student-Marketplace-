import { supabase, isSupabaseConfigured } from './supabase'

// Real campus community categories without fabricated mock member numbers
export const INITIAL_COMMUNITIES = [
  {
    id: 'seed-comm-1',
    name: 'GNDEC Coders Guild',
    description: 'The core programming community at GNDEC. Algorithms, Data Structures, Git, and hands-on coding meetups.',
    category: 'Coding & Programming',
    image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=700&q=80',
    visibility: 'public',
    created_by: 'system',
    admin_name: 'Campus Community',
    member_count: 0,
    created_at: '2026-09-01T10:00:00Z'
  },
  {
    id: 'seed-comm-2',
    name: 'Neural Network & AI/ML Society',
    description: 'Exploring LLMs, computer vision, deep learning research papers, and Kaggle competitions.',
    category: 'AI & Machine Learning',
    image_url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=700&q=80',
    visibility: 'public',
    created_by: 'system',
    admin_name: 'Campus Community',
    member_count: 0,
    created_at: '2026-09-05T12:00:00Z'
  },
  {
    id: 'seed-comm-3',
    name: 'Full Stack Web Crafters',
    description: 'React, Next.js, Node.js, Tailwind, Supabase and cloud architecture. Weekly frontend showcases and code reviews.',
    category: 'Web Development',
    image_url: 'https://images.unsplash.com/photo-1593720213428-28a5b9e94613?auto=format&fit=crop&w=700&q=80',
    visibility: 'public',
    created_by: 'system',
    admin_name: 'Campus Community',
    member_count: 0,
    created_at: '2026-09-10T14:30:00Z'
  },
  {
    id: 'seed-comm-4',
    name: 'Mobile App Architects',
    description: 'Building native and cross-platform apps using Flutter, React Native, Kotlin & Swift. UI/UX design to Play Store launch.',
    category: 'App Development',
    image_url: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=700&q=80',
    visibility: 'public',
    created_by: 'system',
    admin_name: 'Campus Community',
    member_count: 0,
    created_at: '2026-09-15T09:00:00Z'
  },
  {
    id: 'seed-comm-5',
    name: 'Codeforces & LeetCode Daily',
    description: 'Daily competitive coding problems, dynamic programming patterns, graph theory, and interview problem practice.',
    category: 'Competitive Programming',
    image_url: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=700&q=80',
    visibility: 'public',
    created_by: 'system',
    admin_name: 'Campus Community',
    member_count: 0,
    created_at: '2026-09-20T16:00:00Z'
  },
  {
    id: 'seed-comm-6',
    name: 'Hackathon & SIH Innovators',
    description: 'Team formation, idea pitching, prototype building, and mentorship for Smart India Hackathon and national tech hackathons.',
    category: 'Hackathons & Innovation',
    image_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=700&q=80',
    visibility: 'public',
    created_by: 'system',
    admin_name: 'Campus Community',
    member_count: 0,
    created_at: '2026-09-25T11:00:00Z'
  },
  {
    id: 'seed-comm-7',
    name: 'Engineering Maths & Core Labs Hub',
    description: 'Study group for mid-semester exams, previous year question papers, lab viva prep, and engineering mechanics.',
    category: 'College Academics',
    image_url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=700&q=80',
    visibility: 'public',
    created_by: 'system',
    admin_name: 'Campus Community',
    member_count: 0,
    created_at: '2026-10-01T08:30:00Z'
  },
  {
    id: 'seed-comm-8',
    name: 'Capstone & Major Project Squad',
    description: 'Inter-branch major and minor project collaboration. Connect CSE developers with ECE/ME hardware engineers.',
    category: 'Project Collaboration',
    image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=700&q=80',
    visibility: 'private',
    created_by: 'system',
    admin_name: 'Campus Community',
    member_count: 0,
    created_at: '2026-10-05T13:00:00Z'
  }
]

export const INITIAL_PROJECTS = [
  {
    id: 'seed-proj-1',
    title: 'Autonomous Campus Delivery Rover',
    description: 'Building an ESP32 & ROS-powered small rover for delivering library books and supplies across GNDEC campus blocks.',
    category: 'Robotics',
    required_skills: ['ROS', 'Python', 'C++', 'Raspberry Pi', 'CAD Design'],
    status: 'open',
    contact_email: 'robotics-rover@gndec.edu',
    author_name: 'Campus Student Idea',
    author_branch: 'Mechanical 4th Yr',
    collaborators_count: 0,
    created_at: '2026-10-12T10:00:00Z'
  },
  {
    id: 'seed-proj-2',
    title: 'GNDEC Smart Attendance AI Camera System',
    description: 'Face recognition attendance tracker using PyTorch and OpenCV with anti-spoofing to automate class attendance.',
    category: 'AI/ML',
    required_skills: ['Python', 'PyTorch', 'OpenCV', 'FastAPI', 'React'],
    status: 'open',
    contact_email: 'ai-attendance@gndec.edu',
    author_name: 'Campus Student Idea',
    author_branch: 'IT 3rd Yr',
    collaborators_count: 0,
    created_at: '2026-10-18T14:00:00Z'
  },
  {
    id: 'seed-proj-3',
    title: 'Open Source College Exam Paper Archive',
    description: 'Clean responsive web app providing 10 years of categorized previous year question papers, solutions, and syllabus notes.',
    category: 'Web Development',
    required_skills: ['React', 'Tailwind', 'Supabase', 'Node.js'],
    status: 'open',
    contact_email: 'archive-project@gndec.edu',
    author_name: 'Campus Student Idea',
    author_branch: 'CSE 3rd Yr',
    collaborators_count: 0,
    created_at: '2026-10-25T16:30:00Z'
  }
]

export const INITIAL_POSTS = [
  {
    id: 'seed-post-1',
    community_id: 'seed-comm-1',
    author_name: 'Campus Community',
    author_initials: 'CC',
    author_role: 'admin',
    title: 'Welcome to GNDEC Coders Guild',
    content: 'Welcome everyone! Introduce yourselves, mention your active tech stack, and share what coding projects you want to build this semester.',
    category: 'Discussion',
    link_url: null,
    likes_count: 0,
    comments_count: 0,
    created_at: '2026-10-28T11:00:00Z'
  },
  {
    id: 'seed-post-2',
    community_id: 'seed-comm-2',
    author_name: 'Campus Community',
    author_initials: 'CC',
    author_role: 'admin',
    title: 'Free GPU Credits for College Students (Google Colab & Kaggle)',
    content: 'Here is a curated list of educational free GPU resources for training deep learning models without expensive hardware setups.',
    category: 'Resource',
    link_url: 'https://colab.research.google.com',
    likes_count: 0,
    comments_count: 0,
    created_at: '2026-11-02T15:20:00Z'
  },
  {
    id: 'seed-post-3',
    community_id: 'seed-comm-3',
    author_name: 'Campus Community',
    author_initials: 'CC',
    author_role: 'admin',
    title: 'React 19 & Vite 6 Best Practices for Campus Projects',
    content: 'Sharing our architecture design template for student full stack projects with Supabase authentication and client-side optimization.',
    category: 'Idea',
    link_url: 'https://github.com',
    likes_count: 0,
    comments_count: 0,
    created_at: '2026-11-05T09:45:00Z'
  }
]

// LocalStorage helpers with cache migration
const STORAGE_KEYS = {
  COMMUNITIES: 'campusdude-collabs-communities-v3',
  MEMBERSHIPS: 'campusdude-collabs-memberships-v3',
  POSTS: 'campusdude-collabs-posts-v3',
  COMMENTS: 'campusdude-collabs-comments-v3',
  LIKES: 'campusdude-collabs-likes-v3',
  PROJECTS: 'campusdude-collabs-projects-v3'
}

// Auto-clean obsolete mock data from previous versions
try {
  localStorage.removeItem('campusdude-collabs-communities')
  localStorage.removeItem('campusdude-collabs-communities-v2')
  localStorage.removeItem('campusdude-collabs-posts')
  localStorage.removeItem('campusdude-collabs-posts-v2')
  localStorage.removeItem('campusdude-collabs-projects')
} catch {}

function getStored(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : defaultValue
  } catch {
    return defaultValue
  }
}

function setStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export const CollabsService = {
  // -------------------------------------------------------------
  // COMMUNITIES
  // -------------------------------------------------------------
  async getCommunities(userId) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('communities')
          .select('*, profiles(full_name)')
          .order('created_at', { ascending: false })

        if (!error && Array.isArray(data) && data.length > 0) {
          // Fetch members to calculate accurate member counts
          const { data: memberData } = await supabase
            .from('community_members')
            .select('community_id, user_id, status, role')

          const memberMap = {}
          const userMemberSet = new Set()

          if (memberData) {
            memberData.forEach(m => {
              if (m.status === 'active') {
                memberMap[m.community_id] = (memberMap[m.community_id] || 0) + 1
              }
              if (userId && m.user_id === userId && m.status === 'active') {
                userMemberSet.add(m.community_id)
              }
            })
          }

          return data.map(c => ({
            ...c,
            admin_name: c.profiles?.full_name || (c.created_by === 'system' ? 'Campus Community' : 'Student Admin'),
            member_count: memberMap[c.id] || 0,
            is_member: userMemberSet.has(c.id),
            is_admin: c.created_by === userId
          }))
        }
      } catch (err) {
        console.warn('Supabase communities fetch fallback:', err)
      }
    }

    // Local / Offline fallback
    const stored = getStored(STORAGE_KEYS.COMMUNITIES, INITIAL_COMMUNITIES)
    const memberships = getStored(STORAGE_KEYS.MEMBERSHIPS, {})
    const userJoined = memberships[userId] || []

    return stored.map(c => {
      const isJoined = userJoined.includes(c.id) || (userId && c.created_by === userId)
      return {
        ...c,
        member_count: typeof c.member_count === 'number' ? c.member_count : 0,
        is_member: Boolean(isJoined),
        is_admin: Boolean(userId && c.created_by === userId)
      }
    })
  },

  async createCommunity(payload, user) {
    const userId = user?.id || 'demo-user'
    const authorName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student Admin'

    if (isSupabaseConfigured && user?.id) {
      try {
        const { data, error } = await supabase
          .from('communities')
          .insert({
            name: payload.name,
            description: payload.description,
            category: payload.category,
            image_url: payload.image_url || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=700&q=80',
            visibility: payload.visibility || 'public',
            created_by: user.id
          })
          .select()
          .single()

        if (!error && data) {
          // Add creator as admin member
          await supabase.from('community_members').insert({
            community_id: data.id,
            user_id: user.id,
            role: 'admin',
            status: 'active'
          })
          return { ...data, admin_name: authorName, member_count: 1, is_member: true, is_admin: true }
        }
      } catch (err) {
        console.warn('Supabase create community fallback:', err)
      }
    }

    // Local fallback
    const newComm = {
      id: 'comm-' + Date.now(),
      name: payload.name,
      description: payload.description,
      category: payload.category,
      image_url: payload.image_url || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=700&q=80',
      visibility: payload.visibility || 'public',
      created_by: userId,
      admin_name: authorName,
      member_count: 1,
      is_member: true,
      is_admin: true,
      created_at: new Date().toISOString()
    }

    const stored = getStored(STORAGE_KEYS.COMMUNITIES, INITIAL_COMMUNITIES)
    const updated = [newComm, ...stored]
    setStored(STORAGE_KEYS.COMMUNITIES, updated)

    // Update memberships
    const memberships = getStored(STORAGE_KEYS.MEMBERSHIPS, {})
    memberships[userId] = [...(memberships[userId] || []), newComm.id]
    setStored(STORAGE_KEYS.MEMBERSHIPS, memberships)

    return newComm
  },

  async joinCommunity(communityId, userId, isPrivate = false) {
    if (!userId) throw new Error('Please sign in to join a community.')

    if (isSupabaseConfigured && userId) {
      try {
        const status = isPrivate ? 'pending' : 'active'
        const { error } = await supabase.from('community_members').insert({
          community_id: communityId,
          user_id: userId,
          role: 'member',
          status
        })
        if (!error) return { status }
      } catch (err) {
        console.warn('Supabase join fallback:', err)
      }
    }

    // Local fallback
    const memberships = getStored(STORAGE_KEYS.MEMBERSHIPS, {})
    const userList = memberships[userId] || []
    if (!userList.includes(communityId)) {
      memberships[userId] = [...userList, communityId]
      setStored(STORAGE_KEYS.MEMBERSHIPS, memberships)
    }

    const stored = getStored(STORAGE_KEYS.COMMUNITIES, INITIAL_COMMUNITIES)
    const updated = stored.map(c => c.id === communityId ? { ...c, member_count: (c.member_count || 0) + 1 } : c)
    setStored(STORAGE_KEYS.COMMUNITIES, updated)

    return { status: isPrivate ? 'pending' : 'active' }
  },

  async leaveCommunity(communityId, userId) {
    if (!userId) return

    if (isSupabaseConfigured && userId) {
      try {
        await supabase
          .from('community_members')
          .delete()
          .eq('community_id', communityId)
          .eq('user_id', userId)
      } catch (err) {
        console.warn('Supabase leave fallback:', err)
      }
    }

    const memberships = getStored(STORAGE_KEYS.MEMBERSHIPS, {})
    memberships[userId] = (memberships[userId] || []).filter(id => id !== communityId)
    setStored(STORAGE_KEYS.MEMBERSHIPS, memberships)

    const stored = getStored(STORAGE_KEYS.COMMUNITIES, INITIAL_COMMUNITIES)
    const updated = stored.map(c => c.id === communityId ? { ...c, member_count: Math.max(0, (c.member_count || 0) - 1) } : c)
    setStored(STORAGE_KEYS.COMMUNITIES, updated)
  },

  // -------------------------------------------------------------
  // POSTS & DISCUSSIONS
  // -------------------------------------------------------------
  async getPosts(communityId = null, userId = null) {
    if (isSupabaseConfigured) {
      try {
        let query = supabase
          .from('community_posts')
          .select('*, profiles(full_name), communities(name, category)')
          .order('created_at', { ascending: false })

        if (communityId) query = query.eq('community_id', communityId)

        const { data, error } = await query
        if (!error && Array.isArray(data) && data.length > 0) {
          // Fetch likes
          const { data: likesData } = await supabase.from('post_likes').select('post_id, user_id')
          const likeMap = {}
          const userLiked = new Set()
          if (likesData) {
            likesData.forEach(l => {
              likeMap[l.post_id] = (likeMap[l.post_id] || 0) + 1
              if (userId && l.user_id === userId) userLiked.add(l.post_id)
            })
          }

          return data.map(p => {
            const author = p.profiles?.full_name || 'Student'
            return {
              ...p,
              author_name: author,
              author_initials: author.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase(),
              community_name: p.communities?.name || 'Community',
              likes_count: likeMap[p.id] || 0,
              is_liked: userLiked.has(p.id)
            }
          })
        }
      } catch (err) {
        console.warn('Supabase posts fetch fallback:', err)
      }
    }

    const stored = getStored(STORAGE_KEYS.POSTS, INITIAL_POSTS)
    const userLikes = getStored(STORAGE_KEYS.LIKES, {})
    const currentLikes = userLikes[userId] || []

    let result = stored
    if (communityId) result = result.filter(p => p.community_id === communityId)

    return result.map(p => ({
      ...p,
      is_liked: currentLikes.includes(p.id)
    }))
  },

  async createPost(payload, user) {
    const userId = user?.id || 'demo-user'
    const authorName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student'
    const initials = authorName.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase() || 'ST'

    if (isSupabaseConfigured && user?.id) {
      try {
        const { data, error } = await supabase
          .from('community_posts')
          .insert({
            community_id: payload.community_id,
            user_id: user.id,
            title: payload.title || '',
            content: payload.content,
            category: payload.category || 'Discussion',
            link_url: payload.link_url || null
          })
          .select('*, communities(name)')
          .single()

        if (!error && data) {
          return {
            ...data,
            author_name: authorName,
            author_initials: initials,
            community_name: data.communities?.name || 'Community',
            likes_count: 0,
            comments_count: 0,
            is_liked: false
          }
        }
      } catch (err) {
        console.warn('Supabase post create fallback:', err)
      }
    }

    const newPost = {
      id: 'post-' + Date.now(),
      community_id: payload.community_id,
      author_name: authorName,
      author_initials: initials,
      title: payload.title || '',
      content: payload.content,
      category: payload.category || 'Discussion',
      link_url: payload.link_url || null,
      likes_count: 0,
      comments_count: 0,
      is_liked: false,
      created_at: new Date().toISOString()
    }

    const stored = getStored(STORAGE_KEYS.POSTS, INITIAL_POSTS)
    setStored(STORAGE_KEYS.POSTS, [newPost, ...stored])
    return newPost
  },

  async toggleLike(postId, userId) {
    if (!userId) return false

    if (isSupabaseConfigured && userId) {
      try {
        const { data: existing } = await supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', userId)
          .maybeSingle()

        if (existing) {
          await supabase.from('post_likes').delete().eq('id', existing.id)
          return false
        } else {
          await supabase.from('post_likes').insert({ post_id: postId, user_id: userId })
          return true
        }
      } catch (err) {
        console.warn('Supabase toggle like fallback:', err)
      }
    }

    const userLikes = getStored(STORAGE_KEYS.LIKES, {})
    const current = userLikes[userId] || []
    let isLiked = false
    if (current.includes(postId)) {
      userLikes[userId] = current.filter(id => id !== postId)
      isLiked = false
    } else {
      userLikes[userId] = [...current, postId]
      isLiked = true
    }
    setStored(STORAGE_KEYS.LIKES, userLikes)

    const posts = getStored(STORAGE_KEYS.POSTS, INITIAL_POSTS)
    const updated = posts.map(p => p.id === postId ? {
      ...p,
      likes_count: Math.max(0, (p.likes_count || 0) + (isLiked ? 1 : -1))
    } : p)
    setStored(STORAGE_KEYS.POSTS, updated)

    return isLiked
  },

  // -------------------------------------------------------------
  // COMMENTS
  // -------------------------------------------------------------
  async getComments(postId) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('post_comments')
          .select('*, profiles(full_name)')
          .eq('post_id', postId)
          .order('created_at', { ascending: true })

        if (!error && Array.isArray(data)) {
          return data.map(c => {
            const author = c.profiles?.full_name || 'Student'
            return {
              ...c,
              author_name: author,
              author_initials: author.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase()
            }
          })
        }
      } catch (err) {
        console.warn('Supabase comments fetch fallback:', err)
      }
    }

    const commentsMap = getStored(STORAGE_KEYS.COMMENTS, {})
    return commentsMap[postId] || []
  },

  async addComment(postId, content, user) {
    if (!content?.trim()) return null
    const userId = user?.id || 'demo-user'
    const authorName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student'
    const initials = authorName.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase() || 'ST'

    if (isSupabaseConfigured && user?.id) {
      try {
        const { data, error } = await supabase
          .from('post_comments')
          .insert({
            post_id: postId,
            user_id: user.id,
            content: content.trim()
          })
          .select()
          .single()

        if (!error && data) {
          return {
            ...data,
            author_name: authorName,
            author_initials: initials
          }
        }
      } catch (err) {
        console.warn('Supabase comment create fallback:', err)
      }
    }

    const newComment = {
      id: 'cmt-' + Date.now(),
      post_id: postId,
      user_id: userId,
      author_name: authorName,
      author_initials: initials,
      content: content.trim(),
      created_at: new Date().toISOString()
    }

    const commentsMap = getStored(STORAGE_KEYS.COMMENTS, {})
    commentsMap[postId] = [...(commentsMap[postId] || []), newComment]
    setStored(STORAGE_KEYS.COMMENTS, commentsMap)

    return newComment
  },

  // -------------------------------------------------------------
  // PROJECTS
  // -------------------------------------------------------------
  async getProjects() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('collaboration_projects')
          .select('*, profiles(full_name)')
          .order('created_at', { ascending: false })

        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map(p => ({
            ...p,
            author_name: p.profiles?.full_name || 'Student Creator',
            required_skills: Array.isArray(p.required_skills) ? p.required_skills : (typeof p.required_skills === 'string' ? p.required_skills.split(',') : [])
          }))
        }
      } catch (err) {
        console.warn('Supabase projects fetch fallback:', err)
      }
    }

    return getStored(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS)
  },

  async createProject(payload, user) {
    const userId = user?.id || 'demo-user'
    const authorName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student'

    const skills = typeof payload.required_skills === 'string'
      ? payload.required_skills.split(',').map(s => s.trim()).filter(Boolean)
      : Array.isArray(payload.required_skills) ? payload.required_skills : []

    if (isSupabaseConfigured && user?.id) {
      try {
        const { data, error } = await supabase
          .from('collaboration_projects')
          .insert({
            title: payload.title,
            description: payload.description,
            category: payload.category,
            required_skills: skills,
            contact_email: payload.contact_email || user.email,
            created_by: user.id
          })
          .select()
          .single()

        if (!error && data) {
          return {
            ...data,
            author_name: authorName,
            required_skills: skills
          }
        }
      } catch (err) {
        console.warn('Supabase project create fallback:', err)
      }
    }

    const newProj = {
      id: 'proj-' + Date.now(),
      title: payload.title,
      description: payload.description,
      category: payload.category,
      required_skills: skills,
      status: 'open',
      contact_email: payload.contact_email || user?.email || 'student@gndec.edu',
      author_name: authorName,
      author_branch: 'Campus Student',
      collaborators_count: 1,
      created_at: new Date().toISOString()
    }

    const stored = getStored(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS)
    setStored(STORAGE_KEYS.PROJECTS, [newProj, ...stored])
    return newProj
  }
}
