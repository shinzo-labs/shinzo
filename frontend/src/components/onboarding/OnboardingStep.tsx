import React from 'react'
import { Card, Flex, Heading, Text } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'

interface OnboardingStepProps {
  stepNumber: number | React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
  variant?: 'default' | 'success' | 'pending'
}

export const OnboardingStep: React.FC<OnboardingStepProps> = ({
  stepNumber,
  title,
  description,
  children,
  variant = 'default'
}) => {
  const getStepBackgroundColor = () => {
    switch (variant) {
      case 'success':
        return 'var(--green-3)'
      case 'pending':
        return 'var(--blue-3)'
      default:
        return 'var(--blue-3)'
    }
  }

  const getStepColor = () => {
    switch (variant) {
      case 'success':
        return 'var(--green-9)'
      case 'pending':
        return 'var(--blue-9)'
      default:
        return 'var(--blue-9)'
    }
  }

  const getCardStyle = () => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: 'var(--green-2)',
          borderColor: 'var(--green-6)'
        }
      case 'pending':
        return {
          backgroundColor: 'var(--gray-2)',
          borderColor: 'var(--gray-6)'
        }
      default:
        return {}
    }
  }

  return (
    <Card style={getCardStyle()}>
      <Flex direction="column" gap="4">
        <Flex align="center" gap="3">
          <Flex
            align="center"
            justify="center"
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: getStepBackgroundColor(),
              borderRadius: '50%',
              color: getStepColor(),
              fontWeight: 'bold'
            }}
          >
            {typeof stepNumber === 'number' ? stepNumber : stepNumber}
          </Flex>
          <Heading size="4">{title}</Heading>
        </Flex>

        {description && (
          <Text color="gray">{description}</Text>
        )}

        {children}
      </Flex>
    </Card>
  )
}
