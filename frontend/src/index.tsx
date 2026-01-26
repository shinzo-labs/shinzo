import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { PostHogProvider } from 'posthog-js/react'
import { POSTHOG_API_KEY, POSTHOG_HOST, POSTHOG_DEBUG } from './config'

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
)

root.render(
  <React.StrictMode>
    <PostHogProvider
      apiKey={POSTHOG_API_KEY}
      options={{
        api_host: POSTHOG_HOST,
        defaults: '2025-05-24',
        capture_exceptions: true, // This enables capturing exceptions using Error Tracking
        debug: POSTHOG_DEBUG,
      }}
    >
      <App />
    </PostHogProvider>
  </React.StrictMode>
)
