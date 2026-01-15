# Troubleshooting Login Issues

If users are experiencing login issues (400 Bad Request errors), here are the most common causes and solutions:

## Common Causes

### 1. Email Confirmation Required
If your Supabase project has email confirmation enabled, users must confirm their email before they can sign in.

**Solution:**
- Go to Supabase Dashboard → Authentication → Settings
- Check "Enable email confirmations"
- If enabled, users need to:
  - Check their email inbox (and spam folder)
  - Click the confirmation link
  - Then sign in

**To disable email confirmation (for development):**
- Go to Supabase Dashboard → Authentication → Settings
- Disable "Enable email confirmations"
- Save changes

**Or manually confirm a user's email:**
```sql
-- In Supabase SQL Editor
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'user@example.com';
```

### 2. Invalid Credentials
The email or password is incorrect.

**Solution:**
- Verify the user exists in `auth.users` table
- Check if the password is correct
- Try resetting the password

### 3. User Account Not Found
The user account doesn't exist in the database.

**Solution:**
- Verify the user was created successfully during signup
- Check the `auth.users` table in Supabase Dashboard
- Ensure the signup process completed successfully

### 4. Profile Not Created
The user exists in `auth.users` but not in `profiles` table.

**Solution:**
The auto-profile creation trigger should handle this, but if it didn't run:

```sql
-- Create profile for existing user
INSERT INTO public.profiles (id, email, first_name, last_name, role)
VALUES (
  'user-uuid-here',
  'user@example.com',
  'First',
  'Last',
  'customer'
)
ON CONFLICT (id) DO NOTHING;
```

### 5. Rate Limiting
Too many failed login attempts in a short time.

**Solution:**
- Wait a few minutes before trying again
- Check Supabase Dashboard → Authentication → Rate Limits

### 6. CORS or Network Issues
The request is being blocked or failing to reach Supabase.

**Solution:**
- Check browser console for CORS errors
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check if the Supabase project is active

## Testing Steps

1. **Check if user exists:**
   ```sql
   SELECT id, email, email_confirmed_at, created_at 
   FROM auth.users 
   WHERE email = 'test@example.com';
   ```

2. **Check if profile exists:**
   ```sql
   SELECT id, email, role 
   FROM public.profiles 
   WHERE email = 'test@example.com';
   ```

3. **Verify email is confirmed:**
   ```sql
   SELECT email, email_confirmed_at 
   FROM auth.users 
   WHERE email = 'test@example.com';
   ```
   - If `email_confirmed_at` is NULL, the email is not confirmed

4. **Test with Supabase Dashboard:**
   - Go to Authentication → Users
   - Try to manually authenticate the user
   - This will help identify if the issue is with credentials or configuration

## Debugging

The signin form now includes console logging in development mode. Check the browser console for:
- Sign in request details
- Response from Supabase
- Error messages with status codes

## Quick Fixes

### For Development (Disable Email Confirmation)
1. Supabase Dashboard → Authentication → Settings
2. Disable "Enable email confirmations"
3. Save and test again

### Manually Confirm All Users
```sql
-- Confirm all existing users' emails
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;
```

### Reset User Password
Users can use "Forgot password?" link, or manually reset:
1. Supabase Dashboard → Authentication → Users
2. Find the user
3. Click "Reset Password"
4. User will receive an email to reset

## Environment Variables

Make sure these are set in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Still Having Issues?

1. Check Supabase Dashboard → Authentication → Logs for detailed error messages
2. Check browser console for full error details
3. Verify the user exists and email is confirmed
4. Try creating a new test user and see if the issue persists

