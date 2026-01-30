-- ClassChat - Messages Table RLS Policies
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

-- Make sure RLS is ON
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Let logged-in users INSERT messages
CREATE POLICY "Authenticated can insert messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Let logged-in users READ messages
CREATE POLICY "Authenticated can read messages"
ON public.messages
FOR SELECT
TO authenticated
USING (true);

