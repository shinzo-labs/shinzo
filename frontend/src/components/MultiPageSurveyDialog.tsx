import React, { useState } from 'react'
import { Flex, Text, Heading, Button, Card, Checkbox, Select, Callout, Badge, Dialog } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'

export interface QuestionOption {
  label: string
  value: string
  description?: string
}

export interface Question {
  id: string
  type: 'multi-select' | 'single-select'
  question: string
  description?: string
  required: boolean
  options: QuestionOption[]
}

export interface SurveyConfig {
  title: string
  description: string
  icon?: React.ReactNode
  questions: Question[]
}

interface MultiPageSurveyDialogProps {
  open: boolean
  config: SurveyConfig
  onSubmit: (answers: Record<string, string | string[]>) => Promise<void>
}

export const MultiPageSurveyDialog: React.FC<MultiPageSurveyDialogProps> = ({ open, config, onSubmit }) => {
  const [currentPage, setCurrentPage] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentQuestion = config.questions[currentPage]
  const isLastPage = currentPage === config.questions.length - 1
  const isFirstPage = currentPage === 0

  // Check if current question is answered
  const isAnswered = (questionId: string): boolean => {
    const answer = answers[questionId]
    if (!answer) return false
    if (Array.isArray(answer)) return answer.length > 0
    return answer !== ''
  }

  const currentQuestionAnswered = isAnswered(currentQuestion.id)

  // Handle multi-select toggle
  const handleMultiSelectToggle = (questionId: string, value: string) => {
    const currentAnswer = (answers[questionId] as string[]) || []
    const newAnswer = currentAnswer.includes(value)
      ? currentAnswer.filter(v => v !== value)
      : [...currentAnswer, value]
    setAnswers(prev => ({ ...prev, [questionId]: newAnswer }))
  }

  // Handle single-select
  const handleSingleSelect = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  // Navigation handlers
  const handleNext = () => {
    if (currentQuestion.required && !currentQuestionAnswered) {
      setError(`Please answer this question before continuing`)
      return
    }
    setError(null)
    setCurrentPage(prev => Math.min(prev + 1, config.questions.length - 1))
  }

  const handlePrevious = () => {
    setError(null)
    setCurrentPage(prev => Math.max(prev - 1, 0))
  }

  const handleSkip = () => {
    if (currentQuestion.required) {
      setError('This question is required and cannot be skipped')
      return
    }
    setError(null)
    setCurrentPage(prev => Math.min(prev + 1, config.questions.length - 1))
  }

  const handleSubmit = async () => {
    if (currentQuestion.required && !currentQuestionAnswered) {
      setError('Please answer this question before submitting')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await onSubmit(answers)
    } catch (err) {
      console.error('Failed to submit survey:', err)
      setError('Failed to submit your responses. Please try again.')
      setSubmitting(false)
    }
  }

  // Render question based on type
  const renderQuestion = () => {
    if (currentQuestion.type === 'multi-select') {
      const selectedValues = (answers[currentQuestion.id] as string[]) || []
      return (
        <Flex direction="column" gap="2">
          {currentQuestion.options.map(option => (
            <Card
              key={option.value}
              onClick={() => handleMultiSelectToggle(currentQuestion.id, option.value)}
              style={{
                cursor: 'pointer',
                backgroundColor: selectedValues.includes(option.value) ? 'var(--blue-2)' : undefined,
                borderColor: selectedValues.includes(option.value) ? 'var(--blue-6)' : undefined
              }}
            >
              <Flex align="center" gap="3" style={{ padding: option.description ? '8px' : '4px 8px' }}>
                <Checkbox checked={selectedValues.includes(option.value)} />
                <Flex direction="column" gap="1" style={{ flex: 1 }}>
                  <Text weight="medium">{option.label}</Text>
                  {option.description && (
                    <Text size="2" color="gray">{option.description}</Text>
                  )}
                </Flex>
              </Flex>
            </Card>
          ))}
        </Flex>
      )
    } else {
      // single-select
      const selectedValue = answers[currentQuestion.id] as string || ''
      return (
        <Select.Root value={selectedValue} onValueChange={(value) => handleSingleSelect(currentQuestion.id, value)}>
          <Select.Trigger placeholder="Select an option..." style={{ width: '100%' }} />
          <Select.Content>
            {currentQuestion.options.map(option => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      )
    }
  }

  return (
    <Dialog.Root open={open}>
      <Dialog.Content style={{ maxWidth: '600px' }}>
        <Flex direction="column" gap="6">
          {/* Header - only show on first page */}
          {isFirstPage && (
            <Flex direction="column" gap="2" align="center">
              {config.icon}
              <Dialog.Title>
                <Heading size="6" align="center">{config.title}</Heading>
              </Dialog.Title>
              <Dialog.Description>
                <Text color="gray" align="center">{config.description}</Text>
              </Dialog.Description>
            </Flex>
          )}

          {/* Question */}
          <Flex direction="column" gap="3">
            <Flex align="center" gap="2">
              <Heading size="4">{currentQuestion.question}</Heading>
              <Badge color={currentQuestion.required ? 'red' : 'gray'}>
                {currentQuestion.required ? 'Required' : 'Optional'}
              </Badge>
            </Flex>
            {currentQuestion.description && (
              <Text size="2" color="gray">{currentQuestion.description}</Text>
            )}
            {renderQuestion()}
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

          {/* Pagination indicators */}
          <Flex justify="center" gap="2">
            {config.questions.map((_, index) => (
              <div
                key={index}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: index <= currentPage ? 'var(--blue-9)' : 'var(--gray-6)',
                  transition: 'background-color 0.2s'
                }}
              />
            ))}
          </Flex>

          {/* Navigation buttons */}
          <Flex gap="3" justify="between">
            <Button
              variant="soft"
              onClick={handlePrevious}
              disabled={isFirstPage || submitting}
              style={{ visibility: isFirstPage ? 'hidden' : 'visible' }}
            >
              <Icons.ArrowLeftIcon />
              Previous
            </Button>

            <Flex gap="2">
              {!isLastPage && !currentQuestion.required && !currentQuestionAnswered && (
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  disabled={submitting}
                >
                  Skip
                </Button>
              )}
              {!isLastPage ? (
                <Button
                  onClick={handleNext}
                  disabled={submitting || (currentQuestion.required && !currentQuestionAnswered)}
                >
                  Next
                  <Icons.ArrowRightIcon />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || (currentQuestion.required && !currentQuestionAnswered)}
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                  <Icons.CheckIcon />
                </Button>
              )}
            </Flex>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
