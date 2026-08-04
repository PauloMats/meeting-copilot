CREATE TABLE "cloud_meeting_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_meeting_id" uuid NOT NULL,
	"title" varchar(240) NOT NULL,
	"meeting_type" varchar(40) NOT NULL,
	"meeting_name" varchar(160) DEFAULT '' NOT NULL,
	"meeting_date" varchar(32) DEFAULT '' NOT NULL,
	"language" varchar(10) NOT NULL,
	"transcript" text NOT NULL,
	"summary" jsonb,
	"ordered_participants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"speaker_hints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"speaker_segments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cloud_meeting_notes" ADD CONSTRAINT "cloud_meeting_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cloud_meeting_notes_user_client_idx" ON "cloud_meeting_notes" USING btree ("user_id","client_meeting_id");--> statement-breakpoint
CREATE INDEX "cloud_meeting_notes_user_started_idx" ON "cloud_meeting_notes" USING btree ("user_id","started_at");
