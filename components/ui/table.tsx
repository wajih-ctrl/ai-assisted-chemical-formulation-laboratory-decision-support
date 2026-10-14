"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  const scrollHintId = React.useId()
  return (
    <div data-slot="table-region" className="relative w-full">
      <div className="flex items-center justify-end border-b border-border/60 bg-muted/30 px-4 py-2 text-[11px] font-medium text-muted-foreground md:hidden" aria-hidden>
        Swipe sideways to view all columns <span className="ml-1.5" aria-hidden>→</span>
      </div>
      <p id={scrollHintId} className="sr-only">This table can scroll horizontally. Use the left and right arrow keys while the table area is focused.</p>
      <div
        data-slot="table-container"
        aria-describedby={scrollHintId}
        tabIndex={0}
        className="relative w-full overflow-x-auto overscroll-x-contain scroll-thin outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/55"
      >
        <table
          data-slot="table"
          className={cn("w-full caption-bottom text-sm", className)}
          {...props}
        />
      </div>
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-muted/45 [&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "group/row border-b border-border/65 transition-colors hover:bg-primary/[0.035] has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-[0.045em] whitespace-nowrap text-muted-foreground first:sticky first:left-0 first:z-10 first:bg-muted [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-4 py-3 align-middle whitespace-nowrap first:sticky first:left-0 first:z-[5] first:bg-card group-hover/row:first:bg-[#f8fbfb] group-data-[state=selected]/row:first:bg-muted [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
