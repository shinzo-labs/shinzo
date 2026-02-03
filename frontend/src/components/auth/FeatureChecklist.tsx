import React from 'react'
import { Flex, Text, Heading, Box } from '@radix-ui/themes'
import {
  ActivityLogIcon,
  BarChartIcon,
  GlobeIcon,
  LightningBoltIcon,
  MixerHorizontalIcon,
  RocketIcon
} from '@radix-ui/react-icons'

interface FeatureItem {
  icon: React.ReactNode
  title: string
}

const features: FeatureItem[] = [
  {
    icon: <ActivityLogIcon width="20" height="20" />,
    title: 'Real-time trace analysis for AI agent sessions'
  },
  {
    icon: <BarChartIcon width="20" height="20" />,
    title: 'Token usage analytics and cost tracking'
  },
  {
    icon: <LightningBoltIcon width="20" height="20" />,
    title: 'Identify performance bottlenecks instantly'
  },
  {
    icon: <MixerHorizontalIcon width="20" height="20" />,
    title: 'MCP server monitoring and tool usage stats'
  },
  {
    icon: <GlobeIcon width="20" height="20" />,
    title: 'OpenTelemetry compliant, industry standard'
  },
  {
    icon: <RocketIcon width="20" height="20" />,
    title: 'Self-hostable with enterprise-grade security'
  }
]

export const FeatureChecklist: React.FC = () => {
  return (
    <Box className="feature-checklist-panel">
      <Flex direction="column" gap="6" style={{ maxWidth: '480px' }}>
        <Flex direction="column" gap="3">
          <Heading size="7" style={{ color: 'white', fontWeight: 600 }}>
            AI Agent Observability Platform
          </Heading>
          <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            From development to production, gain complete visibility into your AI agents and MCP servers
          </Text>
        </Flex>

        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '20px'
          }}
        >
          {features.map((feature, index) => (
            <Flex
              key={index}
              align="start"
              gap="3"
              style={{
                padding: '16px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.15)'
              }}
            >
              <Flex
                align="center"
                justify="center"
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: 'white',
                  flexShrink: 0
                }}
              >
                {feature.icon}
              </Flex>
              <Text size="2" style={{ color: 'white', lineHeight: 1.5 }}>
                {feature.title}
              </Text>
            </Flex>
          ))}
        </Box>
      </Flex>
    </Box>
  )
}
