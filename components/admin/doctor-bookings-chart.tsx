'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { DoctorBookingChartDatum } from '@/lib/supabase/queries'

interface DoctorBookingsChartProps {
  title: string
  colorClassName: string
  data: DoctorBookingChartDatum[]
  color?: string
}

export function DoctorBookingsChart({
  title,
  colorClassName,
  data,
  color = '#8b5cf6',
}: DoctorBookingsChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            No booking data available.
          </div>
        </CardContent>
      </Card>
    )
  }

  // Prepare data for Recharts
  const chartData = data.map((item) => ({
    name: item.doctorName.split(' ')[0], // First name only for compact display
    fullName: item.doctorName,
    value: item.bookings,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 0, bottom: 35 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              allowDecimals={false}
              ticks={[0, 1, 5, 10, 20]}
              domain={[0, 'dataMax']}
              tick={{ fontSize: 12 }} 
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
              }}
              formatter={(value) => [`${value} bookings`, 'Count']}
              labelFormatter={(label, payload) => {
                if (payload && payload.length > 0) {
                  return `Doctor: ${payload[0].payload.fullName}`
                }
                return label
              }}
            />
            <Bar dataKey="value" fill={color} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
