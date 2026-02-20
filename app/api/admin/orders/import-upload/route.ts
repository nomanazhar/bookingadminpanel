import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    const supabase = createServiceRoleClient();
    const arrayBuffer = await file.arrayBuffer();
    const fileName = `booking-imports/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from("import-uploads")
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ fileKey: fileName });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
