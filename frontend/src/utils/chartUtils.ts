// Utility functions for chart optimization

export const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true

  if (a == null || b == null) return a === b

  if (typeof a !== typeof b) return false

  if (typeof a !== 'object') return a === b

  if (Array.isArray(a) !== Array.isArray(b)) return false

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }

  const keysA = Object.keys(a)
  const keysB = Object.keys(b)

  if (keysA.length !== keysB.length) return false

  for (const key of keysA) {
    if (!keysB.includes(key)) return false
    if (!deepEqual(a[key], b[key])) return false
  }

  return true
}

// Custom comparison function for chart props
export const chartPropsEqual = (prevProps: any, nextProps: any): boolean => {
  // Compare title and height (primitive values)
  if (prevProps.title !== nextProps.title || prevProps.height !== nextProps.height) {
    return false
  }

  // Deep compare data
  return deepEqual(prevProps.data, nextProps.data)
}