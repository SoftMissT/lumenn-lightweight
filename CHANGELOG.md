# Changelog

All notable changes to this project will be documented in this file.

## [0.0.9] - 2026-09-09

### Fixed

- Ao carregar o mundo, o GM ativo reconcilia automaticamente referências PNG/JPG/JPEG com WebPs já existentes, uma vez por versão do módulo.
- WebP irmão no mesmo diretório tem prioridade; WebP movido só é usado quando o basename é único, evitando substituições ambíguas.
- Tokens embutidos em Scenes agora são atualizados pela API v14 oficial `Scene.updateEmbeddedDocuments`.
- Cada asset agora exibe seu formato real como badge visível: `PNG`, `JPG` ou `JPEG`.
- O cabeçalho apresenta contadores separados por formato, sem confundir o tipo de arquivo com a categoria de uso.
- A interface informa explicitamente que referências `WEBP` já otimizadas foram ignoradas pelo scanner.
- Adicionada cobertura de regressão para identificação e contagem independente das extensões suportadas.

## [0.0.8] - 2026-09-09

### Fixed

- Uploads internos do lote passam `notify: false` ao `FilePicker`, eliminando uma notificação azul por arquivo salvo.
- A janela é reescaneada ao concluir o lote, removendo imediatamente da lista as referências que já foram atualizadas.
- A recuperação de arquivos movidos agora percorre os diretórios reais do `FilePicker` e reutiliza um índice em cache; o padrão inválido `assets/**` foi removido.
- Tokens colocados diretamente nas Scenes agora são detectados, exibidos na categoria Tokens e têm `texture.src` atualizado automaticamente.
- WebPs físicos com `%20` literal são republicados com nome decodificado, em vez de manter uma referência aparentemente WebP porém quebrada.

## [0.0.7] - 2026-09-09

### Fixed

- Referências que já terminam em `.webp` são ignoradas completamente pelo scanner.
- Uploads WebP passam intactos pelo hook, independentemente do tamanho.
- Quando um PNG/JPG possui WebP irmão, o lote apenas atualiza o documento para o WebP existente, sem recomprimir ou reenviar.
- O threshold legado de WebP foi ocultado das configurações e removido do fluxo de lote.

## [0.0.6] - 2026-09-09

### Fixed

- Referências 404 agora tentam o arquivo irmão em WebP/PNG/JPG/JPEG antes de falhar.
- Assets movidos podem ser recuperados por basename único usando a busca wildcard oficial do `FilePicker`.
- O caminho realmente encontrado é usado para salvar o WebP e atualizar automaticamente o campo do Actor, Token, Item ou Scene.
- Uploads internos do lote ignoram o hook automático, evitando compressão duplicada e uma notificação por arquivo.
- O lote exibe somente uma notificação de resumo ao terminar.
- Resultados ambíguos ou ausentes não são adivinhados e não alteram documentos.

## [0.0.5] - 2026-09-09

### Fixed

- Removido o botão injetado no rodapé global das Configurações; o otimizador agora usa o submenu nativo de `game.settings.registerMenu` exigido pelo SDD.
- Janela limitada a 680×620 com scroll interno e rodapé de ação persistente.
- Assets separados em Retratos, Tokens, Itens, Fundos de Cena e Foregrounds.
- Cada categoria possui contador, seleção total e limpeza independente.
- Textos ausentes de i18n foram adicionados em pt-BR e inglês.
- WebPs voltaram a ser detectados: pequenos são preservados e os maiores passam pelo limiar configurado.
- Referências quebradas por nomes gravados com `%20` literal são recuperadas, republicadas com nome real e atualizadas pelo próprio módulo.
- Manifesto e pacote passam a ser validados juntos antes da publicação da release.

## [0.0.4] - 2026-09-09

### Fixed

- Botão do otimizador agora é montado somente dentro do painel de settings do Lumenn.
- Removido o fallback que anexava o botão ao rodapé global da janela.
- Template do dialog em lote agora renderiza um único elemento raiz, conforme exigido pelo `ApplicationV2`.
- Adicionados testes de regressão para o ponto de montagem e a raiz única do template.
- Nomes URL-encoded agora são decodificados antes do upload WebP, evitando arquivos físicos com `%20`/`%2C` e referências 404.

## [0.0.3] - 2026-09-09

### Fixed

- Restaurado o botão do Otimizador de Imagens nos hooks de Settings V1/V2.
- Restaurada a abertura do dialog de lote com compatibilidade entre jQuery e DOM nativo.
- Upload em lote agora aborta antes de atualizar o Actor/Item/Scene se o FilePicker não retornar um caminho válido.
- Mantida a proteção contra reprocessamento de WebP existente.

## [0.0.2] - 2026-09-09

### Changed

- Refatoração da UI do Otimizador em Lote para usar a API nativa `ApplicationV2` (Foundry V13+).
- Dialog utiliza `HandlebarsApplicationMixin` para compatibilidade estrita e limpa com o padrão V12+.
- Correção de exclusão do `.zip` no gitignore e compatibilidade `verified: 14`.

## [0.0.1] - 2026-09-09

### Added

- **Núcleo de compressão** (`compression.mjs`): `compressImage` com suporte a `OffscreenCanvas.convertToBlob` e fallback `HTMLCanvasElement.toBlob`; retorna `{ blob, originalSize, newSize, skipped }` (RF-001, RF-009)
- **Scanner de assets** (`scanner.mjs`): `scanUnoptimizedAssets` varre Actors, Items e Scenes coletando imagens não-WebP (RF-006)
- **Processamento em lote** (`batch.mjs`): `processBatch` com loop sequencial async + micro-yield para não travar UI (RNF-002); falha em um item não aborta o lote (CT-006)
- **Hook de upload** (`upload-hook.mjs`): intercepta `FilePicker.upload` via `libWrapper`; guarda de `game.user.isGM` (RF-003, RF-004, RF-011, RF-012)
- **Notificação customizada** (`notification.mjs`): `CustomNotification.show` com tamanhos formatados em KB e percentual economizado (RF-005)
- **Configurações** (`settings.mjs`): `uploadHookEnabled`, `compressionQuality` (default 0.85), `overridePercent` (25%), `skipThresholdBytes` (100KB); todas `restricted: true` (RF-010, RF-011)
- **Dialog de lote** (`ui.mjs`): lista assets com checkboxes, barra de progresso, integração com `scanUnoptimizedAssets` e `processBatch`
- **i18n**: `lang/en.json` e `lang/pt-BR.json`
- **Testes**: 6 suítes, 19 testes (compression, scanner, batch, settings, paths, upload-hook) via vitest
- **Manifest** (`module.json`): `relationships.requires` declarando libWrapper, compatibilidade v13.350–v14.999
