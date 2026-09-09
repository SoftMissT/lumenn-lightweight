# Changelog

All notable changes to this project will be documented in this file.

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
