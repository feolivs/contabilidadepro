-- Fix RLS policies for realtime_notifications table
-- This enables proper Realtime access for authenticated users

-- Enable RLS on realtime_notifications table
ALTER TABLE "public"."realtime_notifications" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
CREATE POLICY "Users can view their own notifications" 
ON "public"."realtime_notifications"
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Policy: Users can update their own notifications (mark as read, dismissed, etc.)
CREATE POLICY "Users can update their own notifications"
ON "public"."realtime_notifications"
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: System can insert notifications for any user (for Edge Functions)
CREATE POLICY "System can create notifications"
ON "public"."realtime_notifications"
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON "public"."realtime_notifications"
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Optional: Add RLS policies for realtime.messages table if needed for broadcast/presence
-- This is only needed if you're using Realtime Broadcast or Presence features

-- Check if realtime.messages table exists and add policies
DO $$
BEGIN
  -- Only create policies if the table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'realtime' AND table_name = 'messages') THEN
    
    -- Enable RLS on realtime.messages
    ALTER TABLE "realtime"."messages" ENABLE ROW LEVEL SECURITY;
    
    -- Policy: Authenticated users can listen to broadcasts
    CREATE POLICY "Authenticated users can receive broadcasts"
    ON "realtime"."messages"
    FOR SELECT
    TO authenticated
    USING (
      -- Allow access to broadcast messages
      extension = 'broadcast'
    );
    
    -- Policy: Authenticated users can send broadcasts
    CREATE POLICY "Authenticated users can send broadcasts"
    ON "realtime"."messages"
    FOR INSERT
    TO authenticated
    WITH CHECK (
      -- Allow sending broadcast messages
      extension = 'broadcast'
    );
    
    -- Policy: Authenticated users can listen to presence
    CREATE POLICY "Authenticated users can receive presence"
    ON "realtime"."messages"
    FOR SELECT
    TO authenticated
    USING (
      -- Allow access to presence messages
      extension = 'presence'
    );
    
    -- Policy: Authenticated users can send presence
    CREATE POLICY "Authenticated users can send presence"
    ON "realtime"."messages"
    FOR INSERT
    TO authenticated
    WITH CHECK (
      -- Allow sending presence messages
      extension = 'presence'
    );
    
  END IF;
END $$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."realtime_notifications" TO authenticated;
GRANT USAGE ON SCHEMA "public" TO authenticated;

-- Note: Publication refresh is handled automatically by Supabase
-- The RLS policies will be applied to realtime subscriptions automatically
