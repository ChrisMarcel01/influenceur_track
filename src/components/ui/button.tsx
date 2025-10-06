import * as React from "react";
import { cn } from "./utils";
type Variant = "default" | "outline" | "ghost";
type Size = "sm" | "md";
export function Button({ className, variant="default", size="md", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?:Variant; size?:Size}) {
  const base = "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:opacity-50 disabled:pointer-events-none";
  const variants: Record<Variant, string> = {
    default: "bg-primary text-primary-foreground hover:opacity-90",
    outline: "border border-border bg-background hover:bg-muted/50",
    ghost: "hover:bg-muted/50",
  };
  const sizes: Record<Size, string> = {
    sm: "h-8 px-3",
    md: "h-10 px-4",
  };
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
