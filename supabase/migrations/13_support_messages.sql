-- Support messages table: users send messages to admin
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  office_id uuid REFERENCES offices(id) ON DELETE SET NULL,
  display_name text,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'replied', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Support replies table: admin replies to user messages
CREATE TABLE IF NOT EXISTS support_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES support_messages(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reply_text text NOT NULL,
  read_by_user boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_replies ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist
DROP POLICY IF EXISTS "users_insert_own_messages" ON support_messages;
DROP POLICY IF EXISTS "users_read_own_messages" ON support_messages;
DROP POLICY IF EXISTS "admins_read_all_messages" ON support_messages;
DROP POLICY IF EXISTS "admins_update_messages" ON support_messages;
DROP POLICY IF EXISTS "admins_insert_replies" ON support_replies;
DROP POLICY IF EXISTS "users_read_own_replies" ON support_replies;
DROP POLICY IF EXISTS "users_update_reply_read" ON support_replies;
DROP POLICY IF EXISTS "admins_read_all_replies" ON support_replies;

-- Users can insert & read their own messages
CREATE POLICY "users_insert_own_messages" ON support_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_read_own_messages" ON support_messages
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can read & update all messages
CREATE POLICY "admins_read_all_messages" ON support_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admins_update_messages" ON support_messages
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can insert replies
CREATE POLICY "admins_insert_replies" ON support_replies
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can read replies to their own messages
CREATE POLICY "users_read_own_replies" ON support_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_messages
      WHERE support_messages.id = support_replies.message_id
        AND support_messages.user_id = auth.uid()
    )
  );

-- Users can mark replies as read
CREATE POLICY "users_update_reply_read" ON support_replies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM support_messages
      WHERE support_messages.id = support_replies.message_id
        AND support_messages.user_id = auth.uid()
    )
  );

-- Admins can read all replies
CREATE POLICY "admins_read_all_replies" ON support_replies
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );
