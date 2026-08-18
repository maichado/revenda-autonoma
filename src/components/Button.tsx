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
    'bg-primary text-zinc-900 shadow-sm hover:bg-primary-400 focus-visible:ring-primary/35',
  secondary:
    'bg-zinc-100/90 text-zinc-900 hover:bg-zinc-200/90 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12] focus-visible:ring-primary/35',
  ghost:
    'bg-transparent text-zinc-700 hover:bg-black/[0.04] dark:text-zinc-200 dark:hover:bg-white/[0.06] focus-visible:ring-primary/35',
  danger:
    'bg-red-500 text-white shadow-sm hover:bg-red-600 focus-visible:ring-red-500/35',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-xl',
  md: 'h-10 px-4 text-sm rounded-xl',
  lg: 'h-12 px-5 text-[15px] rounded-2xl',
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
        'inline-flex select-none items-center justify-center gap-2 font-medium tracking-tight',
        'btn-press focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
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
