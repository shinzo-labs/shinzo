import React, { useState } from 'react'
import { Flex, Button, Text, Card, Grid, TextField } from '@radix-ui/themes'
import { subMinutes, subHours, subDays, subWeeks, subMonths } from 'date-fns'

export interface TimeRange {
  start: Date
  end: Date
  label: string
}

interface TimeRangePickerProps {
  onTimeRangeChange: (timeRange: TimeRange) => void
  currentRange: TimeRange
}

const presetRanges = [
  { label: 'Last 1 hour', getValue: () => ({ start: subHours(new Date(), 1), end: new Date() }) },
  { label: 'Last 24 hours', getValue: () => ({ start: subHours(new Date(), 24), end: new Date() }) },
  { label: 'Last 7 days', getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { label: 'Last 30 days', getValue: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
]


export const TimeRangePicker: React.FC<TimeRangePickerProps> = ({ onTimeRangeChange, currentRange }) => {
  const [showPicker, setShowPicker] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const handlePresetClick = (preset: typeof presetRanges[0]) => {
    const range = preset.getValue()
    onTimeRangeChange({
      start: range.start,
      end: range.end,
      label: preset.label
    })
    setShowPicker(false)
  }

  const handleCustomRange = () => {
    if (customStart && customEnd) {
      const start = new Date(customStart)
      const end = new Date(customEnd)
      onTimeRangeChange({
        start,
        end,
        label: 'Custom'
      })
      setShowPicker(false)
    }
  }

  const formatDateTime = (date: Date) => {
    return date.toISOString().slice(0, 16)
  }

  return (
    <Flex direction="column" gap="2" style={{ position: 'relative' }}>
      <Button
        variant="outline"
        onClick={() => setShowPicker(!showPicker)}
        style={{ width: 'fit-content' }}
      >
        {currentRange.label}
      </Button>

      {showPicker && (
        <Card
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            zIndex: 1000,
            width: '200px',
            padding: '12px',
            backgroundColor: 'var(--color-panel-solid)',
            border: '1px solid var(--gray-6)',
            borderRadius: 'var(--radius-3)',
          }}
        >
          <Flex direction="column" gap="4">
            {/* Single column - Preset ranges only */}
            <Flex direction="column" gap="2">
              {presetRanges.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  onClick={() => handlePresetClick(preset)}
                  style={{
                    justifyContent: 'flex-start',
                    backgroundColor: currentRange.label === preset.label ? 'var(--gray-3)' : 'transparent'
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </Flex>
          </Flex>
        </Card>
      )}
    </Flex>
  )
}