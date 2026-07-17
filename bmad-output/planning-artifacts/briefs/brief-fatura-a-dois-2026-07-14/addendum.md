---
title: Fatura a Dois - Addendum
status: draft
created: 2026-07-14
updated: 2026-07-14
---

# Addendum: Fatura a Dois

Contexto técnico e decisões de detalhe levantadas durante a conversa que não cabem no brief, mas que serão úteis para o PRD e a arquitetura.

## Estrutura observada no PDF de fatura (Itaú)

A partir de uma fatura de exemplo fornecida pelo usuário:

- O PDF agrupa lançamentos em seções por **titular** e por **cartão (identificado pelos 4 últimos dígitos)**. Uma mesma pessoa pode ter vários cartões (cartão físico principal, cartão adicional/virtual, cartão para compras internacionais, etc.), cada um com sua própria seção de lançamentos. A identificação de "quem gastou" deve vir desse agrupamento estrutural, não de uma tabela manual "número de cartão → pessoa".
- Cada lançamento já vem com colunas: data, estabelecimento, valor, e uma **categoria própria do banco** (ex.: ALIMENTAÇÃO, SAÚDE, VESTUÁRIO, VEÍCULOS, DIVERSOS, EDUCAÇÃO, HOBBY, TURISMO E ENTRETENIMENTO) mais a cidade do estabelecimento. O usuário decidiu **não usar essas categorias do banco** como categoria final — quer categorias próprias — mas essa categoria do banco pode servir de sinal auxiliar para a auto-categorização (ou seja, como feature extra, não como fonte de verdade).
- Existe uma seção separada, **"Compras parceladas - próximas faturas"**, com data da compra original, estabelecimento e valor da parcela — essa é a fonte de dados para a visão de parcelamentos futuros pedida pelo usuário. É uma seção distinta dos lançamentos do mês corrente.
- O PDF também contém seções fora do escopo do produto que o parser precisa reconhecer e ignorar sem quebrar: lançamentos internacionais (com conversão de dólar), cabeçalho com dados pessoais (nome, endereço, código de barras), rodapés informativos do banco, além do bloco financeiro do rotativo/limites/simulações (ver "Decisões de escopo explicitamente descartadas" abaixo).

## Decisões de escopo explicitamente descartadas

- Múltiplos bancos: descartado por ora — usuário confirmou que é sempre o mesmo banco.
- Excel como formato de entrada: descartado — o usuário inicialmente mencionou Excel, mas o arquivo real disponível é PDF de fatura; o brief assume PDF como fonte primária pois foi o que o usuário validou. Ação para a arquitetura: reconfirmar se não existe uma exportação CSV/Excel alternativa no internet banking, o que seria estruturalmente mais simples e robusto que parsing de PDF.
- Juros, encargos, crédito rotativo, limites: mencionados no PDF mas fora do que o usuário pediu — tratar como fora de escopo, não como esquecimento.

## Segurança — nível de conhecimento do usuário

O usuário declarou explicitamente não ter conhecimento de segurança ("não conheço nada de segurança"). Isso significa que decisões técnicas de segurança (autenticação, criptografia, hospedagem) devem ser propostas de forma completa pela arquitetura, não apenas coletadas como preferência do usuário — ele está delegando a competência técnica, não só a escolha.
