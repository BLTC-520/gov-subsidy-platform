-- ZK Migration Database Schema Tests
-- 
-- This SQL file contains tests to validate the database schema changes
-- introduced by the ZK migration. Run these tests against your Supabase
-- database to ensure all fields are properly configured.

-- Test 1: Verify profiles table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND column_name IN ('nric', 'income_bracket', 'zk_class_flags', 'is_signature_valid', 'is_data_authentic')
ORDER BY ordinal_position;

-- Expected results:
-- nric              | text    | YES | NULL
-- income_bracket    | text    | YES | NULL  
-- zk_class_flags    | jsonb   | YES | NULL
-- is_signature_valid| boolean | YES | NULL
-- is_data_authentic | boolean | YES | NULL

-- Test 2: Check if NRIC has unique constraint
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
    AND contype = 'u'
    AND array_to_string(ARRAY(
        SELECT attname 
        FROM pg_attribute 
        WHERE attrelid = conrelid 
            AND attnum = ANY(conkey)
        ORDER BY attnum
    ), ',') = 'nric';

-- Expected: Should return a unique constraint on nric field

-- Test 3: Test valid income bracket values (sample data insert)
-- This tests if the system accepts all valid income brackets
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
    income_brackets text[] := ARRAY['B1', 'B2', 'B3', 'B4', 'M1', 'M2', 'M3', 'M4', 'T1', 'T2'];
    bracket text;
    test_flags jsonb;
BEGIN
    -- Create a test user first
    INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
    VALUES (test_user_id, 'test@example.com', NOW(), NOW(), NOW());
    
    INSERT INTO profiles (id, created_at, updated_at)
    VALUES (test_user_id, NOW(), NOW());
    
    -- Test each income bracket
    FOR i IN 1..array_length(income_brackets, 1) LOOP
        bracket := income_brackets[i];
        
        -- Create ZK flags array with only one active flag
        test_flags := jsonb_build_array(
            CASE WHEN i = 1 THEN 1 ELSE 0 END,
            CASE WHEN i = 2 THEN 1 ELSE 0 END,
            CASE WHEN i = 3 THEN 1 ELSE 0 END,
            CASE WHEN i = 4 THEN 1 ELSE 0 END,
            CASE WHEN i = 5 THEN 1 ELSE 0 END,
            CASE WHEN i = 6 THEN 1 ELSE 0 END,
            CASE WHEN i = 7 THEN 1 ELSE 0 END,
            CASE WHEN i = 8 THEN 1 ELSE 0 END,
            CASE WHEN i = 9 THEN 1 ELSE 0 END,
            CASE WHEN i = 10 THEN 1 ELSE 0 END
        );
        
        -- Update profile with test data
        UPDATE profiles 
        SET 
            income_bracket = bracket,
            zk_class_flags = test_flags,
            is_signature_valid = true,
            is_data_authentic = true,
            updated_at = NOW()
        WHERE id = test_user_id;
        
        -- Verify the update worked
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Failed to update profile for income bracket: %', bracket;
        END IF;
        
        RAISE NOTICE 'Successfully tested income bracket: %', bracket;
    END LOOP;
    
    -- Cleanup test data
    DELETE FROM profiles WHERE id = test_user_id;
    DELETE FROM auth.users WHERE id = test_user_id;
    
    RAISE NOTICE 'All income bracket tests passed ✅';
END $$;

-- Test 4: Test JSONB ZK flags validation
-- This tests if the zk_class_flags field correctly stores JSONB arrays
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
    test_flags jsonb;
    retrieved_flags jsonb;
BEGIN
    -- Create test user
    INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
    VALUES (test_user_id, 'test2@example.com', NOW(), NOW(), NOW());
    
    INSERT INTO profiles (id, created_at, updated_at)
    VALUES (test_user_id, NOW(), NOW());
    
    -- Test various JSONB array formats
    test_flags := '[1,0,0,0,0,0,0,0,0,0]'::jsonb;
    
    UPDATE profiles 
    SET zk_class_flags = test_flags
    WHERE id = test_user_id;
    
    -- Retrieve and verify
    SELECT zk_class_flags INTO retrieved_flags
    FROM profiles 
    WHERE id = test_user_id;
    
    IF retrieved_flags != test_flags THEN
        RAISE EXCEPTION 'JSONB storage test failed. Expected: %, Got: %', test_flags, retrieved_flags;
    END IF;
    
    -- Test array element access
    IF (retrieved_flags->0)::int != 1 THEN
        RAISE EXCEPTION 'JSONB array access failed. Expected first element to be 1, got: %', retrieved_flags->0;
    END IF;
    
    -- Cleanup
    DELETE FROM profiles WHERE id = test_user_id;
    DELETE FROM auth.users WHERE id = test_user_id;
    
    RAISE NOTICE 'JSONB ZK flags test passed ✅';
END $$;

