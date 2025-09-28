import React, { useRef, useEffect, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, Heading, Text, Box } from '@radix-ui/themes'
import { TraceTimeSeriesData } from '../../utils/chartDataProcessing'
import { chartPropsEqual } from '../../utils/chartUtils'

interface TraceTimeSeriesChartProps {
  title: string
  data: Record<string, TraceTimeSeriesData[]>
  height?: number
}

const chartColors = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98',
  '#f0e68c', '#ff6347', '#40e0d0', '#ee82ee', '#90ee90'
]

const TraceTimeSeriesChartComponent: React.FC<TraceTimeSeriesChartProps> = ({
  title,
  data,
  height = 300
}) => {
  const hasAnimatedRef = useRef(false)
  const allTimeSlots = Object.values(data)[0] || []
  const seriesKeys = Object.keys(data)

  // Mark as animated after first render
  useEffect(() => {
    if (!hasAnimatedRef.current && seriesKeys.length > 0) {
      hasAnimatedRef.current = true
    }
  }, [seriesKeys.length])

  const chartData = useMemo(() => {
    return allTimeSlots.map(slot => {
      const dataPoint: any = { timestamp: slot.timestamp }

      seriesKeys.forEach(key => {
        const seriesData = data[key]
        const matchingSlot = seriesData.find(s => s.timestamp === slot.timestamp)
        dataPoint[key] = matchingSlot ? matchingSlot.count : 0
      })

      return dataPoint
    })
  }, [allTimeSlots, seriesKeys, data])

  const formatTooltipValue = (value: number, name: string) => {
    return [`${value} calls`, name]
  }

  return (
    <Card>
      <Box style={{ padding: '16px' }}>
        <Heading size="4" style={{ marginBottom: '8px' }}>{title}</Heading>
        <Text size="2" color="gray" style={{ marginBottom: '16px' }}>
          Trace count over time
        </Text>

        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            id={`line-chart-${title.replace(/\s+/g, '-').toLowerCase()}`}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-6)" />
            <XAxis
              dataKey="timestamp"
              tick={{ fontSize: 12, fill: 'var(--gray-11)' }}
              axisLine={{ stroke: 'var(--gray-6)' }}
              tickLine={{ stroke: 'var(--gray-6)' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'var(--gray-11)' }}
              axisLine={{ stroke: 'var(--gray-6)' }}
              tickLine={{ stroke: 'var(--gray-6)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-panel-solid)',
                border: '1px solid var(--gray-6)',
                borderRadius: 'var(--radius-2)',
                color: 'var(--gray-12)'
              }}
              formatter={formatTooltipValue}
            />
            <Legend />

            {seriesKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={chartColors[index % chartColors.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                isAnimationActive={!hasAnimatedRef.current}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Card>
  )
}

export const TraceTimeSeriesChart = React.memo(TraceTimeSeriesChartComponent, chartPropsEqual)