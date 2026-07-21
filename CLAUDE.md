# Fatura a Dois — Instruções do Projeto

## Deploy contínuo (autorização permanente)

Este projeto está linkado à Vercel (`.vercel/project.json`, projeto `bmad-project`) com deploy automático a partir de push no GitHub (`origin/master`, https://github.com/tsuyoshimasuno/fatura-a-dois). O usuário autorizou explicitamente, de forma permanente, que:

**Após qualquer commit feito neste repositório, dê `git push origin master` imediatamente, sem pedir confirmação.** Isso vale para commits feitos por qualquer meio (skills do BMad, edição direta, `bmad-dev-auto`, etc.) — a intenção é que toda mudança de código commitada chegue à produção automaticamente, fechando o loop implementar → commitar → deploy sem intervenção manual.

Não se aplica a: `git push --force`, push para outra branch que não `master`, ou qualquer outra operação destrutiva/histórico-alterando — essas continuam exigindo confirmação explícita, como de costume.

Depois do push, é aceitável verificar o status do deploy com `npx vercel ls` ou `npx vercel inspect <url>` para confirmar que o build passou, mas isso não bloqueia o push em si.

## Todo trabalho passa pelo goal-engine (autorização/diretriz permanente)

Este projeto é conduzido como uma run contínua de `bmad-goal-engine` (ver `bmad-output/planning-artifacts/goal-engine/`), não como implementação ad-hoc turno a turno. **Qualquer pedido do usuário para mudar, corrigir ou adicionar algo neste app — por menor que pareça — deve ser roteado para `bmad-goal-engine` primeiro, nunca implementado diretamente editando código na mesma resposta.** Isso vale mesmo quando o pedido não usa a palavra "objetivo" ou "goal-engine" explicitamente: frases como "consulte o agente de X", "avalie isso e implemente", "corrija isso" ou qualquer pedido de mudança de comportamento/UI/dado do produto são sinal suficiente para invocar `bmad-goal-engine` em vez de agir direto.

Não se aplica a: perguntas puramente informativas/exploratórias (sem pedido de mudança), leitura/investigação de código, e qualquer momento em que o próprio usuário disser explicitamente para implementar direto nesta sessão sem passar pelo goal-engine (exceção pontual, não revoga esta diretriz permanente).
