CREATE TABLE "tor_sites" (
	"id" serial PRIMARY KEY NOT NULL,
	"host" text NOT NULL,
	"sample_url" text NOT NULL,
	"group_hint" text,
	"victim_count" integer DEFAULT 0 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tor_site_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ok" integer DEFAULT 0 NOT NULL,
	"http_status" integer,
	"title" text,
	"latency_ms" integer,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "tor_site_checks" ADD CONSTRAINT "tor_site_checks_site_id_tor_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."tor_sites"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "tor_sites_host_uidx" ON "tor_sites" USING btree ("host");
