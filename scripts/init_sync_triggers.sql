-- MentorHub Synchronization Triggers
-- Ensures compatibility between PascalCase (.NET) and snake_case (Java) columns

CREATE OR REPLACE FUNCTION sync_trigger_func() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- Standardize IDs
        BEGIN NEW.id = COALESCE(NEW.id, NEW."Id"); EXCEPTION WHEN OTHERS THEN END;
        BEGIN NEW."Id" = COALESCE(NEW."Id", NEW.id); EXCEPTION WHEN OTHERS THEN END;
        
        -- User Account ID (Critical for tutor/student profiles)
        BEGIN NEW.user_account_id = COALESCE(NEW.user_account_id, NEW."UserAccountId"); EXCEPTION WHEN OTHERS THEN END;
        BEGIN NEW."UserAccountId" = COALESCE(NEW."UserAccountId", NEW.user_account_id); EXCEPTION WHEN OTHERS THEN END;

        BEGIN NEW.auth_user_id = COALESCE(NEW.auth_user_id, NEW."AuthUserId"); EXCEPTION WHEN OTHERS THEN END;
        BEGIN NEW."AuthUserId" = COALESCE(NEW."AuthUserId", NEW.auth_user_id); EXCEPTION WHEN OTHERS THEN END;

        -- Common Fields
        BEGIN NEW.full_name = COALESCE(NEW.full_name, NEW."FullName"); EXCEPTION WHEN OTHERS THEN END;
        BEGIN NEW."FullName" = COALESCE(NEW."FullName", NEW.full_name); EXCEPTION WHEN OTHERS THEN END;

        BEGIN NEW.email = COALESCE(NEW.email, NEW."Email"); EXCEPTION WHEN OTHERS THEN END;
        BEGIN NEW."Email" = COALESCE(NEW."Email", NEW.email); EXCEPTION WHEN OTHERS THEN END;

        BEGIN NEW.role = COALESCE(NEW.role, NEW."Role"); EXCEPTION WHEN OTHERS THEN END;
        BEGIN NEW."Role" = COALESCE(NEW."Role", NEW.role); EXCEPTION WHEN OTHERS THEN END;

        BEGIN NEW.profile_photo_url = COALESCE(NEW.profile_photo_url, NEW."ProfilePhotoUrl"); EXCEPTION WHEN OTHERS THEN END;
        BEGIN NEW."ProfilePhotoUrl" = COALESCE(NEW."ProfilePhotoUrl", NEW.profile_photo_url); EXCEPTION WHEN OTHERS THEN END;

        BEGIN NEW.verification_status = COALESCE(NEW.verification_status, NEW."VerificationStatus"); EXCEPTION WHEN OTHERS THEN END;
        BEGIN NEW."VerificationStatus" = COALESCE(NEW."VerificationStatus", NEW.verification_status); EXCEPTION WHEN OTHERS THEN END;

        -- Timestamps
        BEGIN NEW.created_at_utc = COALESCE(NEW.created_at_utc, NEW."CreatedAtUtc"); EXCEPTION WHEN OTHERS THEN END;
        BEGIN NEW."CreatedAtUtc" = COALESCE(NEW."CreatedAtUtc", NEW.created_at_utc); EXCEPTION WHEN OTHERS THEN END;
        BEGIN NEW.updated_at_utc = COALESCE(NEW.updated_at_utc, NEW."UpdatedAtUtc"); EXCEPTION WHEN OTHERS THEN END;
        BEGIN NEW."UpdatedAtUtc" = COALESCE(NEW."UpdatedAtUtc", NEW.updated_at_utc); EXCEPTION WHEN OTHERS THEN END;
    ELSE
        -- UPDATE Logic
        BEGIN IF (NEW.id IS DISTINCT FROM OLD.id) THEN NEW."Id" = NEW.id; ELSE NEW.id = NEW."Id"; END IF; EXCEPTION WHEN OTHERS THEN END;
        BEGIN IF (NEW.user_account_id IS DISTINCT FROM OLD.user_account_id) THEN NEW."UserAccountId" = NEW.user_account_id; ELSE NEW.user_account_id = NEW."UserAccountId"; END IF; EXCEPTION WHEN OTHERS THEN END;
        BEGIN IF (NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id) THEN NEW."AuthUserId" = NEW.auth_user_id; ELSE NEW.auth_user_id = NEW."AuthUserId"; END IF; EXCEPTION WHEN OTHERS THEN END;
        BEGIN IF (NEW.role IS DISTINCT FROM OLD.role) THEN NEW."Role" = NEW.role; ELSE NEW.role = NEW."Role"; END IF; EXCEPTION WHEN OTHERS THEN END;
        BEGIN IF (NEW.full_name IS DISTINCT FROM OLD.full_name) THEN NEW."FullName" = NEW.full_name; ELSE NEW.full_name = NEW."FullName"; END IF; EXCEPTION WHEN OTHERS THEN END;
        BEGIN IF (NEW.email IS DISTINCT FROM OLD.email) THEN NEW."Email" = NEW.email; ELSE NEW.email = NEW."Email"; END IF; EXCEPTION WHEN OTHERS THEN END;
        BEGIN IF (NEW.profile_photo_url IS DISTINCT FROM OLD.profile_photo_url) THEN NEW."ProfilePhotoUrl" = NEW.profile_photo_url; ELSE NEW.profile_photo_url = NEW."ProfilePhotoUrl"; END IF; EXCEPTION WHEN OTHERS THEN END;
        BEGIN IF (NEW.verification_status IS DISTINCT FROM OLD.verification_status) THEN NEW."VerificationStatus" = NEW.verification_status; ELSE NEW.verification_status = NEW."VerificationStatus"; END IF; EXCEPTION WHEN OTHERS THEN END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to main tables
DROP TRIGGER IF EXISTS trg_sync_signup_user ON signup_user;
CREATE TRIGGER trg_sync_signup_user BEFORE INSERT OR UPDATE ON signup_user FOR EACH ROW EXECUTE FUNCTION sync_trigger_func();

DROP TRIGGER IF EXISTS trg_sync_user_accounts ON user_accounts;
CREATE TRIGGER trg_sync_user_accounts BEFORE INSERT OR UPDATE ON user_accounts FOR EACH ROW EXECUTE FUNCTION sync_trigger_func();

DROP TRIGGER IF EXISTS trg_sync_tutor_profiles ON tutor_profiles;
CREATE TRIGGER trg_sync_tutor_profiles BEFORE INSERT OR UPDATE ON tutor_profiles FOR EACH ROW EXECUTE FUNCTION sync_trigger_func();

DROP TRIGGER IF EXISTS trg_sync_student_profiles ON student_profiles;
CREATE TRIGGER trg_sync_student_profiles BEFORE INSERT OR UPDATE ON student_profiles FOR EACH ROW EXECUTE FUNCTION sync_trigger_func();

-- Fix constraints for fresh DB
DO $$ 
DECLARE 
    tbl text;
    col record;
BEGIN 
    FOR tbl IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('tutor_profiles', 'student_profiles')
    LOOP
        FOR col IN 
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = tbl 
              AND column_name ~ '^[A-Z]' 
              AND is_nullable = 'NO'
              AND column_name NOT IN ('Id', 'UserAccountId')
        LOOP 
            EXECUTE 'ALTER TABLE ' || tbl || ' ALTER COLUMN "' || col.column_name || '" DROP NOT NULL';
        END LOOP; 
    END LOOP;
END $$;
