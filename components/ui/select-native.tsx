import * as React from "react"

import { cn } from "@/lib/utils"

// `<select>` continua nativo aqui (nunca vira Radix/shadcn Select) -- decisão
// deliberada para preservar o picker do SO no mobile. A classe base é a
// mesma de `Input`, sem os modificadores `file:*`/`selection:*` (não têm
// efeito num `<select>`); `aria-invalid:*` se aplica normalmente e por isso
// foi mantido.
function SelectNative({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select-native"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        className
      )}
      {...props}
    />
  )
}

export { SelectNative }
