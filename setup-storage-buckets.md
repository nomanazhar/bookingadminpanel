# Storage Buckets Setup Guide

The application requires Supabase Storage buckets to be created for image uploads. The following buckets are needed:

1. **category-images** - For category images
2. **service-images** - For service images  
3. **doctor-images** - For doctor profile images (optional - currently using category-images)

## Manual Setup (Recommended)

### Option 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Create the following buckets:

#### Bucket 1: `category-images`
- **Name**: `category-images`
- **Public bucket**: ✅ Enabled (so images can be accessed via public URLs)
- **File size limit**: 10 MB (or as needed)
- **Allowed MIME types**: `image/*` (or leave empty for all)

#### Bucket 2: `service-images`
- **Name**: `service-images`
- **Public bucket**: ✅ Enabled
- **File size limit**: 10 MB (or as needed)
- **Allowed MIME types**: `image/*` (or leave empty for all)

#### Bucket 3: `doctor-images` (Optional - for better organization)
- **Name**: `doctor-images`
- **Public bucket**: ✅ Enabled
- **File size limit**: 5 MB (or as needed)
- **Allowed MIME types**: `image/*` (or leave empty for all)

### Option 2: Using Supabase Management API

You can also create buckets programmatically using the Supabase Management API. However, this requires your service role key and should only be done server-side.

## Automatic Setup via API Route

I've created an API route at `/api/admin/setup-storage-buckets` that you can call to automatically create the buckets. **Note**: This requires your `SUPABASE_SERVICE_ROLE_KEY` to be set in your environment variables.

To use it:
1. Make sure you have `SUPABASE_SERVICE_ROLE_KEY` in your `.env.local` file
2. Call the endpoint as an admin user (it will check for admin role)

## RLS Policies

The RLS policies for storage buckets are already defined in `SUPABASE_CONSOLIDATED.sql`. They include:

- **Authenticated uploads to image buckets**: Allows authenticated users to upload to `category-images`, `service-images`, and `doctor-images` buckets
- **Public read access to image buckets**: Allows anyone to read/view images from these buckets (required for displaying images in the app)
- **Authenticated users can delete from image buckets**: Allows authenticated users to delete files from these buckets

The policies are already configured to support all three buckets (`category-images`, `service-images`, and `doctor-images`).

## Verify Setup

After creating the buckets, you can verify they exist by:
1. Checking the Supabase Dashboard → Storage section
2. Calling the API endpoint: `GET /api/admin/setup-storage-buckets` (as an admin user)

## Troubleshooting

If you get "Bucket not found" errors:
1. Ensure the buckets are created with the exact names: `category-images`, `service-images`, and optionally `doctor-images`
2. Make sure the buckets are set to **Public** (this is required for images to be accessible via public URLs)
3. Check that the RLS policies have been applied correctly by running the storage policies section from `SUPABASE_CONSOLIDATED.sql`

