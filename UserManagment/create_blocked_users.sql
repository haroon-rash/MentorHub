CREATE TABLE "BlockedUsers" (
    "Id" uuid NOT NULL,
    "BlockerAuthUserId" text NOT NULL,
    "BlockedAuthUserId" text NOT NULL,
    "BlockedAtUtc" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_BlockedUsers" PRIMARY KEY ("Id")
);
