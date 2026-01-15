import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Admin API endpoint to check storage bucket status
 * Checks if required buckets exist: category-images, service-images, doctor-images
 * 
 * Note: Bucket creation must be done manually via Supabase Dashboard
 * as the Storage API doesn't reliably support programmatic bucket creation
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    // Required buckets
    const requiredBuckets = ['category-images', 'service-images', 'doctor-images']

    // Check which buckets exist
    const { data: existingBuckets, error } = await supabase.storage.listBuckets()
    
    if (error) {
      return NextResponse.json({ 
        error: error.message,
        manualSetup: true,
        instructions: 'See setup-storage-buckets.md for manual setup instructions'
      }, { status: 500 })
    }

    const bucketStatus = requiredBuckets.map(bucketName => {
      const exists = existingBuckets?.some(b => b.name === bucketName)
      return {
        name: bucketName,
        exists,
        public: exists ? existingBuckets?.find(b => b.name === bucketName)?.public : null
      }
    })

    const allExist = bucketStatus.every(b => b.exists)
    const missingBuckets = bucketStatus.filter(b => !b.exists).map(b => b.name)

    return NextResponse.json({ 
      success: allExist,
      message: allExist 
        ? 'All required storage buckets exist and are configured correctly.'
        : `Missing buckets: ${missingBuckets.join(', ')}. Please create them manually.`,
      buckets: bucketStatus,
      missing: missingBuckets,
      manualSetup: !allExist,
      instructions: !allExist 
        ? 'Please create the missing buckets via Supabase Dashboard. See setup-storage-buckets.md for detailed instructions.'
        : undefined
    }, { status: allExist ? 200 : 404 })

  } catch (err: any) {
    return NextResponse.json({ 
      error: err?.message || 'Unknown error',
      manualSetup: true,
      instructions: 'See setup-storage-buckets.md for manual setup instructions'
    }, { status: 500 })
  }
}

