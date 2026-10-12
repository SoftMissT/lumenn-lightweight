<p align="center">
  <img src="assets/lumenn-logo.webp" alt="Lumenn Lightweight" width="400">
</p>

<h1 align="center">Lumenn Lightweight</h1>

<p align="center">
  <a href="https://github.com/SoftMissT/lumenn-lightweight/releases/latest"><img src="https://img.shields.io/github/v/release/SoftMissT/lumenn-lightweight?style=flat-square&color=4a9" alt="Release"></a>
  <a href="https://github.com/SoftMissT/lumenn-lightweight/releases/latest"><img src="https://img.shields.io/badge/Foundry_VTT-v13.350–v14.999-orange?style=flat-square" alt="Foundry VTT"></a>
  <a href="https://github.com/SoftMissT/lumenn-lightweight/blob/main/LICENSE"><img src="https://img.shields.io/github/license/SoftMissT/lumenn-lightweight?style=flat-square" alt="License"></a>
</p>

<p align="center">
  Converte as imagens do seu mundo de PNG/JPG para WebP, no upload e em lote, sem apagar nenhum original.
</p>

---

## Por que usar

Mundos de Foundry engordam com retratos, tokens e mapas em PNG de vários MB. O Lumenn Lightweight resolve nos dois momentos: **evita** o peso (comprime no upload) e **corrige** o que já existe (modo lote), atualizando sozinho as referências dos documentos para o WebP novo.

## Funcionalidades

