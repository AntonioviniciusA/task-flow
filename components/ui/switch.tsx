"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-7 w-12 max-w-12 shrink-0 items-center rounded-full border-2 border-transparent transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-[#34C759]/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[#34C759] data-[state=unchecked]:bg-neutral-200 dark:data-[state=unchecked]:bg-neutral-800",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
