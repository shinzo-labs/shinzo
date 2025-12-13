import React, { useState } from 'react'
import { Flex, Text, Heading, Button, Card, Checkbox, Select, Callout, Badge, Dialog } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { useAuth } from '../contexts/AuthContext'
import { surveyService } from '../backendService'

type UsageType = 'ai-agent' | 'mcp-server'

interface InitialQuestionnaireDialogProps {
  open: boolean
  onComplete: () => void
}

export const InitialQuestionnaireDialog: React.FC<InitialQuestionnaireDialogProps> = ({ open, onComplete }) => {
  const { token } = useAuth()
  const [selectedTypes, setSelectedTypes] = useState<UsageType[]>([])
  const [role, setRole] = useState<string>('')
  const [referralSources, setReferralSources] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTypeToggle = (type: UsageType) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const handleReferralToggle = (source: string) => {
    setReferralSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    )
  }

  const handleSubmit = async () => {
    // Validate that at least one usage type is selected
    if (selectedTypes.length === 0) {
      setError('Please select at least one usage type')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Save survey responses to database
      await surveyService.saveSurvey(token!, {
        usage_types: selectedTypes,
        role: role || undefined,
        referral_sources: referralSources.length > 0 ? referralSources : undefined
      })

      // Trigger completion callback - OnboardingRoute will handle navigation
      onComplete()
    } catch (err) {
      console.error('Failed to save survey:', err)
      setError('Failed to save your responses. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={open}>
      <Dialog.Content style={{ maxWidth: '600px' }}>
        <Flex direction="column" gap="6">
          {/* Header */}
          <Flex direction="column" gap="2" align="center">
            <Icons.RocketIcon width="48" height="48" color="var(--blue-9)" />
            <Dialog.Title>
              <Heading size="6" align="center">Welcome to Shinzo!</Heading>
            </Dialog.Title>
            <Dialog.Description>
              <Text color="gray" align="center">
                Let's get you started with a few quick questions to personalize your experience
              </Text>
            </Dialog.Description>
          </Flex>

          {/* Question 1: Usage Type (Required) */}
          <Flex direction="column" gap="3">
            <Flex align="center" gap="2">
              <Heading size="4">What would you like to do with Shinzo?</Heading>
              <Badge color="red">Required</Badge>
            </Flex>
            <Text size="2" color="gray">
              Select all that apply
            </Text>

            <Card
              onClick={() => handleTypeToggle('ai-agent')}
              style={{
                cursor: 'pointer',
                backgroundColor: selectedTypes.includes('ai-agent') ? 'var(--blue-2)' : undefined,
                borderColor: selectedTypes.includes('ai-agent') ? 'var(--blue-6)' : undefined
              }}
            >
              <Flex align="center" gap="3" style={{ padding: '8px' }}>
                <Checkbox checked={selectedTypes.includes('ai-agent')} />
                <Flex direction="column" gap="1" style={{ flex: 1 }}>
                  <Text weight="medium">Track AI Agent usage</Text>
                  <Text size="2" color="gray">
                    Monitor Claude API usage, token consumption, and agent interactions
                  </Text>
                </Flex>
              </Flex>
            </Card>

            <Card
              onClick={() => handleTypeToggle('mcp-server')}
              style={{
                cursor: 'pointer',
                backgroundColor: selectedTypes.includes('mcp-server') ? 'var(--blue-2)' : undefined,
                borderColor: selectedTypes.includes('mcp-server') ? 'var(--blue-6)' : undefined
              }}
            >
              <Flex align="center" gap="3" style={{ padding: '8px' }}>
                <Checkbox checked={selectedTypes.includes('mcp-server')} />
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
                  onClick={() => handleReferralToggle(source)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: referralSources.includes(source) ? 'var(--blue-2)' : undefined,
                    borderColor: referralSources.includes(source) ? 'var(--blue-6)' : undefined
                  }}
                >
                  <Flex align="center" gap="3" style={{ padding: '4px 8px' }}>
                    <Checkbox checked={referralSources.includes(source)} />
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
            disabled={submitting || selectedTypes.length === 0}
            style={{ width: '100%' }}
          >
            {submitting ? 'Saving...' : 'Get Started'}
            <Icons.ArrowRightIcon />
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
