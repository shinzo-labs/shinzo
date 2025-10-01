import React, { useRef, useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, Heading, Text, Box, Flex, Badge } from '@radix-ui/themes'
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
  const [activeSeries, setActiveSeries] = useState<Set<string>>(new Set())
  const allTimeSlots = Object.values(data)[0] || []

  // Sort series keys by total count descending, then alphanumeric
  const seriesKeys = useMemo(() => {
    const keys = Object.keys(data)
    const totals: Record<string, number> = {}
    keys.forEach(key => {
      totals[key] = data[key].reduce((sum, point) => sum + point.count, 0)
    })
    return keys.sort((a, b) => {
      if (totals[b] !== totals[a]) return totals[b] - totals[a]
      return a.localeCompare(b)
    })
  }, [data])

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

  // Filter series based on active selection
  const visibleSeries = useMemo(() => {
    if (activeSeries.size === 0) return seriesKeys
    return seriesKeys.filter(key => activeSeries.has(key))
  }, [seriesKeys, activeSeries])

  const handleLegendClick = (seriesName: string) => {
    setActiveSeries(prev => {
      const newSet = new Set(prev)
      if (newSet.has(seriesName)) {
        newSet.delete(seriesName)
      } else {
        newSet.add(seriesName)
      }
      return newSet
    })
  }

  // Calculate total for each series
  const seriesTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    seriesKeys.forEach(key => {
      totals[key] = data[key].reduce((sum, point) => sum + point.count, 0)
    })
    return totals
  }, [seriesKeys, data])

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
                color: 'var(--gray-12)',
                maxHeight: '300px',
                overflowY: 'auto'
              }}
              wrapperStyle={{
                zIndex: 1000
              }}
              formatter={formatTooltipValue}
            />

            {visibleSeries.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={chartColors[seriesKeys.indexOf(key) % chartColors.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                isAnimationActive={!hasAnimatedRef.current}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Custom scrollable legend */}
        <Box style={{
          maxHeight: '150px',
          overflowY: 'auto',
          marginTop: '16px',
          borderTop: '1px solid var(--gray-6)',
          paddingTop: '12px'
        }}>
          <Flex direction="column" gap="2">
            {seriesKeys.map((key, index) => {
              const isActive = activeSeries.size === 0 || activeSeries.has(key)
              return (
                <Flex
                  key={`legend-${index}`}
                  align="center"
                  gap="2"
                  style={{
                    cursor: 'pointer',
                    opacity: isActive ? 1 : 0.4,
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-2)',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => handleLegendClick(key)}
                >
                  <Box
                    style={{
                      width: '20px',
                      height: '2px',
                      backgroundColor: chartColors[index % chartColors.length],
                      flexShrink: 0
                    }}
                  />
                  <Text size="1" style={{ flex: 1, fontSize: '12px' }}>
                    {key}
                  </Text>
                  <Badge size="1" variant="soft">
                    {seriesTotals[key]} calls
                  </Badge>
                </Flex>
              )
            })}
          </Flex>
        </Box>
      </Box>
    </Card>
  )
}

export const TraceTimeSeriesChart = React.memo(TraceTimeSeriesChartComponent, chartPropsEqual)