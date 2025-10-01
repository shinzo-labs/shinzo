import React, { useRef, useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, Heading, Text, Box, Flex, Badge } from '@radix-ui/themes'
import { TracePieData } from '../../utils/chartDataProcessing'
import { chartPropsEqual } from '../../utils/chartUtils'

interface TracePieChartProps {
  title: string
  data: TracePieData[]
  height?: number
}

const chartColors = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98',
  '#f0e68c', '#ff6347', '#40e0d0', '#ee82ee', '#90ee90'
]

const TracePieChartComponent: React.FC<TracePieChartProps> = ({
  title,
  data,
  height = 300
}) => {
  const hasAnimatedRef = useRef(false)
  const [activeItems, setActiveItems] = useState<Set<string>>(new Set())
  const totalValue = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data])

  // Mark as animated after first render
  useEffect(() => {
    if (!hasAnimatedRef.current && data.length > 0) {
      hasAnimatedRef.current = true
    }
  }, [data.length])

  const formatTooltip = useMemo(() => (value: number, name: string, props: any) => {
    const percentage = ((value / totalValue) * 100).toFixed(2)
    const entry = data.find(d => d.name === name)
    const serviceName = entry?.serviceName
    const nameWithService = serviceName ? `${name} (${serviceName})` : name
    return [`${value} (${percentage}%)`, nameWithService]
  }, [totalValue, data])

  const renderCustomLabel = useMemo(() => (entry: any) => {
    const percentage = ((entry.value / totalValue) * 100)
    return percentage > 5 ? `${percentage.toFixed(2)}%` : ''
  }, [totalValue])

  // Filter data based on active items (if any are selected)
  const filteredData = useMemo(() => {
    if (activeItems.size === 0) return data
    return data.filter(item => activeItems.has(item.name))
  }, [data, activeItems])

  const handleLegendClick = (itemName: string) => {
    setActiveItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemName)) {
        newSet.delete(itemName)
      } else {
        newSet.add(itemName)
      }
      return newSet
    })
  }

  return (
    <Card>
      <Box style={{ padding: '16px' }}>
        <Heading size="4" style={{ marginBottom: '8px' }}>{title}</Heading>
        <Text size="2" color="gray" style={{ marginBottom: '16px' }}>
          Distribution of traces
        </Text>

        <ResponsiveContainer width="100%" height={height}>
          <PieChart id={`pie-chart-${title.replace(/\s+/g, '-').toLowerCase()}`}>
            <Pie
              data={filteredData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              stroke="var(--color-panel-solid)"
              strokeWidth={2}
              isAnimationActive={!hasAnimatedRef.current}
            >
              {filteredData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || chartColors[index % chartColors.length]}
                />
              ))}
            </Pie>
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
              position={{ y: 0 }}
              formatter={formatTooltip}
            />
          </PieChart>
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
            {data.map((entry, index) => {
              const isActive = activeItems.size === 0 || activeItems.has(entry.name)
              const percentage = ((entry.value / totalValue) * 100).toFixed(2)
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
                  onClick={() => handleLegendClick(entry.name)}
                >
                  <Box
                    style={{
                      width: '12px',
                      height: '12px',
                      backgroundColor: entry.color || chartColors[index % chartColors.length],
                      borderRadius: 'var(--radius-1)',
                      flexShrink: 0
                    }}
                  />
                  <Flex direction="column" style={{ flex: 1 }}>
                    <Text size="1" style={{ fontSize: '12px' }}>
                      {entry.name}
                    </Text>
                    {entry.serviceName && (
                      <Text size="1" color="gray" style={{ fontSize: '10px' }}>
                        {entry.serviceName}
                      </Text>
                    )}
                  </Flex>
                  <Badge size="1" variant="soft">
                    {entry.value} ({percentage}%)
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

export const TracePieChart = React.memo(TracePieChartComponent, chartPropsEqual)