-- Test 5: Test boolean fields
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
BEGIN
    -- Create test user
    INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
    VALUES (test_user_id, 'test3@example.com', NOW(), NOW(), NOW());
    
    INSERT INTO profiles (id, created_at, updated_at)
    VALUES (test_user_id, NOW(), NOW());
    
    -- Test boolean values
    UPDATE profiles 
    SET 
        is_signature_valid = true,
        is_data_authentic = false
    WHERE id = test_user_id;
    
    -- Verify boolean storage
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = test_user_id 
            AND is_signature_valid = true 
            AND is_data_authentic = false
    ) THEN
        RAISE EXCEPTION 'Boolean field test failed';
    END IF;
    
    -- Cleanup
    DELETE FROM profiles WHERE id = test_user_id;
    DELETE FROM auth.users WHERE id = test_user_id;
    
    RAISE NOTICE 'Boolean fields test passed ✅';
END $$;

-- Test 6: Test NRIC unique constraint
DO $$
DECLARE
    test_user_id1 uuid := gen_random_uuid();
    test_user_id2 uuid := gen_random_uuid();
    test_nric text := '030520-01-2185';
BEGIN
    -- Create first test user
    INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
    VALUES (test_user_id1, 'test4@example.com', NOW(), NOW(), NOW());
    
    INSERT INTO profiles (id, nric, created_at, updated_at)
    VALUES (test_user_id1, test_nric, NOW(), NOW());
    
    -- Create second test user
    INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
    VALUES (test_user_id2, 'test5@example.com', NOW(), NOW(), NOW());
    
    -- Try to insert duplicate NRIC (should fail)
    BEGIN
        INSERT INTO profiles (id, nric, created_at, updated_at)
        VALUES (test_user_id2, test_nric, NOW(), NOW());
        
        -- If we reach here, the constraint failed
        RAISE EXCEPTION 'NRIC unique constraint test failed - duplicate was allowed';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'NRIC unique constraint test passed ✅';
    END;
    
    -- Cleanup
    DELETE FROM profiles WHERE id IN (test_user_id1, test_user_id2);
    DELETE FROM auth.users WHERE id IN (test_user_id1, test_user_id2);
END $$;

-- Test 7: Performance test for JSONB operations
-- This tests if JSONB operations are efficient for ZK flags
EXPLAIN (ANALYZE, BUFFERS) 
SELECT COUNT(*) 
FROM profiles 
WHERE zk_class_flags->0 = '1'::jsonb;

-- Test 8: Check Row Level Security (RLS) policies
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles';

-- Expected: RLS should be enabled (true)

-- Test 9: Verify data types are correct for ZK migration fields
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
    AND column_name IN (
        'income_bracket',
        'zk_class_flags', 
        'is_signature_valid',
        'is_data_authentic',
        'nric'
    )
ORDER BY column_name;

-- Test 10: Sample data validation
-- Insert a complete valid record to test all fields together
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
    inserted_record record;
BEGIN
    -- Create test user
    INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
    VALUES (test_user_id, 'complete-test@example.com', NOW(), NOW(), NOW());
    
    -- Insert complete profile with all ZK migration fields
    INSERT INTO profiles (
        id, 
        nric,
        income_bracket,
        zk_class_flags,
        is_signature_valid,
        is_data_authentic,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        '030520-01-2185',
        'B1',
        '[1,0,0,0,0,0,0,0,0,0]'::jsonb,
        true,
        true,
        NOW(),
        NOW()
    );
    
    -- Retrieve and validate
    SELECT * INTO inserted_record
    FROM profiles 
    WHERE id = test_user_id;
    
    -- Validate all fields
    IF inserted_record.nric != '030520-01-2185' THEN
        RAISE EXCEPTION 'NRIC field validation failed';
    END IF;
    
    IF inserted_record.income_bracket != 'B1' THEN
        RAISE EXCEPTION 'Income bracket field validation failed';
    END IF;
    
    IF inserted_record.zk_class_flags != '[1,0,0,0,0,0,0,0,0,0]'::jsonb THEN
        RAISE EXCEPTION 'ZK class flags field validation failed';
    END IF;
    
    IF inserted_record.is_signature_valid != true THEN
        RAISE EXCEPTION 'Signature valid field validation failed';
    END IF;
    
    IF inserted_record.is_data_authentic != true THEN
        RAISE EXCEPTION 'Data authentic field validation failed';
    END IF;
    
    -- Cleanup
    DELETE FROM profiles WHERE id = test_user_id;
    DELETE FROM auth.users WHERE id = test_user_id;
    
    RAISE NOTICE 'Complete record validation test passed ✅';
END $$;

-- Summary query to show current state of relevant fields
SELECT 
    'Schema validation complete' as status,
    COUNT(*) as total_profiles_with_income_bracket
FROM profiles 
WHERE income_bracket IS NOT NULL;

-- Instructions for running these tests:
-- 1. Connect to your Supabase database using psql or the SQL editor
-- 2. Copy and paste these tests section by section
-- 3. Review the output for any errors
-- 4. All tests should show success messages (✅)
-- 
-- Note: These tests create and clean up temporary data
-- They should be safe to run on production databases