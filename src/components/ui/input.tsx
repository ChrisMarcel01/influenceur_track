import * as React from "react";
import { cn } from "./utils";
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return <input ref={ref} className={cn("flex h-10 w-full rounded-xl border bg-background px-3 text-sm", className)} {...props} />;
  }
);
Input.displayName = "Input";
