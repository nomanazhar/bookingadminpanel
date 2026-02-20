"use client";

import { useEffect, useState } from "react";
import { OrdersTable } from "@/components/admin/orders-table";

export default function LegacyOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/legacy-orders?page=${page}&pageSize=${pageSize}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data) => {
        setOrders(data.data || []);
        setTotalCount(data.totalCount || 0);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load legacy orders");
        setLoading(false);
      });
  }, [page, pageSize]);

  if (loading) return <div className="flex justify-center items-center h-64">Loading legacy orders...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Legacy Orders</h1>
      <OrdersTable orders={orders} currentPage={page} pageSize={pageSize} totalCount={totalCount} />
      <div className="flex gap-2 mt-4">
        <span>Page {page} of {totalPages}</span>
        <button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn btn-outline border border-2">Previous</button>
        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="btn btn-outline border border-2">Next</button>
      </div>
    </div>
  );
}
