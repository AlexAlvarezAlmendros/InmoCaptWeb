import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-border-light bg-card-light p-6 shadow-card transition-base hover:shadow-card-hover dark:border-border-dark dark:bg-card-dark',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  );
});

CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(({ className, children, ...props }, ref) => {
  return (
    <h3 ref={ref} className={cn('text-lg font-semibold', className)} {...props}>
      {children}
    </h3>
  );
});

CardTitle.displayName = 'CardTitle';

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('', className)} {...props}>
      {children}
    </div>
  );
});

CardContent.displayName = 'CardContent';
