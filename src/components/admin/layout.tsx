"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function PageStack({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-6", className)}>{children}</div>;
}

export function SectionStack({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-4", className)}>{children}</div>;
}

export function InlineGroup({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {children}
    </div>
  );
}

export function ResponsiveGrid({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-4 md:grid-cols-3", className)}>{children}</div>;
}

export function TwoColumnGrid({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2", className)}>{children}</div>
  );
}
