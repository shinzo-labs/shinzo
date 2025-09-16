import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card, Heading, Text, Box } from '@radix-ui/themes'
import { TracePieData } from '../../utils/chartDataProcessing'

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

export const TracePieChart: React.FC<TracePieChartProps> = ({
  title,
  data,
  height = 300
}) => {
  const totalValue = data.reduce((sum, item) => sum + item.value, 0)

  const formatTooltip = (value: number, name: string) => {
    const percentage = ((value / totalValue) * 100).toFixed(1)
    return [`${value} (${percentage}%)`, name]
  }

  const renderCustomLabel = (entry: any) => {
    const percentage = ((entry.value / totalValue) * 100)
    return percentage > 5 ? `${percentage.toFixed(1)}%` : ''
  }

  return (
    <Card>
      <Box style={{ padding: '16px' }}>
        <Heading size="4" style={{ marginBottom: '8px' }}>{title}</Heading>
        <Text size="2" color="gray" style={{ marginBottom: '16px' }}>
          Distribution of traces
        </Text>

        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
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