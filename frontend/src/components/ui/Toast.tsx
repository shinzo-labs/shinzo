import React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { clsx } from 'clsx'

export const Toast = () => {
  return (
    <ToastPrimitive.Provider swipeDirection="right">
      <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]" />
    </ToastPrimitive.Provider>
  )
}

interface ToastProps extends React.ComponentProps<typeof ToastPrimitive.Root> {
  variant?: 'default' | 'destructive'
}

export const ToastComponent = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  ToastProps
>(({ className, variant = 'default', ...props }, ref) => {
  return (
    <ToastPrimitive.Root
      ref={ref}
      className={clsx(
        'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
        {
          'border-gray-200 bg-white text-gray-950': variant === 'default',
          'border-red-200 bg-red-50 text-red-900': variant === 'destructive',
        },
        className
      )}
      {...props}
    />
  )
})
