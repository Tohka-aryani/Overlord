CREATE TABLE "tor_hits" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"host" text,
	"query" text,
	"status_code" integer,
	"ok" integer DEFAULT 0 NOT NULL,
	"title" text,
	"search_title" text,
	"search_description" text,
	"text_snippet" text,
	"error" text,
	"apify_run_id" text,
	"apify_dataset_id" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "tor_hits_url_uidx" ON "tor_hits" USING btree ("url");
--> statement-breakpoint
DROP TABLE IF EXISTS "tor_site_checks";
--> statement-breakpoint
DROP TABLE IF EXISTS "tor_sites";
