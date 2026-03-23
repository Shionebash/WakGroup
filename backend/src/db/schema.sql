-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    discord_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    discriminator TEXT,
    avatar TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Classes reference data
CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    name_es TEXT NOT NULL,
    name_en TEXT,
    icon_path TEXT,
    color TEXT
);

-- Dungeons reference data
CREATE TABLE IF NOT EXISTS dungeons (
    id SERIAL PRIMARY KEY,
    name_es TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    image_path TEXT,
    modulated INTEGER NOT NULL,
    max_players INTEGER DEFAULT 4,
    min_stasis INTEGER DEFAULT 1,
    max_stasis INTEGER DEFAULT 10
);

-- Characters
CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 245),
    class_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('dps', 'healer', 'tank', 'support', 'invocador', 'posicionador')),
    server TEXT NOT NULL CHECK (server IN ('Ogrest', 'Rubilax', 'Pandora')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id)
);

-- Dungeon Groups
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    dungeon_id INTEGER NOT NULL,
    leader_char_id UUID NOT NULL,
    stasis INTEGER NOT NULL CHECK (stasis >= 1 AND stasis <= 10),
    steles_active BOOLEAN NOT NULL DEFAULT false,
    steles_count INTEGER NOT NULL DEFAULT 1,
    intervention_active BOOLEAN NOT NULL DEFAULT false,
    steles_drops TEXT,
    languages TEXT NOT NULL DEFAULT '["es","en","fr","pt"]',
    server TEXT NOT NULL CHECK (server IN ('Ogrest', 'Rubilax', 'Pandora')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'full', 'closed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dungeon_id) REFERENCES dungeons(id),
    FOREIGN KEY (leader_char_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- Group Members
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY,
    group_id UUID NOT NULL,
    character_id UUID NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(group_id, character_id)
);

-- Applications to join groups
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY,
    group_id UUID NOT NULL,
    character_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(group_id, character_id)
);

-- Chat Messages (group_id nullable to support both dungeon and pvp groups)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY,
    group_id UUID,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Wiki Posts (dungeon guides)
CREATE TABLE IF NOT EXISTS wiki_posts (
    id UUID PRIMARY KEY,
    dungeon_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dungeon_id) REFERENCES dungeons(id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- VS PVP Groups
CREATE TABLE IF NOT EXISTS pvp_groups (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    leader_char_id UUID NOT NULL,
    pvp_mode TEXT NOT NULL CHECK (pvp_mode IN ('1v1', '2v2', '3v3')),
    equipment_band INTEGER NOT NULL,
    leader_team TEXT NOT NULL DEFAULT 'red' CHECK (leader_team IN ('red', 'blue')),
    languages TEXT NOT NULL DEFAULT '["es","en","fr","pt"]',
    server TEXT NOT NULL CHECK (server IN ('Ogrest', 'Rubilax', 'Pandora')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'full', 'closed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (leader_char_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- VS PVP Group Members
CREATE TABLE IF NOT EXISTS pvp_group_members (
    id UUID PRIMARY KEY,
    pvp_group_id UUID NOT NULL,
    character_id UUID NOT NULL,
    team TEXT NOT NULL DEFAULT 'red' CHECK (team IN ('red', 'blue')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pvp_group_id) REFERENCES pvp_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(pvp_group_id, character_id)
);

-- VS PVP Applications
CREATE TABLE IF NOT EXISTS pvp_applications (
    id UUID PRIMARY KEY,
    pvp_group_id UUID NOT NULL,
    character_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pvp_group_id) REFERENCES pvp_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(pvp_group_id, character_id)
);

-- Add pvp_group_id column to chat_messages for PVP group chat support
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS pvp_group_id UUID REFERENCES pvp_groups(id) ON DELETE CASCADE;
-- Make group_id nullable for pvp chat messages (migration for existing DBs)
ALTER TABLE chat_messages ALTER COLUMN group_id DROP NOT NULL;
-- Add team column to pvp_group_members (migration for existing DBs)
ALTER TABLE pvp_group_members ADD COLUMN IF NOT EXISTS team TEXT NOT NULL DEFAULT 'red' CHECK (team IN ('red', 'blue'));
-- Add leader_team column to pvp_groups (migration for existing DBs)
ALTER TABLE pvp_groups ADD COLUMN IF NOT EXISTS leader_team TEXT NOT NULL DEFAULT 'red';

-- Indexes for pvp tables
CREATE INDEX IF NOT EXISTS idx_pvp_groups_status ON pvp_groups(status);
CREATE INDEX IF NOT EXISTS idx_pvp_groups_pvp_mode ON pvp_groups(pvp_mode);
CREATE INDEX IF NOT EXISTS idx_pvp_groups_server ON pvp_groups(server);
CREATE INDEX IF NOT EXISTS idx_pvp_group_members_pvp_group_id ON pvp_group_members(pvp_group_id);
CREATE INDEX IF NOT EXISTS idx_pvp_applications_pvp_group_id ON pvp_applications(pvp_group_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_pvp_group_id ON chat_messages(pvp_group_id);

-- New group options (migration for existing DBs)
ALTER TABLE groups ADD COLUMN IF NOT EXISTS steles_active BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS steles_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS intervention_active BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS steles_drops TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS languages TEXT NOT NULL DEFAULT '["es","en","fr","pt"]';
ALTER TABLE groups ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS inactivity_prompt_sent_at TIMESTAMP;
ALTER TABLE pvp_groups ADD COLUMN IF NOT EXISTS languages TEXT NOT NULL DEFAULT '["es","en","fr","pt"]';
ALTER TABLE pvp_groups ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE pvp_groups ADD COLUMN IF NOT EXISTS inactivity_prompt_sent_at TIMESTAMP;
UPDATE groups SET languages = '["es","en","fr","pt"]' WHERE languages IS NULL OR languages = '';
UPDATE pvp_groups SET languages = '["es","en","fr","pt"]' WHERE languages IS NULL OR languages = '';


CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_server ON characters(server);
CREATE INDEX IF NOT EXISTS idx_groups_dungeon_id ON groups(dungeon_id);
CREATE INDEX IF NOT EXISTS idx_groups_leader_char_id ON groups(leader_char_id);
CREATE INDEX IF NOT EXISTS idx_groups_status ON groups(status);
CREATE INDEX IF NOT EXISTS idx_groups_last_activity_at ON groups(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_groups_server ON groups(server);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_character_id ON group_members(character_id);
CREATE INDEX IF NOT EXISTS idx_applications_group_id ON applications(group_id);
CREATE INDEX IF NOT EXISTS idx_applications_character_id ON applications(character_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_group_id ON chat_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_pvp_groups_last_activity_at ON pvp_groups(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_wiki_posts_dungeon_id ON wiki_posts(dungeon_id);
