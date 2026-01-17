"use client"
import axios from 'axios'
import { memo, useState } from "react"
import { useRouter } from "next/navigation"
import type { Profile } from "@/types"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash } from "lucide-react"

interface UsersTableProps {
  users: Profile[]
  currentPage?: number
  totalCount?: number
  pageSize?: number
}

function UsersTableComponent({ users: initialUsers, currentPage, totalCount, pageSize }: UsersTableProps) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers || [])

  const handleDelete = async (userId: string, role: string) => {
    // Do not allow deleting admin users
    if (role === "admin") {
      alert("Admin users cannot be deleted.")
      return
    }
    if (!window.confirm("Are you sure you want to delete this user?")) return
    // Call API to delete user in Supabase
    try {
      await axios.delete(`/api/admin/users/${userId}`)
      setUsers(users.filter(u => u.id !== userId))
    } catch {
      alert("Failed to delete user.")
    }

  }
  if (!users || users.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">No users yet</div>
    )
  }
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <Avatar>
                    {user.avatar_url ? (
                      <AvatarImage src={user.avatar_url} alt={`${user.first_name} ${user.last_name}`} />
                    ) : (
                      <AvatarFallback>{(user.first_name || user.email || "?")[0]}</AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <div className="font-medium">{user.first_name} {user.last_name}</div>
                    <div className="text-xs text-muted-foreground">{user.id}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.phone || user.phone_number || '—'}</TableCell>
              <TableCell>{user.gender || '—'}</TableCell>
              <TableCell className="max-w-xs truncate">{user.address || '—'}</TableCell>
              <TableCell>
                <Badge variant={user.role === 'admin' ? 'secondary' : 'default'}>
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell>{new Date(user.created_at).toLocaleString()}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push(`/admin/users/${user.id}/edit`)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(user.id, user.role)}
                    disabled={user.role === "admin"}
                    className={user.role === "admin" ? "opacity-30 cursor-not-allowed" : ""}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {typeof currentPage !== 'undefined' && typeof totalCount !== 'undefined' && (
        <div className="flex items-center justify-between p-4">
          <div className="text-sm text-muted-foreground">Showing page {currentPage}</div>
          <div className="flex items-center gap-2">
            {currentPage > 1 && (
              <a href={`?page=${currentPage - 1}`} className="btn">Previous</a>
            )}
            {currentPage * (pageSize || 20) < (totalCount || 0) && (
              <a href={`?page=${currentPage + 1}`} className="btn">Next</a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export const UsersTable = memo(UsersTableComponent)
