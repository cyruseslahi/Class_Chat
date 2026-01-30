-- ClassChat - DM Tables RLS Policies
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- This script creates the tables AND sets up RLS policies

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS public.dm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dm_members (
  conversation_id UUID NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS dm_members_conversation_id_idx ON public.dm_members(conversation_id);
CREATE INDEX IF NOT EXISTS dm_members_user_id_idx ON public.dm_members(user_id);
CREATE INDEX IF NOT EXISTS dm_messages_conversation_id_idx ON public.dm_messages(conversation_id);
CREATE INDEX IF NOT EXISTS dm_messages_created_at_idx ON public.dm_messages(created_at);

-- Disable RLS temporarily to clean up policies
ALTER TABLE public.dm_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (including any we might have missed)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop policies on dm_conversations
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'dm_conversations' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.dm_conversations';
    END LOOP;
    
    -- Drop policies on dm_members
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'dm_members' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.dm_members';
    END LOOP;
    
    -- Drop policies on dm_messages
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'dm_messages' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.dm_messages';
    END LOOP;
END $$;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS user_is_conversation_member(UUID, UUID);
DROP FUNCTION IF EXISTS add_conversation_members(UUID, UUID, UUID);

-- Function to create a conversation and add both members (uses SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION create_dm_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
BEGIN
  -- Create the conversation
  INSERT INTO public.dm_conversations DEFAULT VALUES
  RETURNING id INTO conv_id;
  
  -- Add both members
  INSERT INTO public.dm_members (conversation_id, user_id)
  VALUES (conv_id, user1_id)
  ON CONFLICT DO NOTHING;
  
  INSERT INTO public.dm_members (conversation_id, user_id)
  VALUES (conv_id, user2_id)
  ON CONFLICT DO NOTHING;
  
  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add both members to a conversation (uses SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION add_conversation_members(conv_id UUID, user1_id UUID, user2_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.dm_members (conversation_id, user_id)
  VALUES (conv_id, user1_id)
  ON CONFLICT DO NOTHING;
  
  INSERT INTO public.dm_members (conversation_id, user_id)
  VALUES (conv_id, user2_id)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-enable RLS
ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

-- SIMPLE policy for dm_members SELECT - users can only see their own memberships
CREATE POLICY "Users can view their own memberships"
ON public.dm_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- SIMPLE policy for dm_members INSERT - users can only insert their own memberships
CREATE POLICY "Users can insert their own memberships"
ON public.dm_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy for dm_conversations SELECT - check membership using the simple policy
CREATE POLICY "Users can view conversations they're in"
ON public.dm_conversations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dm_members
    WHERE dm_members.conversation_id = dm_conversations.id
    AND dm_members.user_id = auth.uid()
  )
);

-- Policy for dm_conversations INSERT - allow authenticated users to create conversations
-- Drop existing policy first if it exists
DROP POLICY IF EXISTS "Users can create conversations" ON public.dm_conversations;

CREATE POLICY "Users can create conversations"
ON public.dm_conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy for dm_messages SELECT
CREATE POLICY "Users can view messages in their conversations"
ON public.dm_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dm_members
    WHERE dm_members.conversation_id = dm_messages.conversation_id
    AND dm_members.user_id = auth.uid()
  )
);

-- Policy for dm_messages INSERT
CREATE POLICY "Users can send messages in their conversations"
ON public.dm_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.dm_members
    WHERE dm_members.conversation_id = dm_messages.conversation_id
    AND dm_members.user_id = auth.uid()
  )
);
