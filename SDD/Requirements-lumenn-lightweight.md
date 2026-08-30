---
type: requirements
status: draft
created: 2026-08-30
updated: 2026-08-30
tags: [sdd, requirements, foundry-vtt, lumenn-lightweight]
---

# Requirements: lumenn-lightweight

> [!abstract] Propósito
> Requisitos funcionais (RF) e não-funcionais (RNF) do módulo. Cada requisito é identificável, rastreável e verificável. Todo Blueprint e Spec subsequente deve referenciar estes IDs.

---

## Requisitos Funcionais

### RF-001 — Compressão WebP de imagem individual

**Como** GM ou jogador,
**Quero** que imagens enviadas via FilePicker sejam comprimidas para WebP automaticamente,
**Para que** o tamanho dos arquivos seja reduzido sem perda perceptível de qualidade.

**Critérios de aceitação:**
- [ ] Arquivos PNG, JPG e JPEG são convertidos para WebP
- [ ] Qualidade configurável via setting (0.1–1.0, default 0.75)
- [ ] Arquivo original NÃO é apagado antes de confirmar que o WebP foi criado com sucesso
- [ ] Arquivos que não atingem o threshold de economia (default 25%) são ignorados
- [ ] Notificação ao usuário com nome do arquivo e percentual de economia

---

### RF-002 — Interceptação de upload via libWrapper

**Como** desenvolvedor do módulo,
**Quero** que o hook de upload intercepte `FilePicker.prototype.upload` via libWrapper,
**Para que** a compressão ocorra de forma transparente ao usuário.

**Critérios de aceitação:**
- [ ] `libWrapper.register` é chamado no hook `ready` com target `FilePicker.prototype.upload`
- [ ] Tipo de wrapper: `WRAPPER` (chama original, pode modificar argumentos)
- [ ] Se libWrapper não está disponível, log de warning e funcionamento sem hook
- [ ] Upload de arquivos não-imagem passa direto para o wrapper original
- [ ] Erros de compressão não quebram o upload original (fallback para upload sem compressão)

---

### RF-003 — Modo lote (batch)

**Como** GM,
**Quero** otimizar todas as imagens de um diretório de uma vez,
**Para que** eu não precise fazer upload uma por uma.

**Critérios de aceitação:**
- [ ] Função `optimizeDirectory(path, options)` percorre diretório recursivamente (se `recursive: true`)
- [ ] Processa apenas arquivos PNG, JPG, JPEG
- [ ] Respeita configuração `skipExisting` (pula se .webp já existe no mesmo diretório)
- [ ] Respeita configuração `overridePercent` (não substitui se economia < threshold)
- [ ] Atualiza referênciasFoundry (`img` de Documents) após renomeação
- [ ] Retorna objeto de resultados: `{ total, optimized, skipped, failed, bytesSaved }`
- [ ] Callback `onProgress` para feedback visual

---

### RF-004 — Configurações do módulo

**Como** GM,
**Quero** configurar parâmetros de compressão via Interface do Foundry,
**Para que** eu controle qualidade e comportamento do módulo.

**Critérios de aceitação:**
- [ ] Settings registrados no hook `init` via `game.settings.register`
- [ ] `quality`: Number, range 0.1–1.0, step 0.05, default 0.75
- [ ] `overridePercent`: Number, range 0–90, step 5, default 25
- [ ] `autoOptimize`: Boolean, default true
- [ ] `skipExisting`: Boolean, default false
- [ ] Todos os labels usam i18n (`${MODULE_ID}.settings.*`)

---

### RF-005 — Interface do usuário (Dialog)

**Como** GM,
**Quero** uma interface para executar otimização em lote e ajustar configurações,
**Para que** eu não precise usar comandos de linha.

**Critérios de aceitação:**
- [ ] Dialog renderiza via `Dialog` do Foundry (Application v1)
- [ ] Slider de qualidade com display do valor atual
- [ ] Slider de economia mínima com display do valor atual
- [ ] Checkbox auto-otimizar
- [ ] Checkbox pular existente
- [ ] Botão "Otimizar Biblioteca" que executa batch
- [ ] Barra de progresso durante processamento
- [ ] Notificação ao concluír com resumo

---

### RF-006 — i18n (internacionalização)

**Como** usuário de diferentes idiomas,
**Quero** que a interface esteja disponível em inglês e português,
**Para que** eu entenda as opções sem traduzir manualmente.

**Critérios de aceitação:**
- [ ] `lang/en.json` com todas as strings
- [ ] `lang/pt-BR.json` com todas as strings
- [ ] Todos os textos de UI usam `game.i18n.localize()`
- [ ] module.json declara ambos os idiomas

---

### RF-007 — Referências Foundry

**Como** GM,
**Quero** que quando uma imagem é renomeada de .png para .webp, todas as referências no World sejam atualizadas,
**Para que** atores, itens e cenas continuem apontando para a imagem correta.

**Critérios de aceitação:**
- [ ] `updateReferences(oldPath, newPath)` varre todos os packs e Documents
- [ ] Atualiza campo `img` de Actors, Items, Scenes, Tokens
- [ ] Não quebra referências que não apontam para o arquivo renomeado
- [ ] Funciona tanto no modo lote quanto no upload individual

---

## Requisitos Não-Funcionais

### RNF-001 — Compatibilidade

- Foundry VTT v13.350 até v14.999
- NÃO depende de nenhum módulo além de libWrapper
- Funciona em qualquer sistema (system-agnostic)

### RNF-002 — Performance

- Compressão de uma imagem individual: < 500ms (imagem típica de 2MB)
- Modo lote: processamento sequencial (não paralelo) para evitar sobrecarga de memória
- Logging: apenas em modo debug ou quando há ação significativa

### RNF-003 — Segurança

- Nunca sobrescrever arquivo original sem ter o WebP confirmado
- Nunca apagar arquivos que não foram criados pelo módulo
- Tratar erros de I/O sem crashar o Foundry

### RNF-004 — Manutenibilidade

- Um responsabilidade por arquivo (Constituição Artigo III)
- Código legível sem necessidade de bundler (Constituição Artigo I)
- Testes para toda função pura antes de merge (Constituição Artigo II)

### RNF-005 — Distribuição

- module.json com `manifest` e `download` URLs apontando para GitHub Releases
- ZIP contém apenas arquivos necessários (sem node_modules, sem testes, sem SDD)
- Licença GPL-3.0 em todos os arquivos relevantes

---

## Rastreabilidade

| RF | Implementado em | Testado em |
|----|----------------|------------|
| RF-001 | `src/compression.mjs` | `tests/compression.test.js` |
| RF-002 | `src/upload-hook.mjs` | `tests/upload-hook.test.js` |
| RF-003 | `src/batch.mjs` | `tests/batch.test.js` |
| RF-004 | `src/settings.mjs` | `tests/settings.test.js` |
| RF-005 | `src/ui.mjs` | (manual) |
| RF-006 | `lang/*.json` | (manual) |
| RF-007 | `src/paths.mjs` | `tests/paths.test.js` |

---

**Conformidade**: este documento adere à [[Constitution-lumenn-lightweight]].

**Documentos Relacionados**:
- [[Constitution-lumenn-lightweight]]
- [[Research-lumenn-lightweight]]
- [[PDR-lumenn-lightweight]]
- [[Blueprint-lumenn-lightweight]]
- [[Specs-lumenn-lightweight]]
