import React from 'react'
import { Flex, Box, Heading, Text, Callout } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'

interface OnboardingHeaderProps {
  title: string
  description: string
  successMessage?: string
  showSuccess?: boolean
  videoUrl?: string
  videoTitle?: string
}

export const OnboardingHeader: React.FC<OnboardingHeaderProps> = ({
  title,
  description,
  successMessage,
  showSuccess,
  videoUrl,
  videoTitle
}) => {
  return (
    <Flex gap="6" align="start">
      {/* Left: Header and success banner */}
      <Flex direction="column" gap="4" style={{ flex: 1 }}>
        {/* Page header */}
        <Box>
          <Heading size="6">{title}</Heading>
          <Text color="gray">{description}</Text>
        </Box>

        {/* Success banner if condition is met */}
        {showSuccess && successMessage && (
          <Callout.Root color="green">
            <Callout.Icon>
              <Icons.CheckCircledIcon />
            </Callout.Icon>
            <Callout.Text>{successMessage}</Callout.Text>
          </Callout.Root>
        )}
      </Flex>

      {/* Right: Video tutorial (optional) */}
      {videoUrl && (
        <Box
          style={{
            width: '400px',
            height: '225px',
            flexShrink: 0
          }}
        >
          <iframe
            src={videoUrl}
            title={videoTitle || title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: 'var(--radius-3)'
            }}
          />
        </Box>
      )}
    </Flex>
  )
}
