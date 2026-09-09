<p align="center">
  <img src="assets/lumenn-logo.webp" alt="Lumenn Lightweight" width="400">
</p>

<h1 align="center">Lumenn Lightweight</h1>

<p align="center">
  <a href="https://github.com/SoftMissT/lumenn-lightweight/releases/latest"><img src="https://img.shields.io/github/v/release/SoftMissT/lumenn-lightweight?style=flat-square&color=4a9" alt="Release"></a>
  <a href="https://foundryvtt.com/packages/lumenn-lightweight"><img src="https://img.shields.io/badge/Foundry_VTT-v13.350–v14.999-orange?style=flat-square" alt="Foundry VTT"></a>
  <a href="https://github.com/SoftMissT/lumenn-lightweight/blob/main/LICENSE"><img src="https://img.shields.io/github/license/SoftMissT/lumenn-lightweight?style=flat-square" alt="License"></a>
</p>

<p align="center">
  Módulo Foundry VTT para otimizar imagens (PNG/JPG → WebP) com modo lote e hook de upload automático.
</p>

---

## Funcionalidades

- **Compressão WebP automática** — converte imagens no momento do upload via FilePicker
- **Modo lote** — otimiza toda a biblioteca de Atores, Itens e Cenas de uma vez
- **Scanner inteligente** — separa retratos, tokens, itens, fundos e foregrounds, incluindo WebPs para validação por tamanho
- **Configurações flexíveis** — qualidade, economia mínima, threshold de skip
- **Não-destrutivo** — arquivos originais nunca são apagados automaticamente
- **Resiliente** — falha em um asset não aborta o lote inteiro
- **Recuperação de referências** — procura extensões irmãs e arquivos movidos por nome único antes de declarar um 404
- **i18n** — Inglês e Português (Brasil)

## Compatibilidade

- Foundry VTT **v13.350** até **v14.999**
- Requer [libWrapper](https://foundryvtt.com/packages/lib-wrapper) (dependência declarada no manifest)

## Instalação

1. No Foundry VTT, vá em **Add-on Modules** → **Install Module**
2. Cole a URL do manifest:
   ```
   https://github.com/SoftMissT/lumenn-lightweight/releases/latest/download/module.json
   ```
3. Clique em **Install**

## Uso

### Upload Automático

Ativado por padrão. Ao enviar uma imagem via FilePicker, ela é automaticamente comprimida para WebP antes de ser salva no servidor. Uma notificação exibe o tamanho antes/depois.

### Modo Lote

1. Abra as **Configurações do Módulo** (Module Settings)
2. No submenu nativo **Otimizador de Imagens**, clique em **Abrir Otimizador**
3. O scanner organiza as referências em Retratos, Tokens, Itens, Fundos de Cena e Foregrounds
4. Selecione os que deseja otimizar e clique em **Otimizar Biblioteca**
5. Acompanhe o progresso pela barra

Ao concluir cada item, o módulo substitui automaticamente a referência usada pelo documento pelo caminho WebP salvo. O lote produz apenas um resumo final; os uploads internos não disparam as notificações do hook automático.

### API

```javascript
game.modules.get("lumenn-lightweight").api.openOptimizerDialog();
```

## Configurações

| Config             | Tipo           | Default  | Descrição                                          |
| ------------------ | -------------- | -------- | -------------------------------------------------- |
| Qualidade          | Slider 0.1–1.0 | **0.85** | Qualidade da compressão WebP                       |
| Economia Mínima %  | Slider 0–90    | **25**   | Porcentagem mínima de redução para substituir      |
| Auto-otimizar      | Boolean        | **true** | Comprimir ao upload via FilePicker                  |
| Skip Threshold     | Number (bytes) | **102400** (100KB) | Abaixo deste tamanho, WebP existente é pulado |

## Arquitetura

```
src/
├── lumenn-lightweight.js   # Entrypoint: hooks init/ready
├── compression.mjs         # Núcleo: compressImage, shouldReplace, isImageFile
├── scanner.mjs             # Scanner: scanUnoptimizedAssets (Actors/Items/Scenes)
├── batch.mjs               # Processador: processBatch (chunked async)
├── upload-hook.mjs         # Hook: libWrapper → FilePicker.upload
├── notification.mjs        # Notificação customizada (tamanho antes/depois)
├── settings.mjs            # Configurações + registerMenu nativo
├── paths.mjs               # Utilitários de caminho Foundry
└── ui.mjs                  # Dialog de lote com checkboxes e progresso
```

## Desenvolvimento

```bash
npm install
npm test          # vitest run
npm run test:watch  # vitest (watch mode)
```

## Licença

[GPL-3.0](LICENSE)
