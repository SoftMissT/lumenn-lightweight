---
type: requirements
status: draft
created: 2026-08-30
updated: 2026-08-30
tags: [sdd, requirements, product-requirements, foundry-vtt, lumenn-lightweight]
---

# Requirements: lumenn-lightweight

> [!info] Geração do conteúdo
> Skill `prd` não disponível neste ambiente — conteúdo gerado seguindo o template local equivalente de `sdd-obsidian/templates/requirements.md`, conforme previsto pela própria skill quando uma skill delegada não está presente. Esta página é o **envelope Obsidian**: aplica frontmatter, requisitos em EARS e os wikilinks de rastreabilidade. Declara conformidade com a [[Constitution-lumenn-lightweight]].

## Clarifications

> [!question] Perguntas respondidas no passo de Clarify

- [x] Onde o usuário aciona o modo lote? → Via Settings do módulo, abrindo um `DialogV2` (`foundry.applications.api.DialogV2`) para seleção e confirmação.
- [x] O hook de upload deve avisar o usuário? → Sim, notificação relâmpago com economia de espaço (ex.: "Imagem otimizada: 2.3MB → 340KB").
- [x] O módulo funciona para jogadores comuns? → Não. Restrito a GM/Assistente (`isGM` ou permissão equivalente), alinhado com o padrão dos módulos concorrentes pesquisados.

## 1. Introdução e Visão Geral

