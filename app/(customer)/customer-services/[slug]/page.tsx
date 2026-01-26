
import { notFound } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import ServiceDateSelector from "@/components/services/ServiceDateSelector";
import BookingPanel from "@/components/services/BookingPanel";
import { createClient } from "@/lib/supabase/server";

export default async function ServiceDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>, searchParams?: Promise<{ reschedule?: string }> }) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const rescheduleId = resolvedSearchParams?.reschedule;

  const supabase = await createClient();
  // Fetch service and optional reschedule order in parallel to avoid SSR waterfall
  const servicePromise = supabase
    .from("services")
    .select(`*, category:categories(*)`)
    .eq("slug", slug)
    .maybeSingle();

  const orderPromise = rescheduleId
    ? supabase.from("orders").select("*").eq("id", rescheduleId).maybeSingle()
    : Promise.resolve({ data: null });

  const [serviceRes, orderRes] = await Promise.all([servicePromise, orderPromise]);
  const { data: service, error } = serviceRes as any;
  const rescheduleOrder = (orderRes as any)?.data || null;

  if (error || !service) return notFound();
  return (
    <>
      <main className="container mx-auto py-6">
        {/* Book Consultation Heading Section */}
        <section className="max-w-3xl mx-auto mb-6">
          <div className="mb-2">
            <Link href="/">
              <Button variant="ghost">← Back to Dashboard</Button>
            </Link>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Book consultation</h1>
        </section>
        {/* Service Card Section */}
        <section className="max-w-3xl mx-auto mb-6">
          <div className="bg-muted rounded-xl shadow p-6">
            <div className="text-2xl font-semibold mb-6">Service</div>
            <div className="flex items-center gap-4">
              <Image
                src={
                  service.thumbnail ||
                  (Array.isArray(service.images) && service.images[0]) ||
                  "/services/placeholder.jpg"
                }
                alt={service.name || "service"}
                width={72}
                height={72}
                className="rounded-lg object-cover"
              />
              <div>
                <div className="text-lg font-medium">
                  {service.name}
                </div>
                <div className="text-muted-foreground text-base">{service.duration_minutes ? `${service.duration_minutes} min` : ""}</div>
              </div>
            </div>
          </div>
        </section>
        <BookingPanel service={service} rescheduleOrder={rescheduleOrder} />
      </main>
    </>
  );
}
