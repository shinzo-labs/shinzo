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
    description: "Let's get you started with a few quick questions to personalize your experience",
    icon: <Icons.RocketIcon width="48" height="48" color="var(--blue-9)" />,
    questions: [
      {
        id: 'usage_types',
        type: 'multi-select',
        question: 'What would you like to do with Shinzo?',
        description: 'Select all that apply',
        required: true,
        options: [
          {
            label: 'Track AI Agent usage',
            value: 'ai-agent',
            description: 'Monitor Claude API usage, token consumption, and agent interactions'
          },
          {
            label: 'Track MCP Server usage',
            value: 'mcp-server',
            description: 'Monitor MCP server telemetry, traces, spans, and metrics'
          }
        ]
      },
      {
        id: 'role',
        type: 'single-select',
        question: 'What is your role?',
        required: false,
        options: [
          { label: 'Software Engineer', value: 'software-engineer' },
          { label: 'Engineering Manager', value: 'engineering-manager' },
          { label: 'Product Manager', value: 'product-manager' },
          { label: 'VP/Director', value: 'vp-director' },
          { label: 'C-Suite/Executive', value: 'c-suite' },
          { label: 'Other', value: 'other' }
        ]
      },
      {
        id: 'referral_sources',
        type: 'multi-select',
        question: 'How did you hear about Shinzo?',
        description: 'Select all that apply',
        required: false,
        options: [
          { label: 'Reddit', value: 'Reddit' },
          { label: 'LinkedIn', value: 'LinkedIn' },
          { label: 'X', value: 'X' },
          { label: 'Word of Mouth', value: 'Word of Mouth' },
          { label: 'Website', value: 'Website' },
          { label: 'Other', value: 'Other' }
        ]
      }
    ]
  }

  const handleSubmit = async (answers: Record<string, string | string[]>) => {
    // Transform answers to match API expectations
    const usage_types = answers.usage_types as string[] || []
    const role = answers.role as string || undefined
    const referral_sources = answers.referral_sources as string[] || undefined

    await surveyService.saveSurvey(token!, {
      usage_types,
      role,
      referral_sources: referral_sources && referral_sources.length > 0 ? referral_sources : undefined
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
