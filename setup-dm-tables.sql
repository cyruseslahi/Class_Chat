-- ClassChat - DM Tables Schema
-- Run this BEFORE setup-dm-rls.sql in your Supabase SQL Editor (Dashboard > SQL Editor)

-- Create dm_conversations table
CREATE TABLE IF NOT EXISTS public.dm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dm_members table (junction table for conversation participants)
CREATE TABLE IF NOT EXISTS public.dm_members (
  conversation_id UUID NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, user_id)
);

-- Create dm_messages table
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