> [!abstract] Resumo Executivo
> `lumenn-lightweight` é um módulo Foundry VTT que reduz o tamanho de imagens (Atores, Itens, Cenas) sem perda perceptível de qualidade, cobrindo tanto bibliotecas já existentes (modo lote) quanto novos uploads (hook automático via `libWrapper`). Resolve um gap real: módulos concorrentes (Geano's Scene Optimizer, Media Optimizer) cobrem cenas e/ou áudio, mas nenhum intercepta o upload em si nem cobre Atores/Itens de forma unificada e simples.

### 1.1. Problema

Mundos Foundry VTT acumulam imagens pesadas (PNG/JPEG não otimizados) em Atores, Itens e Cenas, aumentando tempo de carregamento e uso de banda para GM e jogadores. As soluções existentes exigem limpeza manual periódica (modo lote apenas) ou cobrem só parte dos tipos de asset.

### 1.2. Visão

Um módulo que resolve o problema de peso de imagem em dois momentos — na origem (upload) e na limpeza retroativa (lote) — com a menor complexidade possível de manter e contribuir (GPL-3.0, JS puro).

## 2. Metas e Objetivos

- **Meta 1**: Reduzir o tamanho de arquivo de imagens otimizadas em pelo menos 40% em relação ao original, mantendo qualidade visualmente aceitável (parâmetro configurável pelo usuário).
- **Meta 2**: Cobrir 100% dos três tipos de asset de imagem do v1 (Atores, Itens, Cenas) — gap explícito deixado pelos concorrentes pesquisados.
- **Meta 3**: Módulo instalável e funcional sem exigir configuração técnica além da instalação padrão de módulo Foundry (manifest URL) + dependência declarada (`libWrapper`).

## 3. User Stories

### US-001: Otimização automática no upload

**Descrição**: Como Game Master, eu quero que imagens sejam otimizadas automaticamente quando eu faço upload, para que eu não precise lembrar de otimizar manualmente depois.

**Critérios de Aceitação**:

- [ ] Ao subir uma imagem (PNG/JPEG) via `FilePicker`, o arquivo salvo é convertido para WebP conforme configuração de qualidade.
- [ ] Uma notificação relâmpago mostra o tamanho antes/depois.
- [ ] O usuário pode desabilitar esse comportamento via Settings.

### US-002: Limpeza de biblioteca existente (modo lote)

**Descrição**: Como Game Master, eu quero otimizar em lote as imagens já existentes no meu mundo, para reduzir o peso de uma biblioteca já acumulada sem precisar reenviar arquivo por arquivo.

**Critérios de Aceitação**:

- [ ] Um `DialogV2` acessível via Settings lista assets não otimizados (Atores, Itens, Cenas).
- [ ] O usuário pode selecionar quais otimizar e disparar o processamento em lote.
- [ ] Uma barra/indicador de progresso é exibido durante o processamento.
- [ ] Arquivos originais não são apagados automaticamente (não-destrutivo, conforme Constitution Artigo III).

### US-003: Controle de qualidade

**Descrição**: Como Game Master, eu quero ajustar o nível de compressão, para equilibrar economia de espaço e qualidade visual conforme minha necessidade.

**Critérios de Aceitação**:

- [ ] Setting numérico (slider 0.1–1.0) controla a qualidade WebP, com valor padrão sensato (a definir no Blueprint, informado por prática de mercado — Geano's usa 0.85 como default).

## 4. Requisitos Funcionais (notação EARS)

### Ubiquitous

- **RF-001**: The system shall convert optimized images to WebP format.
- **RF-002**: The system shall preserve the original file, marking it as available for manual cleanup rather than deleting it automatically.
- **RF-003**: The system shall restrict access to optimization features (upload hook toggle, batch dialog) to users with Gamemaster or Assistant Gamemaster permission.

### Event-Driven

- **RF-004**: When a user uploads an image via FilePicker and the upload-hook setting is enabled, the system shall intercept the upload via `libWrapper` and convert the file to WebP before it is saved.
- **RF-005**: When an image is optimized via the upload hook, the system shall display a notification showing the size before and after optimization.
- **RF-006**: When the Game Master opens the batch optimization dialog, the system shall list all unoptimized images across Actors, Items, and Scenes.
- **RF-007**: When the Game Master confirms a batch optimization selection, the system shall process each selected image and display progress feedback.

### State-Driven

- **RF-008**: While batch processing is in progress, the system shall display a progress indicator reflecting the number of files processed.

### Unwanted Behavior

- **RF-009**: If a file is already in WebP format and meets the configured quality/size threshold, then the system shall skip it and not reprocess it.
- **RF-010**: If the upload-hook setting is disabled, then the system shall not intercept `FilePicker.upload` and shall preserve default Foundry behavior.
- **RF-011**: If a user without Gamemaster/Assistant permission attempts to access the batch dialog or upload-hook settings, then the system shall deny access.

### Optional Feature

- **RF-012**: Where the `libWrapper` module is not installed or active, the system shall disable the upload-hook feature and notify the Game Master of the missing dependency, while keeping the batch mode fully functional.

## 5. Requisitos Não Funcionais

| ID      | Descrição                                                                                                                                               | Categoria        | Prioridade |
| :------ | :------------------------------------------------------------------------------------------------------------------------------------------------------ | :--------------- | :--------- |
| RNF-001 | The system shall achieve at least 40% file size reduction on typical unoptimized PNG/JPEG assets at default quality settings.                           | Performance      | Alta       |
| RNF-002 | The system shall not freeze the Foundry UI thread during batch processing of large libraries (processing shall be chunked/async).                       | Performance      | Alta       |
| RNF-003 | The system shall function on Foundry VTT v13.350 through v14.999.                                                                                       | Compatibilidade  | Crítica    |
| RNF-004 | The system's codebase shall be written in plain JavaScript (ES Modules), with no TypeScript or build step required to run.                              | Manutenibilidade | Alta       |
| RNF-005 | The system shall have automated test coverage (vitest) for all pure functions (compression, size calculation) before being considered feature-complete. | Qualidade        | Alta       |

## 6. Não-Objetivos (Out of Scope)

- Não será implementado: otimização de vídeo (fica para v2, ver [[Constitution-lumenn-lightweight#Artigo VI]]).
- Não será implementado: otimização de áudio (fora do escopo declarado do projeto; diferencial do módulo é imagem+vídeo, não áudio).
- Não será implementado: acesso de jogadores comuns (não-GM) às funcionalidades do módulo.
- Não será implementado: exclusão automática dos arquivos originais após otimização.

## 7. Glossário

- **Modo Lote**: Fluxo de otimização retroativa de assets já existentes no mundo, disparado manualmente pelo GM via Settings/DialogV2.
- **Hook de Upload**: Interceptação do método `FilePicker.upload` via `libWrapper`, otimizando imagens no momento do envio.
- **Asset não otimizado**: Imagem em formato PNG/JPEG (não-WebP) ou WebP acima do limiar de qualidade/tamanho configurado.

## 8. Perguntas Abertas

- [ ] Qual o valor padrão exato do slider de qualidade (0.1–1.0)? A definir no Blueprint, usando 0.85 (padrão do Geano's) como ponto de partida sujeito a validação.
- [ ] O que constitui "GM ou Assistente" tecnicamente na API do Foundry (`game.user.isGM` cobre Assistant GM também, ou é necessário checar `game.user.role` explicitamente)? Marcado como pendência de Research antes do Blueprint.

---

**Conformidade**: este documento adere à [[Constitution-lumenn-lightweight]].

**Documentos Relacionados**:

- [[Constitution-lumenn-lightweight]]
- [[PDR-lumenn-lightweight]]
- [[Research-lumenn-lightweight]]
- [[Blueprint-lumenn-lightweight]]
- [[Specs-lumenn-lightweight]]
