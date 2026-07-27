import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-background dark:bg-[var(--surface)] text-foreground",
        // `text-destructive/90` (opacidade reduzida) do stock shadcn foi
        // removido -- achado real do review adversarial da Story 7.9: a
        // cor `--danger` deste projeto já foi calibrada ao mínimo WCAG AA
        // (4.5:1) contra `--surface`/`--background` (ver app/globals.css),
        // e 90% de opacidade quebra essa calibração ao misturar a cor com o
        // fundo -- contraste caía para ~4.06:1 no escuro contra `--surface`
        // (abaixo do mínimo), afetando toda mensagem de erro já migrada
        // desde a Story 7.4 (login, esqueci-senha, redefinir-senha,
        // categorias, cartões). Confirmado por cálculo de contraste real
        // (não só leitura de código) antes e depois da correção.
        destructive:
          "bg-background dark:bg-[var(--surface)] text-destructive *:data-[slot=alert-description]:text-destructive [&>svg]:text-current",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
