import React from 'react'
import { Flex, Text, Select, IconButton } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  pageSizeOptions?: number[]
  isLoading?: boolean
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  isLoading = false
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  // Generate page numbers to show (max 5 pages at a time)
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push('ellipsis')
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis')
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  return (
    <Flex
      align="center"
      justify="between"
      gap="4"
      style={{
        padding: '12px 0',
        borderTop: '1px solid var(--gray-6)'
      }}
    >
      {/* Left side: Items count and page size */}
      <Flex align="center" gap="4">
        <Text size="2" color="gray">
          Showing {startItem}-{endItem} of {totalItems}
        </Text>

        <Flex align="center" gap="2">
          <Text size="2" color="gray">Rows per page:</Text>
          <Select.Root
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
            disabled={isLoading}
          >
            <Select.Trigger style={{ minWidth: '70px' }} />
            <Select.Content>
              {pageSizeOptions.map((size) => (
                <Select.Item key={size} value={String(size)}>
                  {size}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Flex>
      </Flex>

      {/* Right side: Page navigation */}
      <Flex align="center" gap="1">
        {/* First page */}
        <IconButton
          variant="ghost"
          size="1"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1 || isLoading}
        >
          <Icons.DoubleArrowLeftIcon />
        </IconButton>

        {/* Previous page */}
        <IconButton
          variant="ghost"
          size="1"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
        >
          <Icons.ChevronLeftIcon />
        </IconButton>

        {/* Page numbers */}
        <Flex align="center" gap="1" style={{ margin: '0 8px' }}>
          {getPageNumbers().map((page, index) => (
            page === 'ellipsis' ? (
              <Text key={`ellipsis-${index}`} size="2" color="gray" style={{ padding: '0 4px' }}>
                ...
              </Text>
            ) : (
              <IconButton
                key={page}
                variant={page === currentPage ? 'solid' : 'ghost'}
                size="1"
                onClick={() => onPageChange(page)}
                disabled={isLoading}
                style={{
                  minWidth: '32px',
                  fontWeight: page === currentPage ? 600 : 400
                }}
              >
                {page}
              </IconButton>
            )
          ))}
        </Flex>

        {/* Next page */}
        <IconButton
          variant="ghost"
          size="1"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0 || isLoading}
        >
          <Icons.ChevronRightIcon />
        </IconButton>

        {/* Last page */}
        <IconButton
          variant="ghost"
          size="1"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || totalPages === 0 || isLoading}
        >
          <Icons.DoubleArrowRightIcon />
        </IconButton>
      </Flex>
    </Flex>
  )
}

// Helper hook for pagination state management
export const usePagination = (initialPageSize = 25) => {
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(initialPageSize)

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setPage(1) // Reset to first page when page size changes
  }

  const resetPage = () => {
    setPage(1)
  }

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    handlePageChange,
    handlePageSizeChange,
    resetPage
  }
}

// Sortable column header component
export interface SortableHeaderProps {
  label: string
  sortKey: string
  currentSort: string | null
  currentDirection: 'asc' | 'desc'
  onSort: (key: string) => void
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  sortKey,
  currentSort,
  currentDirection,
  onSort
}) => {
  const isActive = currentSort === sortKey

  return (
    <Flex
      align="center"
      gap="1"
      style={{ cursor: 'pointer', userSelect: 'none' }}
      onClick={() => onSort(sortKey)}
    >
      <Text size="2" weight="medium">{label}</Text>
      {isActive ? (
        currentDirection === 'asc' ? (
          <Icons.ChevronUpIcon width="14" height="14" />
        ) : (
          <Icons.ChevronDownIcon width="14" height="14" />
        )
      ) : (
        <Icons.CaretSortIcon width="14" height="14" color="var(--gray-8)" />
      )}
    </Flex>
  )
}

// Helper hook for sort state management
export const useSort = (defaultSort: string | null = null, defaultDirection: 'asc' | 'desc' = 'desc') => {
  const [sortKey, setSortKey] = React.useState<string | null>(defaultSort)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>(defaultDirection)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to descending
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  return {
    sortKey,
    sortDirection,
    handleSort
  }
}
