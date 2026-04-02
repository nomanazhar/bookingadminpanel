export const dynamic = "force-static";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
// Converted to React Server Component for performance
import Link from "next/link";
 
type Order = {
  id: string;
  date: string;
};

export default function OrderHistoryPage() {
  // Simulate no orders for now
  const orders: Order[] = [];
  return (
    <>
      <main className="container mx-auto py-6">
        {/* Back to Account Section */}
        <section className="max-w-3xl mx-auto mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/book-consultation">
              <Button variant="primary" className="h-6 w-10 "><ArrowLeft /></Button>
            </Link>   
              <h1 className="text-3xl font-bold tracking-tight">Order History</h1>
          </div>
        
        </section>
        {/* Orders Section */}
        <section className="max-w-3xl mx-auto bg-muted rounded-xl shadow p-8 min-h-[180px] flex items-center justify-center">
          {orders.length === 0 ? (
            <span className="text-lg text-muted-foreground">No Bookings found.</span>
          ) : (
            // Render order cards here if orders exist
            orders.map(order => (
              <div key={order.id} className="bg-white rounded-xl shadow p-6 flex items-center gap-6 mb-4">
                {/* Order details here */}
              </div>
            ))
          )}
        </section>
      </main>
    </>
  );
}
