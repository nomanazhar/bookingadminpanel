import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getOrdersPaginated } from "@/lib/supabase/queries"
import { getOrdersPaginatedAdmin } from '@/lib/supabase/queries'
import { OrdersTable } from "@/components/admin/orders-table"
import OrdersPageHeader from "@/components/admin/orders-page-header"


async function OrdersList({ page, status }: { page: number, status?: string }) {
  let filter = status && status !== 'all' ? status : undefined;
  const { data: orders, count } = await getOrdersPaginatedAdmin(page, 20, filter);
  return (
    <OrdersTable orders={orders} currentPage={page} totalCount={count} pageSize={20} />
  );
}

export default async function OrdersPage({ searchParams }: { searchParams?: Promise<{ page?: string, status?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const page = parseInt(resolvedSearchParams?.page || "1", 10) || 1;
  const status = resolvedSearchParams?.status || 'all';

  return (
    <div className="p-6 space-y-6">
      <OrdersPageHeader />

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            }
          >
            {/* Server component fetches the page and renders the client table */}
            <OrdersList page={page} status={status} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

