import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flex, Text, Heading, Button, Card, Checkbox, Select, Box, Callout, Badge } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { useUserPreferences } from '../contexts/UserPreferencesContext'

type UsageIntent = 'ai-agent' | 'mcp-server'

export const InitialQuestionnairePage: React.FC = () => {
  const navigate = useNavigate()
  const { savePreference } = useUserPreferences()
  const [selectedIntents, setSelectedIntents] = useState<UsageIntent[]>([])
  const [role, setRole] = useState<string>('')
  const [hearAbout, setHearAbout] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleIntentToggle = (intent: UsageIntent) => {
    setSelectedIntents(prev =>
      prev.includes(intent)
        ? prev.filter(i => i !== intent)
        : [...prev, intent]
    )
  }

  const handleHearAboutToggle = (source: string) => {
    setHearAbout(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    )
  }

  const handleSubmit = async () => {
    // Validate that at least one usage intent is selected
    if (selectedIntents.length === 0) {
      setError('Please select at least one usage intent')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Save questionnaire responses
      await savePreference('onboarding_usage_intents', selectedIntents)

      if (role) {
        await savePreference('onboarding_role', role)
      }

      if (hearAbout.length > 0) {
        await savePreference('onboarding_hear_about', hearAbout)
      }

      // Mark questionnaire as completed
      await savePreference('questionnaire_completed', true)

      // Navigate based on first selected intent
      if (selectedIntents.includes('ai-agent')) {
        navigate('/spotlight/getting-started')
      } else if (selectedIntents.includes('mcp-server')) {
        navigate('/getting-started')
      }
    } catch (err) {
      console.error('Failed to save questionnaire:', err)
      setError('Failed to save your responses. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      style={{
        minHeight: '100vh',
        background: 'var(--gray-2)',
        padding: '24px'
      }}
    >
      <Card style={{ maxWidth: '600px', width: '100%', padding: '32px' }}>
        <Flex direction="column" gap="6">
          {/* Header */}
          <Flex direction="column" gap="2" align="center">
            <Icons.RocketIcon width="48" height="48" color="var(--blue-9)" />
            <Heading size="6" align="center">Welcome to Shinzo!</Heading>
            <Text color="gray" align="center">
              Let's get you started with a few quick questions to personalize your experience
            </Text>
          </Flex>

          {/* Question 1: Usage Intent (Required) */}
          <Flex direction="column" gap="3">
            <Flex align="center" gap="2">
              <Heading size="4">What would you like to do with Shinzo?</Heading>
              <Badge color="red">Required</Badge>
            </Flex>
            <Text size="2" color="gray">
              Select all that apply
            </Text>

            <Card
              onClick={() => handleIntentToggle('ai-agent')}
              style={{
                cursor: 'pointer',
                backgroundColor: selectedIntents.includes('ai-agent') ? 'var(--blue-2)' : undefined,
                borderColor: selectedIntents.includes('ai-agent') ? 'var(--blue-6)' : undefined
              }}
            >
              <Flex align="center" gap="3" style={{ padding: '8px' }}>
                <Checkbox checked={selectedIntents.includes('ai-agent')} />
                <Flex direction="column" gap="1" style={{ flex: 1 }}>
                  <Text weight="medium">Track AI Agent usage</Text>
                  <Text size="2" color="gray">
                    Monitor Claude API usage, token consumption, and agent interactions
                  </Text>
                </Flex>
              </Flex>
            </Card>

            <Card
              onClick={() => handleIntentToggle('mcp-server')}
              style={{
                cursor: 'pointer',
                backgroundColor: selectedIntents.includes('mcp-server') ? 'var(--blue-2)' : undefined,
                borderColor: selectedIntents.includes('mcp-server') ? 'var(--blue-6)' : undefined
              }}
            >
              <Flex align="center" gap="3" style={{ padding: '8px' }}>
                <Checkbox checked={selectedIntents.includes('mcp-server')} />
                <Flex direction="column" gap="1" style={{ flex: 1 }}>
                  <Text weight="medium">Track MCP Server usage</Text>
                  <Text size="2" color="gray">
                    Monitor MCP server telemetry, traces, spans, and metrics
                  </Text>
                </Flex>
              </Flex>
            </Card>
          </Flex>

          {/* Question 2: Role (Optional) */}
          <Flex direction="column" gap="3">
            <Flex align="center" gap="2">
              <Heading size="4">What is your role?</Heading>
              <Badge color="gray">Optional</Badge>
            </Flex>
            <Select.Root value={role} onValueChange={setRole}>
              <Select.Trigger placeholder="Select your role..." style={{ width: '100%' }} />
              <Select.Content>
                <Select.Item value="software-engineer">Software Engineer</Select.Item>
                <Select.Item value="engineering-manager">Engineering Manager</Select.Item>
                <Select.Item value="product-manager">Product Manager</Select.Item>
                <Select.Item value="vp-director">VP/Director</Select.Item>
                <Select.Item value="c-suite">C-Suite/Executive</Select.Item>
                <Select.Item value="other">Other</Select.Item>
              </Select.Content>
            </Select.Root>
          </Flex>

          {/* Question 3: How did you hear about us (Optional) */}
          <Flex direction="column" gap="3">
            <Flex align="center" gap="2">
              <Heading size="4">How did you hear about Shinzo?</Heading>
              <Badge color="gray">Optional</Badge>
            </Flex>
            <Text size="2" color="gray">
              Select all that apply
            </Text>

            <Flex direction="column" gap="2">
              {['Reddit', 'LinkedIn', 'X', 'Word of Mouth', 'Website', 'Other'].map(source => (
                <Card
                  key={source}
                  onClick={() => handleHearAboutToggle(source)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: hearAbout.includes(source) ? 'var(--blue-2)' : undefined,
                    borderColor: hearAbout.includes(source) ? 'var(--blue-6)' : undefined
                  }}
                >
                  <Flex align="center" gap="3" style={{ padding: '4px 8px' }}>
                    <Checkbox checked={hearAbout.includes(source)} />
                    <Text>{source}</Text>
                  </Flex>
                </Card>
              ))}
            </Flex>
          </Flex>

          {/* Error message */}
          {error && (
            <Callout.Root color="red">
              <Callout.Icon>
                <Icons.ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          {/* Submit button */}
          <Button
            size="3"
            onClick={handleSubmit}
            disabled={submitting || selectedIntents.length === 0}
            style={{ width: '100%' }}
          >
            {submitting ? 'Saving...' : 'Get Started'}
            <Icons.ArrowRightIcon />
          </Button>
        </Flex>
      </Card>
    </Flex>
  )
}
