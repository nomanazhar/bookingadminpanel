"use client"
import axios from 'axios'
import { memo, useState, useMemo, useEffect } from "react"
import TableSearchBar from './table-search-bar'
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
import ConfirmDialog from "@/components/ui/confirm-dialog"

interface UsersTableProps {
  users: Profile[]
  currentPage?: number
  totalCount?: number
  pageSize?: number
  onEdit?: (user: Profile) => void
}

function UsersTableComponent({ users: initialUsers, currentPage, totalCount, pageSize, onEdit }: UsersTableProps) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers || [])

  // Keep local state in sync when parent updates `initialUsers`
  useEffect(() => {
    setUsers(initialUsers || [])
  }, [initialUsers])
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(user => {
      const fields = [
        user.first_name,
        user.last_name,
        user.email,
        user.phone,
        // removed user.phone_number (standardize on phone)
        user.gender,
        user.address,
        user.role,
        user.id,
        user.created_at ? new Date(user.created_at).toLocaleString() : '',
      ].join(' ').toLowerCase();
      return fields.includes(q);
    });
  }, [users, search]);

  const handleDelete = async (userId: string, role: string) => {
    // Do not allow deleting admin users
    if (role === "admin") {
      alert("Admin users cannot be deleted.")
      return
    }
    setDeleteTargetId(userId)
    setDeleteDialogOpen(true)
  }

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingUserLoading, setDeletingUserLoading] = useState(false)

  const confirmDeleteUser = async () => {
    if (!deleteTargetId) return
    setDeletingUserLoading(true)
    try {
      await axios.delete(`/api/admin/users/${deleteTargetId}`)
      setUsers(users.filter(u => u.id !== deleteTargetId))
    } catch {
      alert("Failed to delete user.")
    } finally {
      setDeletingUserLoading(false)
      setDeleteDialogOpen(false)
      setDeleteTargetId(null)
    }
  }
  if (!users || users.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">No users yet</div>
    )
  }
  return (
    <div>
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(v) => { if (!v) setDeleteDialogOpen(false) }}
        onConfirm={confirmDeleteUser}
        title="Delete user?"
        description="Are you sure you want to delete this user?"
        loading={deletingUserLoading}
      />
      <TableSearchBar onSearch={setSearch} placeholder="Search users..." />
      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-[#333333] text-white">
            <TableRow>
              <TableHead className="uppercase">Name</TableHead>
              <TableHead className="uppercase">Email</TableHead>
              <TableHead className="uppercase">Gender</TableHead>
              <TableHead className="uppercase">Address</TableHead>
              <TableHead className="uppercase">Role</TableHead>
              <TableHead className="uppercase">Joined</TableHead>
              <TableHead className="text-right uppercase">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((user) => (
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
                      <div className="font-medium capitalize">{user.first_name} {user.last_name}</div>
                     
                    </div>
                  </div>
                </TableCell>
                <TableCell>{user.email} <br/> {user.phone || '—'}</TableCell>
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
                      onClick={() => onEdit ? onEdit(user) : router.push(`/users/${user.id}/edit`)}
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
          <div className="flex items-center justify-start p-4 ">
            <div className="text-sm text-muted-foreground">Showing page {currentPage}</div>
            {/* <div className="flex items-center justify-start gap-2">
              {currentPage > 1 && (
                <a href={`?page=${currentPage - 1}`} className="btn">Previous</a>
              )}
              {currentPage * (pageSize || 20) < (totalCount || 0) && (
                <a href={`?page=${currentPage + 1}`} className="btn">Next</a>
              )}
            </div> */}
          </div>
        )}
      </div>
    </div>
  )
}

export const UsersTable = memo(UsersTableComponent)
