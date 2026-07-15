import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary text-zinc-900 hover:bg-primary-400 focus-visible:ring-primary/40',
  secondary:
    'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1] focus-visible:ring-primary/40',
  ghost:
    'bg-transparent text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/[0.06] focus-visible:ring-primary/40',
  danger:
    'bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500/40',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = 'primary',
    size = 'md',
    leftIcon,
    rightIcon,
    className = '',
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={[
        'inline-flex select-none items-center justify-center gap-2 rounded-lg font-medium',
        'btn-press focus:outline-none focus-visible:ring-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {leftIcon && <span className="-ml-0.5 flex">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="-mr-0.5 flex">{rightIcon}</span>}
    </button>
  )
})
