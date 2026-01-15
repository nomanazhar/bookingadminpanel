import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail } from "lucide-react"

export default function EmailsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-heading mb-2">Emails</h1>
        <p className="text-muted-foreground">
          Manage email communications with customers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 space-y-4">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              Email management feature coming soon
            </p>
            <Button>Set Up Email Integration</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