- **Compressão no upload** — imagens enviadas pelo FilePicker viram WebP antes de ir para o servidor
- **Modo lote** — varre Atores, Itens e Cenas, mostra o que dá para otimizar e converte o que você marcar
- **Scanner por categoria** — retratos, tokens de protótipo, tokens de cena, itens, fundos e foregrounds, com badges e totais separados para PNG, JPG e JPEG; referências que já são WebP são ignoradas
- **Referências atualizadas automaticamente** — Actor, Token, Item e Scene passam a apontar para o WebP salvo (na v14, pelos Levels da cena)
- **Não destrutivo** — os arquivos originais nunca são apagados nem alterados
- **Recuperação de arquivos** — consulta o inventário real do FilePicker, aceita caminhos com `%20`, tenta extensões irmãs e localiza arquivos movidos por nome único antes de declarar um arquivo ausente
- **Reconciliação automática** — ao entrar no mundo, o GM ativo liga documentos PNG/JPG/JPEG aos WebPs que já existem, sem reprocessar nada (uma vez por versão do módulo; se algo falhar, tenta de novo no próximo carregamento)
- **Log de erros no Diário** — falhas do lote viram uma página no Diário, com o motivo de cada uma (veja [Log de erros](#log-de-erros))
- **Resiliente** — a falha de um asset não derruba o lote; um arquivo compartilhado por vários documentos é processado uma única vez por execução
- **i18n** — Português (Brasil) e Inglês

## Compatibilidade

| | |
| --- | --- |
| Foundry VTT | mínimo **13.350**, verificado na **14**, máximo 14.999 |
| Dependência | [libWrapper](https://foundryvtt.com/packages/lib-wrapper) (declarada no manifesto) |
| Permissão | O otimizador, o lote e o log são exclusivos de **GM** |

## Instalação

1. No Foundry, abra **Add-on Modules** → **Install Module**
2. Cole a URL do manifesto:

   ```text
   https://github.com/SoftMissT/lumenn-lightweight/releases/latest/download/module.json
   ```

3. Clique em **Install** e ative o módulo (e o libWrapper) no seu mundo

## Uso

### Upload automático

Ligado por padrão. Ao enviar uma imagem pelo FilePicker, o módulo a converte para WebP antes de salvar e mostra o tamanho antes e depois. O arquivo só é trocado se a economia atingir o mínimo configurado; senão, o original sobe como veio. Arquivos que já são WebP passam intactos.

### Modo lote

1. Abra as configurações do mundo (**Configure Settings**) e a aba **Module Settings**
2. Em **Otimizador de Imagens**, clique em **Abrir Otimizador**
3. Escolha a categoria (Retratos, Tokens, Itens, Fundos de Cena, Foregrounds) e marque o que quer converter
4. Clique em **Otimizar Biblioteca** e acompanhe a barra de progresso

Ao terminar, você recebe **uma** notificação de resumo (os uploads internos não disparam avisos individuais), e a janela é reescaneada para mostrar só o que ainda falta.

### Log de erros

Se alguma imagem falhar, o módulo grava o motivo no Diário **Lumenn Lightweight — Log de erros**, visível só para o GM. Cada execução acrescenta uma página nova ao mesmo Diário. Cada linha traz o tipo do documento, o nome, o caminho, a etapa e o erro, e a página termina com um bloco de texto pronto para copiar em um relato de problema.

| Etapa | O que significa |
| --- | --- |
| **Localizar arquivo** | O caminho não existe no inventário do FilePicker. Restaure o arquivo ou reaponte o documento. |
| **Comprimir** | O navegador não conseguiu ler ou converter a imagem (por exemplo, um arquivo corrompido). |
| **Enviar WebP** | O upload do WebP não retornou um caminho válido (por exemplo, por permissão ou pasta de destino). |
| **Atualizar documento** | O WebP foi salvo, mas o documento não aceitou a nova referência ou não existe mais. |
| **Reconciliar referências** | Falha na verificação automática de WebPs já existentes. |

Quando há mais de um candidato para um arquivo ausente, o módulo não escolhe um deles: o item vira uma falha registrada.

### API

```javascript
game.modules.get("lumenn-lightweight").api.openOptimizerDialog();
```

## Configurações

| Opção | Tipo | Padrão | Descrição |
| --- | --- | --- | --- |
| Qualidade da Compressão | 0.1 – 1.0 | **0.85** | Qualidade do WebP gerado |
| Economia Mínima % | 0 – 90 | **25** | Redução mínima de tamanho para substituir o arquivo |
| Otimizar Uploads Automaticamente | Sim/Não | **Sim** | Comprimir ao enviar pelo FilePicker |

## Arquitetura

```text
src/
├── lumenn-lightweight.js   # Entrypoint: hooks init/ready
├── compression.mjs         # Núcleo: compressImage, shouldReplace, nomes de arquivo
├── scanner.mjs             # scanUnoptimizedAssets (Actors, Items, Scenes e Levels)
├── batch.mjs               # processBatch: etapas, reaproveitamento e yield por tempo
├── batch-upload.mjs        # Upload interno silencioso
├── error-log.mjs           # Relatório de falhas e exportação para o Diário
├── automatic-repair.mjs    # Reconciliação automática de referências WebP
├── document-reference.mjs  # Atualização dos campos de Actor/Token/Item/Scene/Level
├── file-recovery.mjs       # Inventário do FilePicker e recuperação por nome
├── foundry-compat.mjs      # Acesso ao FilePicker namespaced (v13+)
├── upload-hook.mjs         # libWrapper sobre FilePicker.upload
├── notification.mjs        # Notificação de tamanho antes/depois
├── settings.mjs            # Configurações e submenu nativo
├── paths.mjs               # Utilitários de caminho
└── ui.mjs                  # Janela do lote
```

## Desenvolvimento

```bash
npm install
npm test            # vitest run
npm run test:watch  # vitest em modo watch
```

Os testes rodam em Node com mocks do Foundry: eles protegem a lógica, mas **não** substituem uma conferência no Foundry real.

O pacote da release contém apenas o que roda no Foundry: `assets/`, `lang/`, `src/`, `styles/`, `templates/`, `module.json`, `LICENSE`, `README.md` e `CHANGELOG.md`.

## Solução de problemas

- **Etapa "Localizar arquivo"** — o arquivo referenciado não está na pasta de dados. Abra o log no Diário para ver o caminho exato.
- **Avisos de depreciação no console** — a partir da 0.0.11 o módulo não usa mais o `FilePicker` global nem `Scene#background` / `Scene#foreground`. Se ainda aparecerem, confira se há uma versão antiga instalada.
- **O upload automático não comprime** — confirme que o libWrapper está ativo e que a opção *Otimizar Uploads Automaticamente* está ligada. A opção só vale para GMs.

## English

Lumenn Lightweight converts your world's PNG/JPG images to WebP, both on upload and in bulk, and never deletes an original. The batch tool scans Actors, Items and Scenes, rewrites each document's image reference to the new WebP, and reports every failure (with the stage that broke) as a page in a GM-only Journal. Requires libWrapper; Foundry VTT 13.350 minimum, verified on 14. Install with the manifest URL above.

## Licença

[GPL-3.0](LICENSE)
