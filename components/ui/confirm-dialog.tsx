"use client"

import * as React from "react"
import { Dialog, DialogOverlay, DialogContent, DialogTitle, DialogDescription } from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  loading = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: React.ReactNode
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => Promise<void> | void
  loading?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay className="fixed inset-0 z-[90] bg-black/40" />
      <DialogContent className="fixed left-1/2 top-1/2 z-[100] w-[min(90%,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg">
        <DialogTitle className="text-lg font-medium">{title}</DialogTitle>
        {description ? (
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            {description}
          </DialogDescription>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            onClick={async () => {
              await onConfirm()
            }}
            disabled={loading}
          >
            {loading ? `${confirmLabel}...` : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
