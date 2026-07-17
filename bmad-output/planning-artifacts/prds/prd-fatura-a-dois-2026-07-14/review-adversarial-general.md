---
review: adversarial-general
target: prd.md
date: 2026-07-14
---

# Revisão Adversarial (Cynical Review) — PRD: Fatura a Dois

## Veredito

**Requer revisão antes de seguir para arquitetura.** O PRD está bem estruturado e a maioria dos FRs tem consequências genuinamente testáveis — mas há uma contradição de fundo entre o princípio "competência é sempre escolha manual, nunca derivada de datas" (Glossário, FR-4) e a exigência de projeção de parcelas futuras (FR-12/FR-13), que só pode funcionar com derivação automática de competência. Também há chaves de deduplicação (FR-5) frágeis o suficiente para descartar lançamentos legítimos ou duplicar transações reais — exatamente no fluxo (reenvio/exportação parcial) que o PRD existe para resolver. A seção 7 (NFRs de segurança) é declarativa, não testável, apesar de tratar dados financeiros reais de pessoas reais. Nenhum destes pontos foi coberto pelas "perguntas em aberto" já resolvidas, então a alegação de §8 ("nenhuma pergunta em aberto") é otimista demais.

## Achados

1. **[ALTA] Contradição no princípio de competência.** Glossário e FR-4 afirmam explicitamente que "não há derivação automática" de competência a partir de datas — ela é sempre escolha manual no upload. Mas FR-12 exige projetar parcelas futuras e dizer "em qual competência cada uma cai" para meses que **ainda não tiveram upload nenhum**. Não existe evento de seleção manual para esses meses futuros, logo a competência das parcelas projetadas necessariamente é derivada automaticamente (competência atual + N?), contradizendo o princípio central que o FR-4 estabelece. A regra de incremento (mês calendário sequencial vs. competência sequencial de faturas enviadas, que pode ter buracos se o casal pular um mês) não está especificada em lugar nenhum.

2. **[ALTA] Reconciliação entre parcela projetada e parcela real não especificada.** FR-12 diz que "uma parcela que já apareceu na fatura deixa de ser 'futura'", o que pressupõe um mecanismo de matching entre a parcela virtual/projetada e o lançamento real extraído num upload futuro (por compra original + número da parcela? com que tolerância de valor, já que parcelas podem ter arredondamento diferente na última parcela?). Ao contrário do matching fuzzy de categorização (FR-10), que explicitamente delega o algoritmo para a fase de arquitetura, aqui o problema nem é reconhecido como algo a resolver — passa despercebido como se fosse trivial.

3. **[ALTA] Chave de deduplicação do FR-5 é frágil a colisões falsas-positivas.** "Coincide em data + estabelecimento + valor + titular/cartão" pode unificar indevidamente duas compras distintas e legítimas no mesmo estabelecimento, mesmo dia, mesmo valor (ex.: dois cafés de R$12 na mesma padaria no mesmo dia, duas idas ao mesmo posto de gasolina com valor igual). O segundo lançamento real seria silenciosamente descartado como "já existente". Nenhuma consequência testável do FR-5 cobre esse caso, e ele é bem plausível em gastos recorrentes de casal.

4. **[ALTA] Reenvio parcial pode ter valor divergente para a mesma transação real — FR-5 trata isso como lançamento novo.** Exportações de fatura em aberto (parciais) frequentemente mostram o valor pré-autorizado, que pode divergir do valor final liquidado (câmbio internacional, ajuste de gorjeta, etc.). Como a chave de dedup exige valor idêntico, uma mudança de valor entre o envio parcial e o reenvio integral faria o sistema tratar a mesma transação real como um lançamento novo — duplicando o gasto — exatamente no cenário (upload parcial → upload integral) que o "Caso de borda" da UJ-1 promete resolver sem duplicar.

5. **[MÉDIA] Exclusão de categoria (FR-7) não trata a regra memorizada (FR-10) associada.** Se uma regra de categorização aponta para uma categoria que é excluída, nada diz se a regra é removida, redirecionada ou fica "zumbi" continuando a sugerir uma categoria que não existe mais — o que contradiria a própria garantia do FR-7 de que "categoria removida deixa de aparecer como sugestão".

6. **[MÉDIA] Nenhuma regra de precedência para regras de categorização conflitantes entre as duas pessoas.** FR-10 diz que a correção "se aplica à conta combinada do casal", mas o matching é fuzzy — se as duas pessoas criam regras para padrões de estabelecimento sobrepostos (ex.: uma corrige "UBER" para "Transporte", a outra corrige "UBER EATS" para "Alimentação"), não há critério de desempate declarado. Como o casamento não é string exata, colisão é plausível e o comportamento resultante não é testável como está escrito.

7. **[MÉDIA] Remoção de lançamento (FR-5) não trata cascata sobre parcelas futuras já projetadas.** Se o lançamento removido num reenvio (ex.: estorno) era a primeira ocorrência de uma compra parcelada, o FR-5 não diz se as parcelas futuras já projetadas a partir dela (FR-12/13) são retraídas. Sem isso, o "comprometimento de limite mensal" pode continuar contando uma compra que foi estornada — o oposto do que a feature promete.

