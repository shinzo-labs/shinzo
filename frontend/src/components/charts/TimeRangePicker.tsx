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
  { label: 'Last 5 minutes', getValue: () => ({ start: subMinutes(new Date(), 5), end: new Date() }) },
  { label: 'Last 15 minutes', getValue: () => ({ start: subMinutes(new Date(), 15), end: new Date() }) },
  { label: 'Last 30 minutes', getValue: () => ({ start: subMinutes(new Date(), 30), end: new Date() }) },
  { label: 'Last 1 hour', getValue: () => ({ start: subHours(new Date(), 1), end: new Date() }) },
  { label: 'Last 6 hours', getValue: () => ({ start: subHours(new Date(), 6), end: new Date() }) },
  { label: 'Last 1 day', getValue: () => ({ start: subDays(new Date(), 1), end: new Date() }) },
  { label: 'Last 3 days', getValue: () => ({ start: subDays(new Date(), 3), end: new Date() }) },
  { label: 'Last 1 week', getValue: () => ({ start: subWeeks(new Date(), 1), end: new Date() }) },
  { label: 'Last 1 month', getValue: () => ({ start: subMonths(new Date(), 1), end: new Date() }) },
]

const relativeRanges = [
  { label: 'Last 3 hours', getValue: () => ({ start: subHours(new Date(), 3), end: new Date() }) },
  { label: 'Last 4 days', getValue: () => ({ start: subDays(new Date(), 4), end: new Date() }) },
  { label: 'Last 6 weeks', getValue: () => ({ start: subWeeks(new Date(), 6), end: new Date() }) },
  { label: 'Last 12 hours', getValue: () => ({ start: subHours(new Date(), 12), end: new Date() }) },
  { label: 'Last 10 days', getValue: () => ({ start: subDays(new Date(), 10), end: new Date() }) },
  { label: 'Last 2 weeks', getValue: () => ({ start: subWeeks(new Date(), 2), end: new Date() }) },
  { label: 'Last 2 months', getValue: () => ({ start: subMonths(new Date(), 2), end: new Date() }) },
  { label: 'today', getValue: () => ({ start: new Date(new Date().setHours(0, 0, 0, 0)), end: new Date() }) },
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
            left: 0,
            zIndex: 1000,
            width: '800px',
            padding: '16px',
            backgroundColor: 'var(--color-panel-solid)',
            border: '1px solid var(--gray-6)',
            borderRadius: 'var(--radius-3)',
          }}
        >
          <Flex direction="column" gap="4">
            <Text size="3" weight="medium">Time Format (1m or 2h or 3d)</Text>

            <Grid columns="2" gap="4">
              {/* Left column - Preset ranges */}
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

                <Button
                  variant="ghost"
                  onClick={() => setShowPicker(false)}
                  style={{ justifyContent: 'flex-start', marginTop: '16px' }}
                >
                  Custom
                </Button>
              </Flex>

              {/* Right column - Relative times */}
              <Flex direction="column" gap="2">
                <Text size="2" weight="medium" color="gray" style={{ marginBottom: '8px' }}>
                  RELATIVE TIMES
                </Text>
                <Grid columns="2" gap="2">
                  {relativeRanges.map((preset) => (
                    <Button
                      key={preset.label}
                      variant="ghost"
                      size="1"
                      onClick={() => handlePresetClick(preset)}
                      style={{
                        justifyContent: 'flex-start',
                        backgroundColor: currentRange.label === preset.label ? 'var(--gray-3)' : 'transparent'
                      }}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </Grid>

                {/* Custom date range inputs */}
                <Flex direction="column" gap="2" style={{ marginTop: '16px' }}>
                  <Text size="2" color="gray">Current timezone — UTC - 7:00</Text>
                  <TextField.Root
                    placeholder="Start time"
                    type="datetime-local"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                  />
                  <TextField.Root
                    placeholder="End time"
                    type="datetime-local"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                  />
                  <Button onClick={handleCustomRange} disabled={!customStart || !customEnd}>
                    Apply Custom Range
                  </Button>
                </Flex>
              </Flex>
            </Grid>
          </Flex>
        </Card>
      )}
    </Flex>
  )
}