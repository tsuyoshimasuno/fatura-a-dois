# SnowUI Design System (Figma community kit) — import de referência

- **Fonte:** https://www.figma.com/design/beubf9x3kZWqhsHLaGmKer/SnowUI-Design-System--Community-?node-id=8300-425
- **file_key:** `beubf9x3kZWqhsHLaGmKer`
- **Node linkado pelo usuário:** `8300:425` (página Base)
- **Investigado em:** 2026-07-21/22, via API REST do Figma (estrutura/nomes de página e componente). O token de acesso disponível **não tem escopo para ler valores de Figma Variables em massa** — só a árvore de páginas/frames/componentes foi lida, não os valores numéricos de cor/tipografia/espaçamento/radius.

## Estrutura observada

- **FOUNDATIONS** + **"Design system"** — seções Variables / Colors / Text Styles / Effect Styles / Spacing-Size-Corner Radius, implementadas como Figma Variables (valores não lidos, ver acima).
- **Base** (node `8300:425`) — componentes atômicos: Text, Icon, IconText, Frame (variantes GroupText / TextIcon-Text / IconText-Text / Text / Icon / TextIcon-Icon / IconText-Icon), Group, Button (+ Active/Disabled), Image, Link, Navigation, Strip, Line, Tag, Badge, Chip, Separator, ButtonGroup.
- **Common / Mobile / Brand** — variações, não investigadas em detalhe nesta rodada.
- **Páginas de telas de exemplo** — Dashboard, Settings, ChatGPT/AI Chat, Authentication (SaaS genérico; ver `EXPERIENCE.md` → "Adoção do SnowUI Design System" para o confronto com a IA real do produto).

## Uso nesta rodada

Decisão registrada em `DESIGN.md` (Brand & Style, Colors, Typography, Layout & Spacing, Shapes, Components, Do's and Don'ts) e `EXPERIENCE.md` (Foundation, seção "Adoção do SnowUI Design System"): **adoção seletiva** de tokens visuais + componentes atômicos, rejeição do paradigma de layout de dashboard multi-widget do kit. Nenhum valor numérico foi extraído/adotado nesta rodada — falta de escopo de API, não decisão de design; amostragem componente-a-componente fica para a etapa de implementação.
