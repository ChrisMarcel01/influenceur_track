import * as React from "react";
import { cn } from "./utils";
type TabsCtx = { value: string; setValue: (v:string)=>void };
const Ctx = React.createContext<TabsCtx | null>(null);
export function Tabs({ value, onValueChange, className, children }:{ value:string; onValueChange:(v:string)=>void; className?:string; children:React.ReactNode }){
  return <div className={cn(className)}><Ctx.Provider value={{ value, setValue:onValueChange }}>{children}</Ctx.Provider></div>;
}
export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>){
  return <div className={cn("inline-grid gap-2 bg-muted/40 p-1 rounded-xl", className)} {...props}/>;
}
export function TabsTrigger({ value, className, children }:{ value:string; className?:string; children:React.ReactNode }){
  const ctx = React.useContext(Ctx)!;
  const active = ctx.value === value;
  return <button onClick={()=>ctx.setValue(value)} className={cn("px-3 py-1 rounded-lg text-sm", active ? "bg-background shadow border" : "opacity-70 hover:opacity-100", className)} data-state={active? "active":"inactive"}>{children}</button>;
}
export function TabsContent({ value, className, children }:{ value:string; className?:string; children:React.ReactNode }){
  const ctx = React.useContext(Ctx)!;
  if (ctx.value !== value) return null;
  return <div className={cn(className)}>{children}</div>;
}
