import { format, parseISO, addMinutes, addHours, addDays } from 'date-fns'

export interface TraceTimeSeriesData {
  timestamp: string
  count: number
}

export interface TracePieData {
  name: string
  value: number
  color?: string
  serviceName?: string
}

export interface Trace {
  uuid: string
  start_time: string
  end_time: string | null
  service_name: string
  operation_name: string | null
  status: string | null
  span_count: number
  duration_ms: number | null
}


export interface TimeRange {
  start: Date
  end: Date
  label: string
}

const generateMinuteIntervals = (start: Date, end: Date): Date[] => {
  const intervals: Date[] = []
  let current = new Date(start)
  while (current <= end) {
    intervals.push(new Date(current))
    current = addMinutes(current, 5) // 5-minute intervals for better performance
  }
  return intervals
}

const generateHourIntervals = (start: Date, end: Date): Date[] => {
  const intervals: Date[] = []
  let current = new Date(start)
  while (current <= end) {
    intervals.push(new Date(current))
    current = addHours(current, 1)
  }
  return intervals
}

const generateDayIntervals = (start: Date, end: Date): Date[] => {
  const intervals: Date[] = []
  let current = new Date(start)
  while (current <= end) {
    intervals.push(new Date(current))
    current = addDays(current, 1)
  }
  return intervals
}

const getTimeInterval = (timeRange: TimeRange) => {
  const diffInHours = (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60)

  if (diffInHours <= 2) {
    return { interval: 'minute', intervalFunction: (range: { start: Date; end: Date }) => generateMinuteIntervals(range.start, range.end) }
  } else if (diffInHours <= 48) {
    return { interval: 'hour', intervalFunction: (range: { start: Date; end: Date }) => generateHourIntervals(range.start, range.end) }
  } else {
    return { interval: 'day', intervalFunction: (range: { start: Date; end: Date }) => generateDayIntervals(range.start, range.end) }
  }
}

const cleanOperationName = (operationName: string | null): string => {
  if (!operationName) return 'Unknown'
  // Split on space, remove first element, rejoin
  const parts = operationName.split(' ')
  if (parts.length <= 1) return operationName
  return parts.slice(1).join(' ')
}

export const processTracesForTimeSeriesByOperation = (
  traces: Trace[],
  timeRange: TimeRange
): Record<string, TraceTimeSeriesData[]> => {
  const { intervalFunction } = getTimeInterval(timeRange)
  const timeSlots = intervalFunction({ start: timeRange.start, end: timeRange.end })

  const operations = Array.from(new Set(traces.map(t => cleanOperationName(t.operation_name))))
  const result: Record<string, TraceTimeSeriesData[]> = {}

  operations.forEach(operation => {
    const operationTraces = traces.filter(t => cleanOperationName(t.operation_name) === operation)

    result[operation] = timeSlots.map(slot => {
      const slotEnd = new Date(slot.getTime() + (timeSlots[1]?.getTime() - timeSlots[0]?.getTime() || 60000))
      const count = operationTraces.filter(trace => {
        const traceTime = parseISO(trace.start_time)
        return traceTime >= slot && traceTime < slotEnd
      }).length

      return {
        timestamp: format(slot, 'MM/dd HH:mm'),
        count
      }
    })
  })

  return result
}

export const processTracesForTimeSeriesBySession = (
  traces: Trace[],
  timeRange: TimeRange
): Record<string, TraceTimeSeriesData[]> => {
  const { intervalFunction } = getTimeInterval(timeRange)
  const timeSlots = intervalFunction({ start: timeRange.start, end: timeRange.end })

  const sessions = Array.from(new Set(traces.map(t => t.uuid.substring(0, 8))))
  const result: Record<string, TraceTimeSeriesData[]> = {}

  sessions.forEach(sessionId => {
    const sessionTraces = traces.filter(t => t.uuid.startsWith(sessionId))

    result[sessionId] = timeSlots.map(slot => {
      const slotEnd = new Date(slot.getTime() + (timeSlots[1]?.getTime() - timeSlots[0]?.getTime() || 60000))
      const count = sessionTraces.filter(trace => {
        const traceTime = parseISO(trace.start_time)
        return traceTime >= slot && traceTime < slotEnd
      }).length

      return {
        timestamp: format(slot, 'MM/dd HH:mm'),
        count
      }
    })
  })

  return result
}

export const processTracesForPieByOperation = (traces: Trace[]): TracePieData[] => {
  const operationData = traces.reduce((acc, trace) => {
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
    .map(([name, data]) => ({
      name,
      value: data.count,
      serviceName: Array.from(data.services).join(', ')
    }))
}

export const processTracesForPieBySession = (traces: Trace[]): TracePieData[] => {
  const sessionCounts = traces.reduce((acc, trace) => {
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
    .map(([name, value]) => ({
      name,
      value
    }))
}

const chartColors = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98',
  '#f0e68c', '#ff6347', '#40e0d0', '#ee82ee', '#90ee90'
]

export const addColorsToData = (data: TracePieData[]): TracePieData[] => {
  return data.map((item, index) => ({
    ...item,
    color: chartColors[index % chartColors.length]
  }))
}