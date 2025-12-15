import React, { useState } from 'react'
import { Flex, Code, Button, Box } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'

interface CodeSnippetProps {
  code: string
  copyId: string
  inline?: boolean
  language?: string
}

export const CodeSnippet: React.FC<CodeSnippetProps> = ({
  code,
  copyId,
  inline = false,
  language
}) => {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (inline) {
    return (
      <Flex gap="2" align="center">
        <Code style={{ flex: 1, padding: '12px' }}>
          {code}
        </Code>
        <Button variant="soft" onClick={copyToClipboard}>
          {copied ? <Icons.CheckIcon /> : <Icons.CopyIcon />}
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </Flex>
    )
  }

  return (
    <Box style={{ position: 'relative' }}>
      <Code
        style={{
          display: 'block',
          padding: '16px',
          whiteSpace: 'pre',
          overflowX: 'auto',
          backgroundColor: 'var(--gray-2)',
          borderRadius: 'var(--radius-3)',
          fontSize: '13px',
          lineHeight: '1.6'
        }}
      >
        {code}
      </Code>
      <Button
        variant="soft"
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px'
        }}
        onClick={copyToClipboard}
      >
        <Icons.CopyIcon />
        {copied ? 'Copied!' : 'Copy'}
      </Button>
    </Box>
  )
}
