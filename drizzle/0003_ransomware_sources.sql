ALTER TABLE "ransomware_victims" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'ransomware.live' NOT NULL;--> statement-breakpoint
ALTER TABLE "ransomware_victims" ADD COLUMN IF NOT EXISTS "sources" text[] DEFAULT ARRAY['ransomware.live']::text[] NOT NULL;
