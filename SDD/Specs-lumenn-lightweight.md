---
type: specs
status: draft
created: 2026-08-30
updated: 2026-08-30
tags: [sdd, specs, technical-specification, foundry-vtt, lumenn-lightweight]
---

# SPECS: lumenn-lightweight

> [!note] Adaptação do template
> O template padrão de Specs é orientado a REST APIs (endpoints, JSON, status HTTP). `lumenn-lightweight` é um módulo Foundry VTT **client-side**, sem backend próprio nem rede — por isso §2 e §3 foram adaptados para **assinaturas de função/módulo** e **estrutura de dados em memória/documento Foundry**, respectivamente, preservando a intenção de cada seção. A Matriz de Rastreabilidade (§9) segue o formato padrão sem alteração.

## Clarifications
> [!question] Detalhes técnicos esclarecidos no Clarify
- [x] Formato de saída da compressão → sempre WebP, independente do formato de entrada (PNG/JPEG).
- [x] O que acontece com o arquivo original → preservado, nunca apagado automaticamente (Constitution Artigo III).
- [x] Qualidade padrão → 0.85 (ver [[Blueprint-lumenn-lightweight#Clarifications]]).

## 1. Visão Geral Técnica

### 1.1. Contexto
Este documento detalha a implementação de `lumenn-lightweight` conforme [[Blueprint-lumenn-lightweight]] e [[Requirements-lumenn-lightweight]]: módulo Foundry VTT v13.350–v14.999, JavaScript puro (ES Modules), sem build step, testado com `vitest`.

### 1.2. Componentes Afetados
Todos os componentes são **novos** (projeto greenfield, sem código legado):
- `scripts/core/compress.js`, `scripts/core/scanner.js`, `scripts/core/batch-processor.js` (lógica pura)
- `scripts/hooks/upload-hook.js` (integração `libWrapper`)
- `scripts/ui/batch-dialog.js`, `scripts/ui/settings-menu.js`, `scripts/ui/notification.js` (UI)
- `scripts/settings.js`, `scripts/main.js` (entrypoint/wiring)
- `module.json` (manifest)

## 2. Especificação de Interfaces (Funções/Módulos)

### 2.1. `compressImage` — `scripts/core/compress.js`
- **Assinatura**: `async function compressImage(fileOrBlob, quality = 0.85)`
- **Descrição**: Converte uma imagem (`File`/`Blob` PNG/JPEG/WebP) para WebP na qualidade especificada, usando `canvas.toBlob('image/webp', quality)`. Função pura — não importa nada de `game`/`foundry`/`FilePicker`.
- **Entrada**:
  - `fileOrBlob`: `File | Blob` — imagem original.
  - `quality`: `number` (0.1–1.0) — nível de qualidade WebP, default `0.85` conforme Clarify do Blueprint.
- **Saída**: `Promise<{ blob: Blob, originalSize: number, newSize: number, skipped: boolean }>`
  - `skipped: true` se o arquivo já é WebP e está abaixo do limiar de tamanho configurado (RF-009) — nesse caso `blob` é o original, sem reprocessamento.
- **Erros**: Rejeita a Promise se `fileOrBlob` não for uma imagem decodificável (formato corrompido/não suportado) — quem chama deve tratar com `try/catch` e não deve deixar o upload travado (fallback: segue com o arquivo original).

### 2.2. `scanUnoptimizedAssets` — `scripts/core/scanner.js`
- **Assinatura**: `function scanUnoptimizedAssets({ actors, items, scenes }, thresholdBytes)`
- **Descrição**: Varre as três coleções recebidas (injetadas como parâmetro, não acessadas globalmente — facilita teste) e retorna os documentos cuja imagem (`img`/`background.src` para Scenes) não é WebP ou excede `thresholdBytes`.
- **Entrada**:
  - `{ actors, items, scenes }`: arrays/coleções iteráveis de documentos Foundry (ou mocks equivalentes em teste).
  - `thresholdBytes`: `number` — tamanho acima do qual mesmo um WebP existente é reconsiderado (RF-009).
- **Saída**: `Array<{ id: string, type: 'Actor'|'Item'|'Scene', name: string, imgPath: string, currentSize: number }>`

### 2.3. `processBatch` — `scripts/core/batch-processor.js`
- **Assinatura**: `async function processBatch(selectedAssets, { quality, onProgress, updateDocumentFn })`
- **Descrição**: Processa a lista de assets selecionados sequencialmente/chunked (não `Promise.all` em massa — ver [[Blueprint-lumenn-lightweight#3.3. Decisões Arquiteturais Chave]]). Para cada item: chama `compressImage`, depois `updateDocumentFn(asset, novoBlobUrl)` (injetado, permite mock em teste), depois `onProgress({ done, total, current })`.
- **Entrada**:
  - `selectedAssets`: saída de `scanUnoptimizedAssets`, filtrada pela seleção do usuário.
  - `quality`: `number`, mesma faixa de `compressImage`.
  - `onProgress`: `(info: { done: number, total: number, current: string }) => void`.
  - `updateDocumentFn`: `(asset, newImgRef) => Promise<void>` — abstrai a chamada real a `Document#update`, injetável para teste.
- **Saída**: `Promise<{ processed: number, skipped: number, failed: Array<{ id: string, error: string }> }>`

### 2.4. `registerUploadHook` — `scripts/hooks/upload-hook.js`
- **Assinatura**: `function registerUploadHook()`
- **Descrição**: Chamado no hook `init` (ou `ready`, ver §4.1). Verifica se `libWrapper` está ativo (`game.modules.get('lib-wrapper')?.active`); se sim, registra o wrapper em `FilePicker.upload`; se não, loga aviso e não registra (RF-012).
- **Contrato do wrapper**: `async function(wrapped, source, path, file, options) { ... }` — DEVE chamar `wrapped(source, path, arquivoFinal, options)` sempre (seja o comprimido ou o original em caso de erro/skip), nunca engolir a chamada original.

### 2.5. `CustomNotification.show` — `scripts/ui/notification.js`
- **Assinatura**: `function show({ originalSize, newSize, assetName })`
- **Descrição**: Renderiza a notificação customizada (template próprio, mascote) com o texto "Imagem otimizada: {originalSizeFormatado} → {newSizeFormatado}", conforme PDR US-D001.

## 3. Estrutura de Dados

### 3.1. Configurações (`game.settings`, registradas em `scripts/settings.js`)
| Chave | Tipo | Escopo | Default | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `uploadHookEnabled` | `Boolean` | `world` | `true` | Liga/desliga o hook de upload (RF-010). |
| `compressionQuality` | `Number` (`range` 0.1–1.0, `step` 0.05) | `world` | `0.85` | Qualidade WebP usada por `compressImage`. |
| `skipThresholdBytes` | `Number` | `world` | `102400` (100KB) | Abaixo deste tamanho, um WebP existente não é reprocessado (RF-009). |
| Submenu `batchMenu` | via `registerMenu` | — | — | Abre `BatchDialog` (PDR §4, Decisão de Design: Submenu Dedicado). |

### 3.2. Estrutura de retorno de `scanUnoptimizedAssets` (contrato interno, não persistido)
```javascript
{
  id: "actorId123",
  type: "Actor", // ou "Item", "Scene"
  name: "Goblin Arqueiro",
  imgPath: "worlds/meu-mundo/assets/goblin.png",
  currentSize: 4823000 // bytes
}
```
Esta estrutura não é salva em nenhum lugar — existe apenas em memória entre o scan e a confirmação do usuário no `DialogV2`.

## 4. Lógica de Negócio Detalhada

### 4.1. Funcionalidade: Interceptação de Upload
- **Gatilho**: Usuário (com `game.user.isGM === true`) faz upload de arquivo via `FilePicker`.
- **Pré-condições**: `uploadHookEnabled === true` E `libWrapper` ativo (RF-012).
- **Fluxo Principal**:
  1. `libWrapper` intercepta a chamada a `FilePicker.upload`.
  2. Wrapper chama `compressImage(file, compressionQuality)`.
  3. Se `skipped === false`, o `Blob` resultante substitui o `file` original na chamada a `wrapped(...)`.
  4. `CustomNotification.show(...)` é disparada com os tamanhos antes/depois.
- **Fluxos Alternativos/Exceções**:
  - Se `compressImage` rejeitar (imagem corrompida/formato não suportado), então o wrapper chama `wrapped(...)` com o `file` original, sem interromper o upload, e loga um aviso no console (não notifica o usuário com erro — silencioso por design, para não gerar fricção desnecessária).
  - Se `libWrapper` não estiver ativo, então `registerUploadHook` nunca registra o wrapper — comportamento padrão do Foundry é preservado integralmente (RF-012).
- **Pós-condições**: Arquivo salvo no servidor é WebP comprimido (ou original, nos casos de exceção acima); notificação exibida ao GM.

### 4.2. Funcionalidade: Otimização em Lote
- **Gatilho**: GM abre o submenu `batchMenu` em Module Settings.
- **Pré-condições**: `game.user.isGM === true` (RF-003, RF-011).
- **Fluxo Principal**:
  1. `SettingsMenu` abre `BatchDialog`, que chama `scanUnoptimizedAssets({ actors: game.actors, items: game.items, scenes: game.scenes }, skipThresholdBytes)`.
  2. `DialogV2` renderiza a lista retornada com checkboxes.
  3. GM seleciona um subconjunto e confirma.
  4. `processBatch(selecionados, { quality: compressionQuality, onProgress, updateDocumentFn })` é chamado.
  5. Para cada asset: compressão → `Document#update({ img: novaReferência })` → progresso atualizado na UI.
- **Fluxos Alternativos/Exceções**:
  - Se um asset falhar durante o processamento (ex.: erro de rede ao salvar), então ele é registrado em `failed[]` no retorno de `processBatch`, o loop continua para os próximos itens (uma falha não aborta o lote inteiro).
  - Se o GM fechar o `DialogV2` no meio do processamento, então (comportamento a definir na implementação: recomenda-se permitir que o lote em andamento complete em background, já que `processBatch` é uma Promise independente da UI do dialog — registrado aqui como decisão de implementação, não testado neste documento).
- **Pós-condições**: Documentos atualizados com nova referência de imagem; arquivos originais preservados no servidor (não deletados).

## 5. Casos de Teste e Validação

- [ ] **CT-001**: `compressImage` recebe um `Blob` PNG e retorna um `Blob` com `type: 'image/webp'` e `newSize < originalSize`.
- [ ] **CT-002**: `compressImage` recebe um arquivo já WebP pequeno (abaixo do threshold) e retorna `skipped: true`, sem reprocessar.
- [ ] **CT-003**: `compressImage` rejeita a Promise ao receber um `Blob` inválido/corrompido.
- [ ] **CT-004**: `scanUnoptimizedAssets` retorna apenas assets não-WebP ou acima do threshold, ignorando os já otimizados.
- [ ] **CT-005**: `processBatch` chama `onProgress` uma vez por item processado, com `done` incrementando corretamente até `total`.
- [ ] **CT-006**: `processBatch` continua processando os itens restantes mesmo se um item específico falhar (não propaga exceção fatal).
- [ ] **CT-007**: Wrapper de upload (`registerUploadHook`) chama `wrapped(...)` com o arquivo comprimido quando `compressImage` resolve com sucesso (mock de `libWrapper.register`).
- [ ] **CT-008**: Wrapper de upload chama `wrapped(...)` com o arquivo original quando `compressImage` rejeita (fluxo de exceção do §4.1).
- [ ] **CT-009**: `registerUploadHook` não registra nada quando `game.modules.get('lib-wrapper')?.active` é `false`/`undefined` (RF-012).
- [ ] **CT-010 (manual, fora de vitest)**: Instalar módulo em Foundry v13.350 real, confirmar que `game.user.isGM === false` bloqueia acesso ao submenu (RF-003/RF-011).

## 6. Considerações de Infraestrutura e Implantação
- **Serviços Necessários**: Nenhum backend próprio — roda inteiramente client-side dentro do processo Foundry (Node.js do próprio Foundry serve os arquivos estáticos do módulo).
- **Configurações de Ambiente**: Nenhuma variável de ambiente/segredo — módulo não faz chamadas de rede externas.
- **Estratégia de Deploy**: Publicação via GitHub Releases + `module.json` manifest URL apontando para o asset da release (padrão Foundry), conforme `download`/`manifest` recomendados na pesquisa de manifest ([[Research-lumenn-lightweight]]).

## 7. Segurança e Performance
- **Requisitos de Segurança**: Guarda `game.user.isGM` em todo ponto de entrada de UI (submenu, dialog) e nas ações de settings sensíveis — nenhuma lógica de otimização deve rodar para usuários sem esse papel (RF-003, RF-011).
- **Requisitos de Performance**: RNF-001 (≥40% de redução em assets típicos), RNF-002 (processamento em lote não deve travar a UI — coberto pela decisão de `processBatch` chunked/sequencial em vez de paralelo total).

## 8. Débito Técnico e Próximos Passos
> [!warning] Débito Técnico Identificado
> - Arquivos originais órfãos (pré-otimização) se acumulam no servidor sem ferramenta de limpeza automática no v1 — mesma limitação observada no Geano's Scene Optimizer via pesquisa de mercado. Candidato a v1.1/v2.
> - Compatibilidade `FilePicker.upload` com Foundry v14 ainda não verificada em ambiente real (pendência registrada em [[Research-lumenn-lightweight#Perguntas Sem Resposta na Doc]]) — deve ser validada assim que v14 estabilizar.
> - i18n não implementado no v1 (strings hardcoded); estrutura `lang/en.json` pode ser adicionada depois sem refatoração grande, já que nenhuma string de UI está espalhada em lógica de negócio (Constitution Artigo III — responsabilidade única por arquivo já facilita essa extração futura).

## 9. Matriz de Rastreabilidade

| Requisito | Componente (Blueprint) | Spec | Caso de Teste |
| :--- | :--- | :--- | :--- |
| RF-001 (converter para WebP) | `compressImage` | §2.1 | CT-001 |
| RF-002 (preservar original) | `processBatch` / `uploadHook` | §4.1, §4.2 | CT-010 (manual) |
| RF-003 (restringir a GM/Assistente) | `SettingsMenu`, `BatchDialog` | §7 | CT-010 (manual) |
| RF-004 (interceptar upload via libWrapper) | `uploadHook` | §2.4, §4.1 | CT-007 |
| RF-005 (notificação antes/depois) | `CustomNotification` | §2.5, §4.1 | (visual, não coberto por vitest) |
| RF-006 (listar assets não otimizados) | `scanUnoptimizedAssets` | §2.2, §4.2 | CT-004 |
| RF-007 (processar seleção confirmada) | `processBatch` | §2.3, §4.2 | CT-005 |
| RF-008 (indicador de progresso) | `processBatch` (`onProgress`) | §2.3 | CT-005 |
| RF-009 (skip de assets já otimizados) | `compressImage` | §2.1 | CT-002 |
| RF-010 (respeitar toggle do hook) | `uploadHook` / `settings.js` | §3.1, §4.1 | (coberto indiretamente por CT-009) |
| RF-011 (negar acesso a não-GM) | `SettingsMenu`, `BatchDialog` | §7 | CT-010 (manual) |
| RF-012 (fallback sem libWrapper) | `registerUploadHook` | §2.4, §4.1 | CT-009 |
| RNF-001 (≥40% redução) | `compressImage` | §7 | CT-001 (parcial — mede redução, não garante ≥40% sem dataset real) |
| RNF-002 (não travar UI) | `processBatch` | §3.3 do Blueprint, §7 | CT-005 (indireto — confirma chunking, não mede tempo real) |
| RNF-003 (compat v13.350–v14.999) | `module.json` | §6 | CT-010 (manual) |
| RNF-004 (JS puro, sem build) | Todos | Constitution Art. I | N/A (verificável por inspeção) |
| RNF-005 (cobertura vitest) | Todos os `core/*` | §5 | CT-001 a CT-009 |

> [!note] Lacunas sinalizadas
> RNF-001 e RNF-002 têm apenas cobertura *parcial/indireta* em teste automatizado — a garantia real (≥40% de redução em dataset típico, ausência de travamento perceptível) depende de validação manual em um Foundry real com assets reais, registrada como pendência para a Fase 4 do Blueprint, não como lacuna de escopo.

---
**Conformidade**: este documento adere à [[Constitution-lumenn-lightweight]].

**Documentos Relacionados**:
- [[Constitution-lumenn-lightweight]]
- [[Requirements-lumenn-lightweight]]
- [[PDR-lumenn-lightweight]]
- [[Research-lumenn-lightweight]]
- [[Blueprint-lumenn-lightweight]]
