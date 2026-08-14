CREATE TYPE "public"."booking_status" AS ENUM('AWAITING_RESPONSE', 'CONFIRMED', 'AWAITING_PAYMENT', 'PAID', 'TICKET_ISSUED', 'BOARDED', 'COMPLETED', 'REJECTED', 'CANCELLED_TIMEOUT');--> statement-breakpoint
CREATE TYPE "public"."conversation_sender" AS ENUM('user', 'operator');--> statement-breakpoint
CREATE TYPE "public"."departure_status" AS ENUM('available', 'delayed', 'full', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('open', 'under_review', 'resolved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."operator_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('card', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'success', 'failed', 'abandoned', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."price_type" AS ENUM('verified', 'last_seen');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('traveler', 'operator_rep', 'admin');--> statement-breakpoint
CREATE TYPE "public"."wallet_txn_type" AS ENUM('credit_pending', 'release_available', 'debit_withdrawal', 'debit_refund', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'whatsapp', 'sms', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('queued', 'sending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"state" text NOT NULL,
	"slug" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'traveler' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operators" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "operator_status" DEFAULT 'active' NOT NULL,
	"onboarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tagline" text,
	"about" text,
	"logo_url" text,
	"founded_year" integer,
	"fleet_size" integer,
	"is_verified" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"rating" numeric(3, 2) DEFAULT '0' NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"response_rate" numeric(4, 3) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operator_reps" (
	"id" serial PRIMARY KEY NOT NULL,
	"operator_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"phone" text,
	"whatsapp" text,
	"email" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "route_departures" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_id" integer NOT NULL,
	"departure_date" date NOT NULL,
	"departure_time" time NOT NULL,
	"seats_total" integer NOT NULL,
	"seats_available" integer NOT NULL,
	"fare_override" bigint,
	"status" "departure_status" DEFAULT 'available' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "route_departures_seats_non_negative" CHECK ("route_departures"."seats_available" >= 0),
	CONSTRAINT "route_departures_seats_within_capacity" CHECK ("route_departures"."seats_available" <= "route_departures"."seats_total")
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" serial PRIMARY KEY NOT NULL,
	"operator_id" integer NOT NULL,
	"origin_city_id" integer NOT NULL,
	"destination_city_id" integer NOT NULL,
	"fare" bigint NOT NULL,
	"price_type" "price_type" DEFAULT 'last_seen' NOT NULL,
	"price_verified_date" date,
	"seats_total" integer DEFAULT 14 NOT NULL,
	"terminal_location" text NOT NULL,
	"terminal_address" text,
	"duration_minutes" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "routes_fare_positive" CHECK ("routes"."fare" > 0),
	CONSTRAINT "routes_distinct_cities" CHECK ("routes"."origin_city_id" <> "routes"."destination_city_id")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"departure_id" integer NOT NULL,
	"traveler_id" integer,
	"traveler_name" text NOT NULL,
	"traveler_phone" text NOT NULL,
	"traveler_email" text,
	"seats_requested" integer NOT NULL,
	"fare_per_seat" bigint NOT NULL,
	"status" "booking_status" DEFAULT 'AWAITING_RESPONSE' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"response_deadline" timestamp with time zone NOT NULL,
	"payment_deadline" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"boarded_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"rejection_reason" text,
	"actioned_by_rep_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_seats_positive" CHECK ("bookings"."seats_requested" > 0),
	CONSTRAINT "bookings_fare_non_negative" CHECK ("bookings"."fare_per_seat" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"fare_amount" bigint NOT NULL,
	"convenience_fee" bigint DEFAULT 20000 NOT NULL,
	"processing_fee" bigint DEFAULT 0 NOT NULL,
	"total_amount" bigint GENERATED ALWAYS AS (fare_amount + convenience_fee + processing_fee) STORED,
	"payment_method" "payment_method",
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"paystack_reference" text,
	"paystack_payload" jsonb,
	"paid_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_fare_non_negative" CHECK ("payments"."fare_amount" >= 0),
	CONSTRAINT "payments_convenience_non_negative" CHECK ("payments"."convenience_fee" >= 0),
	CONSTRAINT "payments_processing_non_negative" CHECK ("payments"."processing_fee" >= 0)
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"ticket_code" text NOT NULL,
	"qr_token" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"redeemed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"booking_id" integer,
	"type" "wallet_txn_type" NOT NULL,
	"amount" bigint NOT NULL,
	"balance_after" bigint NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"operator_id" integer NOT NULL,
	"pending_balance" bigint DEFAULT 0 NOT NULL,
	"available_balance" bigint DEFAULT 0 NOT NULL,
	"withdrawn_total" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_pending_non_negative" CHECK ("wallets"."pending_balance" >= 0),
	CONSTRAINT "wallets_available_non_negative" CHECK ("wallets"."available_balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"raised_by" integer,
	"reason" text NOT NULL,
	"status" "dispute_status" DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_by" integer,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"operator_id" integer NOT NULL,
	"booking_id" integer,
	"author_id" integer,
	"author_name" text NOT NULL,
	"rating_punctuality" smallint NOT NULL,
	"rating_comfort" smallint NOT NULL,
	"rating_safety" smallint NOT NULL,
	"rating_value" smallint NOT NULL,
	"rating_professionalism" smallint NOT NULL,
	"review_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_ratings_in_range" CHECK ("reviews"."rating_punctuality" between 1 and 5
       and "reviews"."rating_comfort" between 1 and 5
       and "reviews"."rating_safety" between 1 and 5
       and "reviews"."rating_value" between 1 and 5
       and "reviews"."rating_professionalism" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"operator_id" integer NOT NULL,
	"user_id" integer,
	"guest_name" text,
	"guest_email" text,
	"unread_user" integer DEFAULT 0 NOT NULL,
	"unread_operator" integer DEFAULT 0 NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"sender_type" "conversation_sender" NOT NULL,
	"sender_name" text NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" integer,
	"actor_label" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"replaced_by_id" integer,
	"user_agent" text,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_id" integer,
	"recipient_address" text NOT NULL,
	"channel" "notification_channel" DEFAULT 'email' NOT NULL,
	"status" "notification_status" DEFAULT 'queued' NOT NULL,
	"template" text NOT NULL,
	"subject" text,
	"payload" jsonb,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "operator_reps" ADD CONSTRAINT "operator_reps_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operator_reps" ADD CONSTRAINT "operator_reps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_departures" ADD CONSTRAINT "route_departures_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_origin_city_id_cities_id_fk" FOREIGN KEY ("origin_city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_destination_city_id_cities_id_fk" FOREIGN KEY ("destination_city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_departure_id_route_departures_id_fk" FOREIGN KEY ("departure_id") REFERENCES "public"."route_departures"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_traveler_id_users_id_fk" FOREIGN KEY ("traveler_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_actioned_by_rep_id_users_id_fk" FOREIGN KEY ("actioned_by_rep_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_raised_by_users_id_fk" FOREIGN KEY ("raised_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cities_slug_unique" ON "cities" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "cities_name_state_unique" ON "cities" USING btree ("name","state");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_unique" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_phone_idx" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "operators_slug_unique" ON "operators" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "operators_status_idx" ON "operators" USING btree ("status");--> statement-breakpoint
CREATE INDEX "operators_featured_idx" ON "operators" USING btree ("featured");--> statement-breakpoint
CREATE UNIQUE INDEX "operator_reps_user_unique" ON "operator_reps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "operator_reps_operator_idx" ON "operator_reps" USING btree ("operator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "route_departures_slot_unique" ON "route_departures" USING btree ("route_id","departure_date","departure_time");--> statement-breakpoint
CREATE INDEX "route_departures_date_idx" ON "route_departures" USING btree ("departure_date","status");--> statement-breakpoint
CREATE INDEX "routes_operator_idx" ON "routes" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "routes_corridor_idx" ON "routes" USING btree ("origin_city_id","destination_city_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_reference_unique" ON "bookings" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "bookings_departure_idx" ON "bookings" USING btree ("departure_id");--> statement-breakpoint
CREATE INDEX "bookings_traveler_idx" ON "bookings" USING btree ("traveler_id");--> statement-breakpoint
CREATE INDEX "bookings_phone_idx" ON "bookings" USING btree ("traveler_phone");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bookings_response_sweep_idx" ON "bookings" USING btree ("response_deadline") WHERE "bookings"."status" = 'AWAITING_RESPONSE';--> statement-breakpoint
CREATE INDEX "bookings_payment_sweep_idx" ON "bookings" USING btree ("payment_deadline") WHERE "bookings"."status" = 'AWAITING_PAYMENT';--> statement-breakpoint
CREATE UNIQUE INDEX "payments_booking_unique" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_reference_unique" ON "payments" USING btree ("paystack_reference") WHERE "payments"."paystack_reference" is not null;--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_booking_unique" ON "tickets" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_code_unique" ON "tickets" USING btree ("ticket_code");--> statement-breakpoint
CREATE INDEX "wallet_txn_wallet_idx" ON "wallet_transactions" USING btree ("wallet_id","created_at");--> statement-breakpoint
CREATE INDEX "wallet_txn_booking_idx" ON "wallet_transactions" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_txn_booking_type_unique" ON "wallet_transactions" USING btree ("booking_id","type") WHERE "wallet_transactions"."booking_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "wallets_operator_unique" ON "wallets" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "disputes_booking_idx" ON "disputes" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "disputes_status_idx" ON "disputes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reviews_operator_idx" ON "reviews" USING btree ("operator_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_booking_unique" ON "reviews" USING btree ("booking_id") WHERE "reviews"."booking_id" is not null;--> statement-breakpoint
CREATE INDEX "conversations_operator_idx" ON "conversations" USING btree ("operator_id","last_message_at");--> statement-breakpoint
CREATE INDEX "conversations_user_idx" ON "conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_hash_unique" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_expiry_idx" ON "refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "notifications_due_idx" ON "notifications" USING btree ("next_attempt_at") WHERE "notifications"."status" in ('queued', 'failed');--> statement-breakpoint
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_id","created_at");