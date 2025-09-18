import React, { useState, useEffect } from 'react'
import { Card, Flex, Text, Button, Badge, Box } from '@radix-ui/themes'
import { Cross2Icon, CheckIcon, CopyIcon } from '@radix-ui/react-icons'
import { useAuth } from '../contexts/AuthContext'
import { ingestTokenService } from '../backendService'

interface WelcomeBannerProps {
  onDismiss: () => void
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ onDismiss }) => {
  const { token } = useAuth()
  const [ingestToken, setIngestToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchToken = async () => {
      if (token) {
        try {
          const tokens = await ingestTokenService.fetchAll(token)
          if (tokens.length > 0) {
            setIngestToken(tokens[0].ingest_token)
          }
        } catch (error) {
          console.error('Failed to fetch ingest token:', error)
        }
      }
    }
    fetchToken()
  }, [token])

  const handleCopy = async () => {
    if (ingestToken) {
      await navigator.clipboard.writeText(ingestToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!ingestToken) return null

  return (
    <Card style={{
      backgroundColor: 'var(--blue-2)',
      border: '1px solid var(--blue-6)',
      marginBottom: '24px'
    }}>
      <Flex direction="column" gap="3">
        <Flex justify="between" align="start">
          <Flex direction="column" gap="2">
            <Flex align="center" gap="2">
              <CheckIcon color="var(--blue-11)" />
              <Text size="3" weight="medium" color="blue">Welcome to Shinzo Platform!</Text>
            </Flex>
            <Text size="2" color="gray">
              Your account has been verified and we've generated your first ingest token to get you started.
            </Text>
          </Flex>
          <Button
            variant="ghost"
            size="1"
            onClick={onDismiss}
            style={{ color: 'var(--gray-11)' }}
          >
            <Cross2Icon />
          </Button>
        </Flex>

        <Box style={{
          backgroundColor: 'var(--gray-1)',
          padding: '12px',
          borderRadius: 'var(--radius-2)',
          border: '1px solid var(--gray-6)'
        }}>
          <Flex direction="column" gap="2">
            <Text size="2" weight="medium">Your Ingest Token:</Text>
            <Flex align="center" gap="2">
              <Text
                size="2"
                style={{
                  fontFamily: 'monospace',
                  backgroundColor: 'var(--gray-3)',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-1)',
                  flex: 1
                }}
              >
                {ingestToken}
              </Text>
              <Button
                variant="ghost"
                size="1"
                onClick={handleCopy}
                style={{ color: copied ? 'var(--green-11)' : 'var(--gray-11)' }}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </Button>
            </Flex>
          </Flex>
        </Box>

        <Text size="2" color="gray">
          Use this token to send telemetry data to the platform. You can manage your tokens in{' '}
          <Text weight="medium" color="blue">Settings → Ingest Tokens</Text>.
        </Text>
      </Flex>
    </Card>
  )
}