import React from 'react'
import * as Icons from '@radix-ui/react-icons'
import { useAuth } from '../contexts/AuthContext'
import { surveyService } from '../backendService'
import { MultiPageSurveyDialog, SurveyConfig } from './MultiPageSurveyDialog'

interface InitialQuestionnaireDialogProps {
  open: boolean
  onComplete: () => void
}

export const InitialQuestionnaireDialog: React.FC<InitialQuestionnaireDialogProps> = ({ open, onComplete }) => {
  const { token } = useAuth()

  // Survey configuration
  const surveyConfig: SurveyConfig = {
    title: 'Welcome to Shinzo!',
    description: "Let's get you started with a few quick questions to personalize your experience.",
    icon: <img src="/images/ShinzoIcon512.png" alt="Shinzo" width="64" height="64" />,
    hideRequiredBadge: true, // All questions are required, so no need to show the badge
    questions: [
      {
        id: 'usage_types',
        type: 'multi-select',
        question: 'What would you like to do with Shinzo?',
        description: 'Select all that apply.',
        required: true,
        options: [
          {
            label: 'Track AI Agent usage',
            value: 'ai-agent',
            description: 'Monitor Claude API usage, token consumption, and agent interactions.'
          },
          {
            label: 'Track MCP Server usage',
            value: 'mcp-server',
            description: 'Monitor MCP server telemetry, traces, spans, and metrics.'
          },
          {
            label: 'Something Else',
            value: 'something-else',
            requiresTextInput: true
          }
        ]
      },
      {
        id: 'role',
        type: 'single-select-radio',
        question: 'What is your role?',
        required: true,
        options: [
          { label: 'Software Engineer', value: 'software-engineer' },
          { label: 'Engineering Manager', value: 'engineering-manager' },
          { label: 'Product Manager', value: 'product-manager' },
          { label: 'VP/Director', value: 'vp-director' },
          { label: 'C-Suite/Executive', value: 'c-suite' },
          { label: 'Other', value: 'other', requiresTextInput: true }
        ]
      },
      {
        id: 'referral_sources',
        type: 'multi-select',
        question: 'How did you hear about Shinzo?',
        description: 'Select all that apply.',
        required: true,
        options: [
          {
            label: 'Reddit',
            value: 'Reddit',
            icon: <img src="/images/reddit.png" alt="Reddit" width="24" height="24" />
          },
          {
            label: 'LinkedIn',
            value: 'LinkedIn',
            icon: <img src="/images/linkedin.png" alt="LinkedIn" width="24" height="24" />
          },
          {
            label: 'X (Twitter)',
            value: 'X',
            icon: <img src="/images/x-twitter.png" alt="X (Twitter)" width="24" height="24" />
          },
          {
            label: 'Web Search',
            value: 'Website',
            icon: <Icons.GlobeIcon />
          },
          {
            label: 'Word of Mouth',
            value: 'Word of Mouth',
            icon: <Icons.PersonIcon />
          },
          {
            label: 'Other',
            value: 'Other',
            icon: <Icons.QuestionMarkCircledIcon />,
            requiresTextInput: true
          }
        ]
      }
    ]
  }

  const handleSubmit = async (answers: Record<string, string | string[]>) => {
    // Helper function to get display label for a value
    const getLabel = (questionId: string, value: string): string => {
      const question = surveyConfig.questions.find(q => q.id === questionId)
      const option = question?.options.find(opt => opt.value === value)
      return option?.label || value
    }

    // Transform usage_types to display text
    const usage_types_values = answers.usage_types as string[] || []
    const usage_types = usage_types_values.map(value => {
      // If "Something Else" is selected and has custom text, use that instead
      if (value === 'something-else' && answers['usage_types_text']) {
        return answers['usage_types_text'] as string
      }
      return getLabel('usage_types', value)
    })

    // Transform role to display text
    const role_value = answers.role as string
    let role: string | undefined
    if (role_value === 'other' && answers['role_other_text']) {
      // If "Other" is selected and has custom text, use that instead
      role = answers['role_other_text'] as string
    } else if (role_value) {
      role = getLabel('role', role_value)
    }

    // Transform referral_sources to display text
    const referral_sources_values = answers.referral_sources as string[] || []
    const referral_sources = referral_sources_values.length > 0
      ? referral_sources_values.map(value => {
          // If "Other" is selected and has custom text, use that instead
          if (value === 'Other' && answers['referral_sources_text']) {
            return answers['referral_sources_text'] as string
          }
          return getLabel('referral_sources', value)
        })
      : undefined

    await surveyService.saveSurvey(token!, {
      usage_types,
      role,
      referral_sources
    })

    // Trigger completion callback
    onComplete()
  }

  return (
    <MultiPageSurveyDialog
      open={open}
      config={surveyConfig}
      onSubmit={handleSubmit}
    />
  )
}
