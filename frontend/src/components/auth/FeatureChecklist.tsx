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
  description: string
}

const features: FeatureItem[] = [
  {
    icon: <ActivityLogIcon width="24" height="24" />,
    title: 'Real-time Trace Analysis',
    description: 'Monitor AI agent sessions with detailed execution traces and conversation flows'
  },
  {
    icon: <BarChartIcon width="24" height="24" />,
    title: 'Token Usage & Cost Tracking',
    description: 'Track token consumption and costs across all your AI models and providers'
  },
  {
    icon: <LightningBoltIcon width="24" height="24" />,
    title: 'Performance Insights',
    description: 'Identify bottlenecks and optimize response times with actionable metrics'
  },
  {
    icon: <MixerHorizontalIcon width="24" height="24" />,
    title: 'MCP Server Monitoring',
    description: 'Monitor tool usage, success rates, and performance across MCP servers'
  },
  {
    icon: <GlobeIcon width="24" height="24" />,
    title: 'OpenTelemetry Native',
    description: 'Industry-standard instrumentation that integrates with your existing stack'
  },
  {
    icon: <RocketIcon width="24" height="24" />,
    title: 'Self-Hostable',
    description: 'Deploy on your infrastructure with enterprise-grade security and compliance'
  }
]

export const FeatureChecklist: React.FC = () => {
  return (
    <Box className="feature-checklist-panel">
      <div className="feature-card">
        <Flex direction="column" gap="5">
          <Flex direction="column" gap="2">
            <Heading size="8" style={{ fontWeight: 600, color: 'white' }}>
              AI Agent Observability Platform
            </Heading>
            <Text size="4" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
              From development to production, gain complete visibility into your AI agents and MCP servers
            </Text>
          </Flex>

          <Box
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px'
            }}
          >
            {features.map((feature, index) => (
              <Box key={index} className="feature-item">
                <Flex align="center" gap="3">
                  <Flex
                    align="center"
                    justify="center"
                    className="feature-icon"
                    style={{
                      width: '36px',
                      height: '36px',
                      backgroundColor: 'var(--accent-3)',
                      borderRadius: '8px',
                      color: 'var(--accent-11)',
                      flexShrink: 0
                    }}
                  >
                    {feature.icon}
                  </Flex>
                  <Flex direction="column" gap="1">
                    <Text size="2" weight="medium">
                      {feature.title}
                    </Text>
                    <Text size="1" color="gray">
                      {feature.description}
                    </Text>
                  </Flex>
                </Flex>
              </Box>
            ))}
          </Box>
        </Flex>
      </div>
    </Box>
  )
}
