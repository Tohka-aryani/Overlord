CREATE TABLE "telegram_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"message_id" text NOT NULL,
	"posted_at" timestamp with time zone,
	"text" text NOT NULL,
	"media_kind" text,
	"media_url" text,
	"post_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_messages_channel_message_uidx" ON "telegram_messages" USING btree ("channel","message_id");
