-- ClassChat - Friendships Table RLS Policies
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- IMPORTANT: Make sure the friendships table exists (from setup-database.sql)!

-- Make sure RLS is ON
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can update received requests" ON public.friendships;

-- Policy: Users can view friendships where they are either user_id or friend_id
CREATE POLICY "Users can view their friendships"
ON public.friendships
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR friend_id = auth.uid());

-- Policy: Users can create friendships where they are the user_id (sending requests)
CREATE POLICY "Users can create friendships"
ON public.friendships
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update friendships where they are the friend_id (accepting/rejecting requests)
CREATE POLICY "Users can update received requests"
ON public.friendships
FOR UPDATE
TO authenticated
USING (friend_id = auth.uid())
WITH CHECK (friend_id = auth.uid());

