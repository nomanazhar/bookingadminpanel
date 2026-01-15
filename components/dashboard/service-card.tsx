"use client"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { ServiceWithCategory } from "@/types"
import { memo } from "react"
import Image from "next/image"

interface ServiceCardProps {
  service: ServiceWithCategory
  featured?: boolean
}

function ServiceCardComponent({ service, featured = false }: ServiceCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {service.thumbnail && (
        <div className="relative h-48 w-full bg-muted">
          <Image
            src={service.thumbnail}
            alt={service.name}
            fill
            className="object-cover"
          />
          {featured && service.is_popular && (
            <div className="absolute top-4 left-4">
              <span className="bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-xs font-semibold">
                Popular!
              </span>
            </div>
          )}
        </div>
      )}

      <CardContent className="p-6 space-y-3">
        <div>
          <p className="text-sm text-muted-foreground mb-1 capitalize">
            {service.category.name}
          </p>
          <h3 className="text-xl font-bold font-heading line-clamp-2 capitalize">
            {service.name}
          </h3>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-3 capitalize">
          {service.description}
        </p>

        <div className="flex items-baseline gap-1">
          <span className="text-sm text-muted-foreground">FROM</span>
          <span className="text-3xl font-bold text-primary">
            £{service.base_price.toFixed(0)}
          </span>
          <span className="text-sm text-muted-foreground">.
            {(service.base_price % 1).toFixed(2).split('.')[1]}
          </span>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0">
        <Button className="w-full cursor-pointer" size="lg">
          {featured ? "Book now" : "Buy now"}
        </Button>
      </CardFooter>
    </Card>
  )
}

export const ServiceCard = memo(ServiceCardComponent)

