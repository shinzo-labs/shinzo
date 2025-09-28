import React, { useRef, useEffect, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card, Heading, Text, Box } from '@radix-ui/themes'
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
  const totalValue = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data])

  // Mark as animated after first render
  useEffect(() => {
    if (!hasAnimatedRef.current && data.length > 0) {
      hasAnimatedRef.current = true
    }
  }, [data.length])

  const formatTooltip = useMemo(() => (value: number, name: string) => {
    const percentage = ((value / totalValue) * 100).toFixed(2)
    return [`${value} (${percentage}%)`, name]
  }, [totalValue])

  const renderCustomLabel = useMemo(() => (entry: any) => {
    const percentage = ((entry.value / totalValue) * 100)
    return percentage > 5 ? `${percentage.toFixed(2)}%` : ''
  }, [totalValue])

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
              data={data}
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
              {data.map((entry, index) => (
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
                color: 'var(--gray-12)'
              }}
              formatter={formatTooltip}
            />
            <Legend
              wrapperStyle={{
                fontSize: '12px',
                color: 'var(--gray-11)'
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Total count display */}
        <Box style={{ textAlign: 'center', marginTop: '16px' }}>
          <Text size="3" weight="bold" style={{ display: 'block' }}>
            {totalValue.toLocaleString()}
          </Text>
          <Text size="2" color="gray">
            Total traces
          </Text>
        </Box>
      </Box>
    </Card>
  )
}

export const TracePieChart = React.memo(TracePieChartComponent, chartPropsEqual)