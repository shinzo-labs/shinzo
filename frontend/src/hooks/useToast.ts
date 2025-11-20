export const useToast = () => {
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // Simple console implementation - can be enhanced with actual toast UI later
    console[type === 'error' ? 'error' : 'log'](`[${type.toUpperCase()}] ${message}`)
    // Could integrate with a toast library like react-hot-toast or sonner later
    alert(`${type.toUpperCase()}: ${message}`)
  }

  return { showToast }
}
