CREATE TABLE "actor_ips" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" integer NOT NULL,
	"username" text NOT NULL,
	"ip" text NOT NULL,
	"hostname" text,
	"country_iso" text,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "actors" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"forums" text[] DEFAULT '{}' NOT NULL,
	"first_seen_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"threat_level" text NOT NULL,
	"category" text NOT NULL,
	"malaysia_relevance" text NOT NULL,
	"sector" text,
	"confidence" real,
	"rationale" text,
	"model" text,
	"classified_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingest_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text NOT NULL,
	"counts" jsonb,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "news_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"link" text NOT NULL,
	"published_at" timestamp with time zone,
	"source" text,
	"keyword_hit" text,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ransomware_victims" (
	"id" serial PRIMARY KEY NOT NULL,
	"victim" text NOT NULL,
	"group" text NOT NULL,
	"country" text,
	"sector" text,
	"attack_date" date NOT NULL,
	"claim_url" text,
	"raw_json" jsonb,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "actor_ips" ADD CONSTRAINT "actor_ips_actor_id_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."actors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "actor_ips_ip_username_uidx" ON "actor_ips" USING btree ("ip","username");--> statement-breakpoint
CREATE UNIQUE INDEX "actors_username_uidx" ON "actors" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "news_items_link_uidx" ON "news_items" USING btree ("link");--> statement-breakpoint
CREATE UNIQUE INDEX "ransomware_victims_victim_group_attack_date_uidx" ON "ransomware_victims" USING btree ("victim","group","attack_date");