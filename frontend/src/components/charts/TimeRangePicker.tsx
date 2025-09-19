import React, { useState, useEffect } from 'react'
import { Flex, Button, Text, Card, Grid, TextField } from '@radix-ui/themes'
import { subMinutes, subHours, subDays, subWeeks, subMonths } from 'date-fns'
import { useUserPreferences } from '../../contexts/UserPreferencesContext'

export interface TimeRange {
  start: Date
  end: Date
  label: string
}

interface TimeRangePickerProps {
  onTimeRangeChange: (timeRange: TimeRange) => void
  currentRange: TimeRange
  preferenceKey?: string // Optional preference key to save the selection
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


export const TimeRangePicker: React.FC<TimeRangePickerProps> = ({ onTimeRangeChange, currentRange, preferenceKey }) => {
  const [showPicker, setShowPicker] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const { savePreference, getPreference } = useUserPreferences()

  // Load saved preference on mount
  useEffect(() => {
    if (preferenceKey) {
      const savedRange = getPreference(preferenceKey)
      if (savedRange && savedRange.label) {
        // Find the matching preset
        const matchingPreset = presetRanges.find(preset => preset.label === savedRange.label)
        if (matchingPreset) {
          const range = matchingPreset.getValue()
          onTimeRangeChange({
            start: range.start,
            end: range.end,
            label: matchingPreset.label
          })
        }
      }
    }
  }, [preferenceKey, getPreference, onTimeRangeChange])

  const handlePresetClick = async (preset: typeof presetRanges[0]) => {
    const range = preset.getValue()
    const timeRange = {
      start: range.start,
      end: range.end,
      label: preset.label
    }

    onTimeRangeChange(timeRange)

    // Save preference if key is provided
    if (preferenceKey) {
      try {
        await savePreference(preferenceKey, { label: preset.label })
      } catch (error) {
        console.error('Failed to save time range preference:', error)
      }
    }

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
            width: '400px',
            padding: '16px',
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