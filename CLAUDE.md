# Fatura a Dois — Instruções do Projeto

## Deploy contínuo (autorização permanente)

Este projeto está linkado à Vercel (`.vercel/project.json`, projeto `bmad-project`) com deploy automático a partir de push no GitHub (`origin/master`, https://github.com/tsuyoshimasuno/fatura-a-dois). O usuário autorizou explicitamente, de forma permanente, que:

**Após qualquer commit feito neste repositório, dê `git push origin master` imediatamente, sem pedir confirmação.** Isso vale para commits feitos por qualquer meio (skills do BMad, edição direta, `bmad-dev-auto`, etc.) — a intenção é que toda mudança de código commitada chegue à produção automaticamente, fechando o loop implementar → commitar → deploy sem intervenção manual.

Não se aplica a: `git push --force`, push para outra branch que não `master`, ou qualquer outra operação destrutiva/histórico-alterando — essas continuam exigindo confirmação explícita, como de costume.

Depois do push, é aceitável verificar o status do deploy com `npx vercel ls` ou `npx vercel inspect <url>` para confirmar que o build passou, mas isso não bloqueia o push em si.
