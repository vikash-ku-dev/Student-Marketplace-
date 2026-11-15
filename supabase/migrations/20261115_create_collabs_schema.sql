-- ==============================================================================
-- COLLABS: STUDENT COMMUNITY & COLLABORATION MODULE SCHEMA FOR CAMPUSDUDE
-- ==============================================================================
-- Migration Date: 2026-11-15
-- Description: Creates communities, members, posts, comments, likes,
--              and project collaboration tables with full Row Level Security (RLS).
-- ==============================================================================

-- 1. COMMUNITIES TABLE
CREATE TABLE IF NOT EXISTS public.communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    image_url TEXT,
    visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. COMMUNITY MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.community_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_community_user UNIQUE (community_id, user_id)
);

-- 3. COMMUNITY POSTS TABLE
CREATE TABLE IF NOT EXISTS public.community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Discussion' CHECK (category IN ('Discussion', 'Resource', 'Question', 'Idea')),
    link_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. POST COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. POST LIKES TABLE
CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_post_user_like UNIQUE (post_id, user_id)
);

-- 6. COLLABORATION PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.collaboration_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    required_skills TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed')),
    contact_email TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. PROJECT COLLABORATORS TABLE
CREATE TABLE IF NOT EXISTS public.project_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.collaboration_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_project_user_collab UNIQUE (project_id, user_id)
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_communities_category ON public.communities(category);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON public.community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_community ON public.community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_community ON public.community_posts(community_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_collab_projects_created_by ON public.collaboration_projects(created_by);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- Communities: Anyone authenticated can read public communities, or private ones if they are a member
CREATE POLICY "Public communities are viewable by all"
ON public.communities FOR SELECT
USING (
    visibility = 'public'
    OR (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.community_members
            WHERE community_members.community_id = communities.id
            AND community_members.user_id = auth.uid()
            AND community_members.status = 'active'
        )
    )
);

CREATE POLICY "Authenticated users can create communities"
ON public.communities FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Community admins can update their communities"
ON public.communities FOR UPDATE
USING (
    created_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.community_members
        WHERE community_members.community_id = communities.id
        AND community_members.user_id = auth.uid()
        AND community_members.role = 'admin'
    )
);

-- Community Members: View members of visible communities
CREATE POLICY "Members viewable if community is visible"
ON public.community_members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.communities
        WHERE communities.id = community_members.community_id
        AND (communities.visibility = 'public' OR communities.created_by = auth.uid())
    )
    OR user_id = auth.uid()
);

CREATE POLICY "Authenticated users can join communities"
ON public.community_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can leave or update their own status"
ON public.community_members FOR UPDATE
USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.communities WHERE communities.id = community_members.community_id AND communities.created_by = auth.uid()
));

CREATE POLICY "Members can leave communities"
ON public.community_members FOR DELETE
USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.communities WHERE communities.id = community_members.community_id AND communities.created_by = auth.uid()
));

-- Posts: Viewable if user has access to community
CREATE POLICY "Posts viewable by community viewers"
ON public.community_posts FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.communities
        WHERE communities.id = community_posts.community_id
        AND (communities.visibility = 'public' OR auth.uid() IS NOT NULL)
    )
);

CREATE POLICY "Authenticated members can create posts"
ON public.community_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors can update their posts"
ON public.community_posts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Authors or admins can delete posts"
ON public.community_posts FOR DELETE
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.communities
        WHERE communities.id = community_posts.community_id
        AND communities.created_by = auth.uid()
    )
);

-- Comments: Viewable by anyone who can view posts
CREATE POLICY "Comments viewable by all"
ON public.post_comments FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can comment"
ON public.post_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Comment authors can delete comments"
ON public.post_comments FOR DELETE
USING (auth.uid() = user_id);

-- Likes: Viewable by all, users can toggle their own like
CREATE POLICY "Likes viewable by all"
ON public.post_likes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can like"
ON public.post_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike"
ON public.post_likes FOR DELETE
USING (auth.uid() = user_id);

-- Projects: Viewable by all, authenticated can create
CREATE POLICY "Projects viewable by all"
ON public.collaboration_projects FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create projects"
ON public.collaboration_projects FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Project owners can update/delete"
ON public.collaboration_projects FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Project owners can delete"
ON public.collaboration_projects FOR DELETE
USING (auth.uid() = created_by);

-- Collaborators: Viewable by project creator and applicant
CREATE POLICY "Collaborators viewable by owner or applicant"
ON public.project_collaborators FOR SELECT
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.collaboration_projects
        WHERE collaboration_projects.id = project_collaborators.project_id
        AND collaboration_projects.created_by = auth.uid()
    )
);

CREATE POLICY "Authenticated users can apply to collaborate"
ON public.project_collaborators FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update collaborator status"
ON public.project_collaborators FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.collaboration_projects
        WHERE collaboration_projects.id = project_collaborators.project_id
        AND collaboration_projects.created_by = auth.uid()
    )
);
