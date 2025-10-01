import React, { useRef, useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, Heading, Text, Box, Flex, Badge, Button } from '@radix-ui/themes'
import { TracePieData } from '../../utils/chartDataProcessing'
import { chartPropsEqual } from '../../utils/chartUtils'
import { Trace } from '../../utils/chartDataProcessing'

interface TracePieChartProps {
  title: string
  data: TracePieData[]
  height?: number
  groupBy: 'tool' | 'session'
  traces: Trace[]
}

const chartColors = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98',
  '#f0e68c', '#ff6347', '#40e0d0', '#ee82ee', '#90ee90'
]

const cleanOperationName = (operationName: string | null): string => {
  if (!operationName) return 'Unknown'
  // Split on space, remove first element, rejoin
  const parts = operationName.split(' ')
  if (parts.length <= 1) return operationName
  return parts.slice(1).join(' ')
}

const TracePieChartComponent: React.FC<TracePieChartProps> = ({
  title,
  data,
  height = 300,
  groupBy,
  traces
}) => {
  const hasAnimatedRef = useRef(false)
  const [activeItems, setActiveItems] = useState<Set<string>>(new Set())
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null)

  // When filters are active (activeItems), compute second-level data
  const displayData = useMemo((): TracePieData[] => {
    if (activeItems.size === 0) return data

    // Get traces for selected top-level items
    let filteredTraces: Trace[] = []

    if (groupBy === 'tool') {
      // Selected tool(s), show sessions
      activeItems.forEach(toolName => {
        const toolTraces = traces.filter(t => cleanOperationName(t.operation_name) === toolName)
        filteredTraces = [...filteredTraces, ...toolTraces]
      })

      const sessionCounts = filteredTraces.reduce((acc, trace) => {
        const sessionId = trace.uuid.substring(0, 8)
        acc[sessionId] = (acc[sessionId] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return Object.entries(sessionCounts)
        .sort((a, b) => {
          // Sort by count descending, then by name alphanumeric
          if (b[1] !== a[1]) return b[1] - a[1]
          return a[0].localeCompare(b[0])
        })
        .map(([name, value], index): TracePieData => ({
          name,
          value,
          color: chartColors[index % chartColors.length]
        }))
    } else {
      // Selected session(s), show tools
      activeItems.forEach(sessionId => {
        const sessionTraces = traces.filter(t => t.uuid.startsWith(sessionId))
        filteredTraces = [...filteredTraces, ...sessionTraces]
      })

      const operationData = filteredTraces.reduce((acc, trace) => {
        const operation = cleanOperationName(trace.operation_name)
        if (!acc[operation]) {
          acc[operation] = {
            count: 0,
            services: new Set<string>()
          }
        }
        acc[operation].count++
        acc[operation].services.add(trace.service_name)
        return acc
      }, {} as Record<string, { count: number; services: Set<string> }>)

      return Object.entries(operationData)
        .sort((a, b) => {
          // Sort by count descending, then by name alphanumeric
          if (b[1].count !== a[1].count) return b[1].count - a[1].count
          return a[0].localeCompare(b[0])
        })
        .map(([name, data], index): TracePieData => ({
          name,
          value: data.count,
          serviceName: Array.from(data.services).join(', '),
          color: chartColors[index % chartColors.length]
        }))
    }
  }, [activeItems, data, groupBy, traces])

  const totalValue = useMemo(() => displayData.reduce((sum, item) => sum + item.value, 0), [displayData])

  // Mark as animated after first render
  useEffect(() => {
    if (!hasAnimatedRef.current && data.length > 0) {
      hasAnimatedRef.current = true
    }
  }, [data.length])

  const formatTooltip = useMemo(() => (value: number, name: string, props: any) => {
    const percentage = ((value / totalValue) * 100).toFixed(2)
    const entry = displayData.find(d => d.name === name)
    const serviceName = entry?.serviceName
    const nameWithService = serviceName ? `${name} (${serviceName})` : name
    return [`${value} (${percentage}%)`, nameWithService]
  }, [totalValue, displayData])

  const renderCustomLabel = useMemo(() => (entry: any) => {
    const percentage = ((entry.value / totalValue) * 100)
    return percentage > 5 ? `${percentage.toFixed(2)}%` : ''
  }, [totalValue])

  // displayData already contains the right data (either top-level or second-level)
  const filteredData = displayData

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
    // Once we select from legend, we're in filtered mode
    if (activeItems.size === 0) {
      setSelectedFilter('filtered')
    }
  }

  const handlePieClick = (entry: any) => {
    // This only gets called when activeItems.size === 0
    setActiveItems(new Set([entry.name]))
    setSelectedFilter('filtered')
  }

  const handleReset = () => {
    setSelectedFilter(null)
    setActiveItems(new Set())
  }

  const isFiltered = activeItems.size > 0

  return (
    <Card>
      <Box style={{ padding: '16px' }}>
        <Flex justify="between" align="start" style={{ marginBottom: '8px' }}>
          <Box>
            <Heading size="4" style={{ marginBottom: '4px' }}>{title}</Heading>
            <Text size="2" color="gray">
              {activeItems.size > 0
                ? `Showing ${groupBy === 'tool' ? 'sessions' : 'tools'} for ${activeItems.size} selected ${groupBy === 'tool' ? 'tool' : 'session'}${activeItems.size > 1 ? 's' : ''}`
                : 'Distribution of traces'}
            </Text>
          </Box>
          {isFiltered && (
            <Button size="1" variant="soft" onClick={handleReset}>
              Reset
            </Button>
          )}
        </Flex>

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
              onClick={activeItems.size === 0 ? handlePieClick : undefined}
              style={{ cursor: activeItems.size === 0 ? 'pointer' : 'default' }}
            >
              {filteredData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || chartColors[index % chartColors.length]}
                  style={{
                    cursor: activeItems.size === 0 ? 'pointer' : 'default',
                    outline: 'none'
                  }}
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

        {/* Custom scrollable legend - always shows top-level grouping */}
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
              const originalTotal = data.reduce((sum, item) => sum + item.value, 0)
              const percentage = ((entry.value / originalTotal) * 100).toFixed(2)
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