-- Zikki Database Schema
-- Enable fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  username      TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_active   TIMESTAMPTZ DEFAULT NOW()
);

-- Add username column if missing (idempotent migration)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='username'
  ) THEN
    ALTER TABLE users ADD COLUMN username TEXT UNIQUE;
  END IF;
END $$;

-- User profiles (onboarding data + goals)
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name     TEXT,
  birth_year       SMALLINT,
  gender           TEXT CHECK (gender IN ('male','female','other')),
  height_cm        NUMERIC(5,1),
  weight_kg        NUMERIC(5,2),
  activity_level   TEXT CHECK (activity_level IN ('sedentary','light','moderate','active','very_active')),
  goal             TEXT CHECK (goal IN ('lose','maintain','gain')),
  weekly_change_kg NUMERIC(3,2) DEFAULT 0.5,
  tdee             INTEGER,
  calorie_target   INTEGER,
  protein_target_g INTEGER,
  carbs_target_g   INTEGER,
  fat_target_g     INTEGER,
  onboarding_done  BOOLEAN DEFAULT FALSE,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Food database
CREATE TABLE IF NOT EXISTS foods (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode           TEXT,
  name              TEXT NOT NULL,
  brand             TEXT,
  calories_per_100g NUMERIC(7,2) NOT NULL DEFAULT 0,
  protein_per_100g  NUMERIC(7,2) NOT NULL DEFAULT 0,
  carbs_per_100g    NUMERIC(7,2) NOT NULL DEFAULT 0,
  fat_per_100g      NUMERIC(7,2) NOT NULL DEFAULT 0,
  fiber_per_100g    NUMERIC(7,2),
  serving_size_g    NUMERIC(6,1),
  serving_desc      TEXT,
  source            TEXT DEFAULT 'manual',
  verified          BOOLEAN DEFAULT FALSE,
  use_count         INTEGER DEFAULT 0,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS foods_barcode_idx ON foods(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS foods_name_trgm_idx ON foods USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS foods_brand_trgm_idx ON foods USING GIN (brand gin_trgm_ops);
CREATE INDEX IF NOT EXISTS foods_use_count_idx ON foods(use_count DESC);

-- Daily log entries
CREATE TABLE IF NOT EXISTS log_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_id      UUID REFERENCES foods(id),
  food_name    TEXT NOT NULL,
  log_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type    TEXT CHECK (meal_type IN ('breakfast','lunch','dinner','snack')) DEFAULT 'snack',
  amount_g     NUMERIC(7,2) NOT NULL,
  calories     NUMERIC(7,2) NOT NULL DEFAULT 0,
  protein_g    NUMERIC(7,2) NOT NULL DEFAULT 0,
  carbs_g      NUMERIC(7,2) NOT NULL DEFAULT 0,
  fat_g        NUMERIC(7,2) NOT NULL DEFAULT 0,
  raw_input    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS log_entries_user_date_idx ON log_entries(user_id, log_date);

-- Weight logs
CREATE TABLE IF NOT EXISTS weight_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight_kg  NUMERIC(5,2) NOT NULL,
  log_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_weight CHECK (weight_kg BETWEEN 20 AND 500),
  UNIQUE(user_id, log_date)
);

CREATE INDEX IF NOT EXISTS weight_logs_user_date_idx ON weight_logs(user_id, log_date DESC);

-- Daily AI coaching (cached)
CREATE TABLE IF NOT EXISTS daily_insights (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  insight_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content      JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, insight_date)
);

