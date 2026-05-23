SELECT u."Email", u."AuthUserId", tp."Id" as "ProfileId"
FROM tutor_profiles tp
JOIN user_accounts u ON tp."UserAccountId" = u."Id";
