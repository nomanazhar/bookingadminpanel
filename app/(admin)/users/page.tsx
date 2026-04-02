import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { UsersClient } from "@/components/admin/users-client"

export default function AdminUsersPage() {
  return (
    <div className="px-6 py-4 space-y-1">
      
      <Card>
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            }
          >
            <UsersClient initialPage={1} pageSize={20} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