-- Seed common German foods
INSERT INTO foods (name, brand, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, serving_size_g, serving_desc, source, verified) VALUES
('Hühnerbrust, gebraten', NULL, 165, 31.0, 0, 3.6, 150, '1 Brust', 'seed', true),
('Hähnchenbrust, roh', NULL, 110, 23.0, 0, 1.2, 150, '1 Brust', 'seed', true),
('Rührei', NULL, 148, 10.0, 1.0, 11.0, 100, '2 Eier', 'seed', true),
('Hühnerei, gekocht', NULL, 155, 13.0, 1.1, 11.0, 55, '1 Ei (M)', 'seed', true),
('Vollkornbrot', NULL, 247, 8.5, 41.0, 3.5, 50, '1 Scheibe', 'seed', true),
('Toastbrot, Weizen', NULL, 265, 8.0, 49.0, 3.5, 30, '1 Scheibe', 'seed', true),
('Vollkorntoast', NULL, 247, 9.0, 43.0, 3.8, 35, '1 Scheibe', 'seed', true),
('Haferflocken', NULL, 375, 13.0, 66.0, 7.0, 80, '1 Portion', 'seed', true),
('Magerquark', NULL, 67, 12.0, 4.0, 0.2, 250, '1 Becher', 'seed', true),
('Griechischer Joghurt, 0%', NULL, 58, 10.0, 4.0, 0.4, 200, '1 Becher', 'seed', true),
('Joghurt, 3.5% Fett', NULL, 64, 3.5, 5.0, 3.5, 150, '1 Portion', 'seed', true),
('Milch, 3.5%', NULL, 64, 3.5, 4.8, 3.5, 200, '1 Glas', 'seed', true),
('Milch, 1.5%', NULL, 46, 3.4, 4.8, 1.5, 200, '1 Glas', 'seed', true),
('Butter', NULL, 741, 0.7, 0.6, 81.0, 10, '1 Portion', 'seed', true),
('Avocado', NULL, 160, 2.0, 9.0, 15.0, 200, '1 Stück', 'seed', true),
('Banane', NULL, 89, 1.1, 23.0, 0.3, 120, '1 mittelgroß', 'seed', true),
('Apfel', NULL, 52, 0.3, 14.0, 0.2, 182, '1 mittelgroß', 'seed', true),
('Thunfisch in Wasser', 'dose', 116, 26.0, 0, 1.0, 130, '1 Dose', 'seed', true),
('Lachs, gebraten', NULL, 208, 28.0, 0, 10.0, 150, '1 Portion', 'seed', true),
('Rinderhackfleisch, 20% Fett', NULL, 254, 17.0, 0, 20.0, 150, '1 Portion', 'seed', true),
('Rinderhackfleisch, 5% Fett', NULL, 137, 21.0, 0, 5.0, 150, '1 Portion', 'seed', true),
('Schweinefleisch, Schnitzel', NULL, 143, 22.0, 0, 5.5, 150, '1 Stück', 'seed', true),
('Tofu, natur', NULL, 76, 8.0, 1.9, 4.8, 100, '1 Portion', 'seed', true),
('Linsen, gegart', NULL, 116, 9.0, 20.0, 0.4, 150, '1 Portion', 'seed', true),
('Kichererbsen, gegart', NULL, 164, 8.9, 27.0, 2.6, 150, '1 Portion', 'seed', true),
('Reis, weiß, gegart', NULL, 130, 2.7, 28.0, 0.3, 200, '1 Portion', 'seed', true),
('Reis, Vollkorn, gegart', NULL, 111, 2.6, 23.0, 0.9, 200, '1 Portion', 'seed', true),
('Nudeln, gegart', NULL, 131, 5.0, 25.0, 1.1, 200, '1 Portion', 'seed', true),
('Vollkornnudeln, gegart', NULL, 124, 5.3, 23.5, 1.1, 200, '1 Portion', 'seed', true),
('Kartoffel, gegart', NULL, 87, 1.9, 20.0, 0.1, 200, '2 mittelgroß', 'seed', true),
('Süßkartoffel, gegart', NULL, 90, 2.0, 21.0, 0.1, 200, '1 Portion', 'seed', true),
('Brokkoli', NULL, 34, 2.8, 7.0, 0.4, 200, '1 Portion', 'seed', true),
('Spinat', NULL, 23, 2.9, 3.6, 0.4, 100, '1 Portion', 'seed', true),
('Tomaten', NULL, 18, 0.9, 3.9, 0.2, 150, '2 mittelgroß', 'seed', true),
('Gurke', NULL, 15, 0.6, 3.6, 0.1, 200, '1 Portion', 'seed', true),
('Paprika, rot', NULL, 31, 1.0, 6.0, 0.3, 200, '1 Stück', 'seed', true),
('Möhren', NULL, 41, 0.9, 10.0, 0.2, 150, '2 mittelgroß', 'seed', true),
('Mandeln', NULL, 579, 21.0, 22.0, 50.0, 30, '1 Handvoll', 'seed', true),
('Walnüsse', NULL, 654, 15.0, 14.0, 65.0, 30, '1 Handvoll', 'seed', true),
('Erdnussbutter', NULL, 588, 25.0, 20.0, 50.0, 32, '2 EL', 'seed', true),
('Olivenöl', NULL, 884, 0, 0, 100.0, 10, '1 EL', 'seed', true),
('Cappuccino', NULL, 40, 2.5, 4.5, 1.5, 200, '1 Tasse', 'seed', true),
('Latte Macchiato', NULL, 60, 3.0, 6.0, 2.5, 300, '1 Glas', 'seed', true),
('Americano', NULL, 5, 0.2, 0.8, 0, 200, '1 Tasse', 'seed', true),
('Orangensaft', NULL, 45, 0.7, 10.0, 0.2, 200, '1 Glas', 'seed', true),
('Vollmilchschokolade', NULL, 535, 7.7, 60.0, 30.0, 30, '3 Riegel', 'seed', true),
('Zartbitterschokolade, 70%', NULL, 550, 5.3, 47.0, 38.0, 30, '3 Riegel', 'seed', true),
('Pizza Margherita', NULL, 266, 11.0, 33.0, 10.0, 300, '1 Portion', 'seed', true),
('Proteinshake, Vanille', NULL, 110, 22.0, 5.0, 2.0, 300, '1 Shake', 'seed', true),
('Whey Protein Pulver', NULL, 380, 75.0, 8.0, 5.5, 30, '1 Scoop', 'seed', true),
('Müsli, klassisch', NULL, 379, 10.0, 65.0, 7.5, 60, '1 Portion', 'seed', true),
('Quark, 20% Fett', NULL, 129, 11.0, 3.6, 8.5, 200, '1 Portion', 'seed', true),
('Frischkäse, light', NULL, 105, 7.5, 3.9, 7.0, 30, '2 EL', 'seed', true),
('Cheddar', NULL, 403, 25.0, 1.3, 33.0, 30, '1 Scheibe', 'seed', true),
('Mozzarella', NULL, 280, 18.0, 2.2, 22.0, 125, '1 Kugel', 'seed', true),
('Edamer', NULL, 333, 26.0, 0.5, 25.0, 30, '1 Scheibe', 'seed', true),
('Hähnchen Wrap', NULL, 220, 15.0, 25.0, 7.0, 200, '1 Wrap', 'seed', true),
('Gemüsesuppe', NULL, 35, 1.5, 6.0, 0.5, 300, '1 Teller', 'seed', true),
('Hühnersuppe', NULL, 50, 5.0, 4.0, 1.5, 300, '1 Teller', 'seed', true)
ON CONFLICT DO NOTHING;
