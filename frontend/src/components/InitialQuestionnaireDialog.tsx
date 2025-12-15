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
    // Transform answers to match API expectations
    const usage_types = answers.usage_types as string[] || []
    const role = answers.role as string || undefined
    const referral_sources = answers.referral_sources as string[] || undefined

    // Include text inputs for custom answers
    const enrichedData: any = {
      usage_types,
      role,
      referral_sources: referral_sources && referral_sources.length > 0 ? referral_sources : undefined
    }

    // Add custom text for "Something Else" if provided
    if (answers['usage_types_something-else_text']) {
      enrichedData.usage_types_custom = answers['usage_types_something-else_text']
    }

    // Add custom text for "Other" role if provided
    if (answers['role_other_text']) {
      enrichedData.role_custom = answers['role_other_text']
    }

    // Add custom text for "Other" referral source if provided
    if (answers['referral_sources_Other_text']) {
      enrichedData.referral_sources_custom = answers['referral_sources_Other_text']
    }

    await surveyService.saveSurvey(token!, enrichedData)

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