8. **[MÉDIA] Lançamento que desaparece e reaparece entre envios pode perder categorização manual.** FR-5 só protege contra sobrescrita as categorias de lançamentos "existentes". Não fica claro se um lançamento removido (por ter sumido de um reenvio) e depois reintroduzido num envio posterior (ex.: reversão de estorno) é tratado como "o mesmo lançamento" (mantendo a categoria corrigida) ou como "novo" (perdendo a correção manual e voltando à sugestão automática).

9. **[MÉDIA] NFRs de segurança (§7) são declarativos, não testáveis — inconsistente com o rigor do resto do documento.** "Dados sensíveis... protegidos em repouso" não define mecanismo (criptografia de disco? de coluna? gestão de chaves?) nem o escopo exato de "dados sensíveis" (inclui o texto do estabelecimento, que pode revelar categorias sensíveis, ex. saúde/terapia?). Diferente de toda FR do documento, essa seção não tem bloco de "Consequências testáveis" — um engenheiro não tem como verificar conformidade objetivamente, apesar de o próprio contexto do projeto (dados financeiros reais de um casal real) justificar mais rigor aqui, não menos.

10. **[MÉDIA] Combinação de "descarte do arquivo original" com ausência de requisito de backup dos dados estruturados é um risco de perda de dados irrecuperável, não mencionado.** §7 estabelece que a planilha original é descartada após extração bem-sucedida. Não há nenhuma NFR sobre backup/durabilidade dos lançamentos estruturados que resultam dessa extração. Se esses dados forem perdidos (bug, falha de disco, erro de migração), não há como reconstruir a partir do arquivo original, porque ele já foi descartado por design. As duas políticas juntas criam um risco composto que o PRD não reconhece nem mitiga.

11. **[MÉDIA] FR-6 assume implicitamente que todo titular/cartão pertence a uma das duas contas do casal.** "Associá-lo a uma das duas contas" não cobre o caso de um cartão adicional/terceiro (situação comum em faturas Itaú) que não pertence a nenhum dos dois. O §5 exclui multiusuário como não-objetivo, mas não diz o que o app faz quando o parser encontra um titular que não se encaixa no binário — erro? descarte silencioso? bloqueio do upload inteiro?

12. **[BAIXA] Nenhuma estratégia de tolerância a mudança de layout do Itaú.** FR-2 rejeita planilhas fora do "layout esperado", mas bancos alteram formato de exportação sem aviso. Sem versionamento/tolerância declarados, o app inteiro para de funcionar na próxima mudança de layout do banco — risco real para um produto cujo parser é "feito sob medida" (§5), não reconhecido como tal no documento.

13. **[BAIXA] Destino do arquivo original em uploads rejeitados não está definido.** §7 só especifica descarte "após extração bem-sucedida". Para uploads rejeitados por layout inválido (FR-2) ou corrompidos, não fica dito se o arquivo original é descartado imediatamente, retido para diagnóstico, ou fica em algum estado intermediário — lacuna na mesma seção que faz a alegação de privacidade mais forte do documento.

14. **[BAIXA] Nenhuma NFR de autenticação além de "login obrigatório" + HTTPS.** Nada sobre política de senha, timeout de sessão, proteção contra força bruta, ou — dado que "não há fluxo de auto-cadastro aberto ao público" e as 2 contas são provisionadas de antemão — como as duas pessoas recuperam acesso se esquecerem a senha. Para um app de dados financeiros reais, a ausência completa desse tópico é notável.

15. **[BAIXA] A alegação de "nenhuma pergunta em aberto" (§8) é otimista.** As quatro questões citadas como resolvidas (estorno em reenvio, precisão do fuzzy matching, definição de "limite mensal", destino de categoria removida) não cobrem as lacunas acima — em particular a derivação de competência para parcelas projetadas (achado 1) e a reconciliação projetada-vs-real (achado 2), que são pré-requisitos para implementar §4.5 corretamente.

16. **[BAIXA] FR-11 não define onde aparecem lançamentos em estado residual na visão por pessoa/categoria.** Nem lançamentos com titular ainda não mapeado (antes do fluxo FR-6 terminar) nem lançamentos marcados "categoria removida" (FR-7) têm seu lugar explicitado nas consequências testáveis do FR-11 — ficam implícitos, não especificados.

## O que está genuinamente bem feito

Para contrabalancear: o tratamento de merge por delta (FR-5) tem consequências testáveis concretas mesmo com a lacuna da chave de dedup; a decisão de competência como seleção manual (FR-4) é declarada com justificativa técnica clara (ausência de campo de fechamento na planilha); os não-objetivos (§5) são específicos e cortam escopo de verdade; e o uso de `[ASSUMPTION]` inline com índice em §9 é uma prática melhor que a maioria dos PRDs revisados neste formato.
