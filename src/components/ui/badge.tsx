import * as React from "react";
import { cn } from "./utils";
type Variant = "default" | "destructive" | "outline";
export function Badge({ className, variant="default", ...props }:{ className?:string; variant?:Variant } & React.HTMLAttributes<HTMLSpanElement>){
  const styles: Record<Variant,string> = {
    default: "bg-muted text-foreground",
    destructive: "bg-red-500 text-white",
    outline: "border border-border",
  };
  return <span className={cn("inline-flex items-center rounded-md px-2 py-1 text-xs", styles[variant], className)} {...props}/>;
}
