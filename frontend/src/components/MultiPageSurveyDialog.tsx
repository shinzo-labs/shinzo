import React, { useState } from 'react'
import { Flex, Text, Heading, Button, Card, Checkbox, Callout, Badge, Dialog, RadioGroup, TextField } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'

export interface QuestionOption {
  label: string
  value: string
  description?: string
  icon?: React.ReactNode
  requiresTextInput?: boolean // If true, shows text input when selected
}

export interface Question {
  id: string
  type: 'multi-select' | 'single-select' | 'single-select-radio'
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
  hideRequiredBadge?: boolean // If true, hides the "Required" badge even when questions are required
}

interface MultiPageSurveyDialogProps {
  open: boolean
  config: SurveyConfig
  onSubmit: (answers: Record<string, string | string[]>) => Promise<void>
}

export const MultiPageSurveyDialog: React.FC<MultiPageSurveyDialogProps> = ({ open, config, onSubmit }) => {
  const [currentPage, setCurrentPage] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [textInputs, setTextInputs] = useState<Record<string, string>>({}) // For "Other" and "Something Else" inputs
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hoveredOption, setHoveredOption] = useState<string | null>(null) // Track which option is hovered

  const currentQuestion = config.questions[currentPage]
  const isLastPage = currentPage === config.questions.length - 1
  const isFirstPage = currentPage === 0

  // Check if current question is answered
  const isAnswered = (questionId: string): boolean => {
    const answer = answers[questionId]
    if (!answer) return false
    if (Array.isArray(answer)) {
      // For multi-select, check if any require text input and if they're filled
      const selectedOptions = currentQuestion.options.filter(opt => answer.includes(opt.value))
      const requiresText = selectedOptions.some(opt => opt.requiresTextInput)
      if (requiresText) {
        return answer.length > 0 && selectedOptions.every(opt =>
          !opt.requiresTextInput || (textInputs[`${questionId}_${opt.value}`] || '').trim().length > 0
        )
      }
      return answer.length > 0
    }
    // For single-select, check if it requires text input
    const selectedOption = currentQuestion.options.find(opt => opt.value === answer)
    if (selectedOption?.requiresTextInput) {
      return answer !== '' && (textInputs[`${questionId}_${answer}`] || '').trim().length > 0
    }
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

    // Clear text input if deselecting an option that requires text
    if (currentAnswer.includes(value)) {
      setTextInputs(prev => {
        const newInputs = { ...prev }
        delete newInputs[`${questionId}_${value}`]
        return newInputs
      })
    }
  }

  // Handle single-select
  const handleSingleSelect = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  // Handle text input change
  const handleTextInputChange = (key: string, value: string) => {
    setTextInputs(prev => ({ ...prev, [key]: value }))
  }

  // Navigation handlers
  const handleNext = () => {
    if (currentQuestion.required && !currentQuestionAnswered) {
      setError(`Please answer this question before continuing.`)
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
      setError('This question is required and cannot be skipped.')
      return
    }
    setError(null)
    setCurrentPage(prev => Math.min(prev + 1, config.questions.length - 1))
  }

  const handleSubmit = async () => {
    if (currentQuestion.required && !currentQuestionAnswered) {
      setError('Please answer this question before submitting.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Merge text inputs into answers for options that require them
      const enrichedAnswers = { ...answers }
      Object.keys(textInputs).forEach(key => {
        const [questionId, optionValue] = key.split('_')
        if (textInputs[key]) {
          enrichedAnswers[`${questionId}_${optionValue}_text`] = textInputs[key]
        }
      })
      await onSubmit(enrichedAnswers)
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
          {currentQuestion.options.map(option => {
            const isSelected = selectedValues.includes(option.value)
            const isHovered = hoveredOption === option.value
            return (
              <Card
                key={option.value}
                onClick={() => handleMultiSelectToggle(currentQuestion.id, option.value)}
                onMouseEnter={() => setHoveredOption(option.value)}
                onMouseLeave={() => setHoveredOption(null)}
                style={{
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'var(--blue-2)' : isHovered ? 'var(--gray-3)' : undefined,
                  borderColor: isSelected ? 'var(--blue-6)' : isHovered ? 'var(--blue-4)' : undefined,
                  transition: 'all 0.2s ease'
                }}
              >
                <Flex direction="column" gap="3" style={{ padding: option.description ? '8px' : '4px 8px' }}>
                  <Flex align="center" gap="3">
                    {option.icon && (
                      <Flex
                        align="center"
                        justify="center"
                        style={{
                          width: '24px',
                          height: '24px',
                          flexShrink: 0
                        }}
                      >
                        {option.icon}
                      </Flex>
                    )}
                    <Checkbox checked={isSelected} />
                    <Flex direction="column" gap="1" style={{ flex: 1 }}>
                      <Text weight="medium">{option.label}</Text>
                      {option.description && (
                        <Text size="2" color="gray">{option.description}</Text>
                      )}
                    </Flex>
                  </Flex>
                  {option.requiresTextInput && isSelected && (
                    <TextField.Root
                      placeholder="Please specify..."
                      value={textInputs[`${currentQuestion.id}_${option.value}`] || ''}
                      onChange={(e) => {
                        e.stopPropagation()
                        handleTextInputChange(`${currentQuestion.id}_${option.value}`, e.target.value)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ marginLeft: '40px' }}
                    />
                  )}
                </Flex>
              </Card>
            )
          })}
        </Flex>
      )
    } else if (currentQuestion.type === 'single-select-radio') {
      // Radio button style for single-select
      const selectedValue = answers[currentQuestion.id] as string || ''
      return (
        <RadioGroup.Root value={selectedValue} onValueChange={(value) => handleSingleSelect(currentQuestion.id, value)}>
          <Flex direction="column" gap="2">
            {currentQuestion.options.map(option => {
              const isSelected = selectedValue === option.value
              const isHovered = hoveredOption === option.value
              return (
                <Card
                  key={option.value}
                  onClick={() => handleSingleSelect(currentQuestion.id, option.value)}
                  onMouseEnter={() => setHoveredOption(option.value)}
                  onMouseLeave={() => setHoveredOption(null)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--blue-2)' : isHovered ? 'var(--gray-3)' : undefined,
                    borderColor: isSelected ? 'var(--blue-6)' : isHovered ? 'var(--blue-4)' : undefined,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Flex direction="column" gap="3" style={{ padding: '4px 8px' }}>
                    <Flex align="center" gap="3">
                      {option.icon && (
                        <Flex
                          align="center"
                          justify="center"
                          style={{
                            width: '24px',
                            height: '24px',
                            flexShrink: 0
                          }}
                        >
                          {option.icon}
                        </Flex>
                      )}
                      <RadioGroup.Item value={option.value} />
                      <Text weight="medium" style={{ flex: 1 }}>{option.label}</Text>
                    </Flex>
                    {option.requiresTextInput && isSelected && (
                      <TextField.Root
                        placeholder="Please specify..."
                        value={textInputs[`${currentQuestion.id}_${option.value}`] || ''}
                        onChange={(e) => {
                          e.stopPropagation()
                          handleTextInputChange(`${currentQuestion.id}_${option.value}`, e.target.value)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ marginLeft: '40px' }}
                      />
                    )}
                  </Flex>
                </Card>
              )
            })}
          </Flex>
        </RadioGroup.Root>
      )
    } else {
      // Fallback to dropdown for single-select (not used currently)
      return null
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
              {currentQuestion.required && !config.hideRequiredBadge && (
                <Badge color="gray">Required</Badge>
              )}
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
