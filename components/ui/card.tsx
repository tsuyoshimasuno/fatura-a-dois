import * as React from "react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-6 rounded-xl bg-background text-foreground border border-transparent shadow-[0_1px_2px_rgba(15,15,15,0.06),0_1px_1px_rgba(15,15,15,0.04)] dark:bg-[var(--surface)] dark:border-border dark:shadow-none forced-colors:border-[CanvasText] py-6",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  // `asChild` (mesmo padrão de components/ui/button.tsx) permite renderizar
  // como `<h1>`/`<h2>` real quando o Card é o heading principal de uma
  // página standalone (achado real do review adversarial da Story 7.5:
  // sem isso, `/login`, `/esqueci-senha` e `/redefinir-senha` perdiam o
  // único heading real da página ao migrar de `<h1 className="page-title">`
  // pra este componente, que por padrão renderiza uma `<div>` sem role de
  // heading nenhum). `text-[15px] m-0` neutraliza o font-size/margin padrão
  // do navegador para `<h1>` (projeto não usa Preflight do Tailwind, então
  // não há reset de heading algum) -- mantém o mesmo tamanho computado que
  // a `<div>` já tinha (herdado de `body { font-size: 15px }`).
  //
  // CUIDADO ao reusar `asChild` para um `<h2>`/`<h3>` que substitui um
  // `.section-title` legado (ex: Stories 7.6/7.8): a regra global `h1, h2,
  // h3 { font-weight: 700; letter-spacing: -0.01em }` (app/globals.css)
  // fica em `@layer base`, enquanto o `font-semibold` (600) deste
  // componente é `@layer utilities` -- utilities sempre vence sobre base
  // independente de especificidade (`@layer theme, base, components,
  // utilities;` no topo do CSS). Sem um `font-bold` explícito no
  // `className` de cada instância, o heading migrado fica silenciosamente
  // mais fino (600 em vez de 700) que o resto do app -- achado real do
  // review adversarial da Story 7.8, confirmado via `getComputedStyle`
  // contra um `<h2 className="section-title">` de referência. `leading-none`
  // acima, por outro lado, não precisa de neutralização quando combinado
  // com um `text-[Npx]` arbitrário: `tailwind-merge` (`lib/utils.ts`) trata
  // qualquer `text-[…]` como parte do grupo de conflito com `leading-*` e
  // descarta o `leading-none` da base automaticamente, então o line-height
  // já cai de volta no herdado do navegador -- verificado que bate exatamente
  // com o `.section-title` original (mesmo `line-height` computado).
  const Comp = asChild ? Slot.Root : "div"
  return (
    <Comp
      data-slot="card-title"
      className={cn("text-[15px] leading-none font-semibold m-0", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
