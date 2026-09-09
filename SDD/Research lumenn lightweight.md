---
type: research
status: draft
created: 2026-08-30
updated: 2026-08-30
tags: [sdd, research, docs, foundry-vtt, lumenn-lightweight]
spo:
  - ["Research-lumenn-lightweight", "belongs-to", "L3"]
---

# Research: lumenn-lightweight

> [!info] Snapshot datado de documentação atual
> Gerado ANTES do Blueprint/Specs via skill `context7-mcp` (preferencial) ou web search nas docs oficiais. Cada entrada tem versão, data e fonte. O que não está aqui é inferência de conhecimento de treino — e deve ser declarado como tal nas Specs.

## Bibliotecas Verificadas

### Foundry VTT — FilePicker API (`/websites/foundryvtt_wiki_en_development` no Context7)
- **Versão verificada**: v13 (API atual), compatível conforme documentado até v14
- **Data da consulta**: 2026-08-30
- **Fonte**: Context7 `/websites/foundryvtt_wiki_en_development` + `https://foundryvtt.com/api/v13/classes/foundry.applications.apps.FilePicker.html`
- **Relevante para**: [[Blueprint-lumenn-lightweight#Hook de Upload]] / RF de interceptação de upload

**Achados (verbatim, não parafraseado de memória):**
```
FilePicker application renders contents of the server-side public directory.
This app allows for navigating and uploading files to the public path.

upload(source: string, path: string, file: File, body?: any, [options]?: { notify: boolean }): Promise<any>
"Dispatch a POST request to the server containing a directory path and a file to upload"
```

**Implicações para a spec:**
- `FilePicker.upload` NÃO possui hook nativo (`preUpload`/similar) — confirmado por ausência na documentação de hooks de Document (`preCreateActor`, `preUpdateActor`, etc., que só cobrem Documents, não uploads de arquivo).
- Interceptação exige monkeypatch via `libWrapper` (ver entrada abaixo), não hook nativo.

---

### Foundry VTT — libWrapper (padrão de patch, verificado via Context7 + GitHub oficial)
- **Versão verificada**: padrão atual da comunidade, sem versão específica travada na doc consultada
- **Data da consulta**: 2026-08-30
- **Fonte**: Context7 `/websites/foundryvtt_wiki_en_development` (`package-best-practices`, `getting-started-with-development`) + `https://github.com/foundryvtt/foundryvtt/issues/7075` (migração de manifest) + `https://foundryvtt.com/article/manifest-migration-guide/`
- **Relevante para**: [[Blueprint-lumenn-lightweight#Hook de Upload]] / [[Constitution-lumenn-lightweight#Artigo I]]

**Achados (verbatim):**
```
"The libWrapper library module is a valuable dependency for patching core functions in Foundry VTT."

"Ensure your package declares dependencies on all modules within its dependency tree,
as Foundry does not automatically handle multi-level dependencies during installation or activation."

Padrão de uso (getting-started-with-development):
libWrapper.register('my-fvtt-module-name', 'game.dnd5e.entities.Actor5e.prototype._prepareSkills',
  function (wrapped, ...args) {
    const result = wrapped(...args); // sempre chamar o original
    return result; // mesma assinatura do original
});

Declaração de dependência obrigatória no module.json (manifest-migration-guide, sintaxe atual pós-v10):
"relationships": {
  "requires": [{
    "id": "lib-wrapper",
    "type": "module",
    "manifest": "<url-do-manifest-do-libwrapper>",
    "compatibility": { "verified": "<versao>" }
  }]
}
```

**Implicações para a spec:**
- O hook de upload DEVE ser implementado como `libWrapper.register('lumenn-lightweight', 'FilePicker.upload', async function(wrapped, ...args) { ... })`.
- `module.json` DEVE declarar `relationships.requires` apontando pro manifest oficial do libWrapper (id: `lib-wrapper`), conforme Constitution Artigo I.
- Sempre chamar `wrapped(...args)` ou substituir corretamente — nunca quebrar o contrato de retorno do método original.

---

### Foundry VTT — game.settings (Context7 verificado)
- **Versão verificada**: API atual de Development docs
- **Data da consulta**: 2026-08-30
- **Fonte**: Context7 `/websites/foundryvtt_wiki_en_development` (`guides/handling-data`, `api/settings`)
- **Relevante para**: [[Blueprint-lumenn-lightweight#Configurações]] / RF de qualidade configurável

**Achados (verbatim):**
```javascript
game.settings.register('myModuleName', 'mySettingName', {
  name: 'My Setting',
  hint: 'A description of the registered setting and its behavior.',
  scope: 'world',     // "world" = sync to db, "client" = local storage
  config: true,
  type: Number,
  default: 0,
  onChange: value => { console.log(value) },
  requiresReload: true,
  range: { min: 0, step: 2, max: 10 },
  filePicker: "any"   // "audio","image","video","imagevideo","folder","font","graphics","text","any"
});
```
```
"Register a Settings Menu": game.settings.registerMenu para configurações complexas via FormApplication.
"All settings must be registered using game.settings.register... during the init hook."
```

**Implicações para a spec:**
- Setting de qualidade de compressão (slider 0.1–1.0, análogo ao Geano's) usa `type: Number` + `range`.
- Registro DEVE ocorrer no hook `init`, não em `ready` ou fora de hook.
- Se a configuração crescer (múltiplos parâmetros por tipo de asset), considerar `registerMenu` + `FormApplication` em vez de settings simples — decisão a detalhar no Blueprint.

---

### Foundry VTT — module.json (manifest) — relationships/requires
- **Versão verificada**: schema pós-v10 (campo `relationships` substitui `dependencies`, deprecado)
- **Data da consulta**: 2026-08-30
- **Fonte**: `https://foundryvtt.com/article/manifest-migration-guide/` (oficial) + `https://github.com/foundryvtt/foundryvtt/issues/7075` (histórico da mudança) + template oficial `League-of-Foundry-Developers/FoundryVTT-Module-Template`
- **Relevante para**: [[Specs-lumenn-lightweight#module.json]]

**Achados (verbatim):**
```json
{
  "relationships": {
    "systems": [{
      "id": "archmage",
      "type": "system",
      "manifest": "https://gitlab.com/asacolips-projects/foundry-mods/archmage/-/raw/1.5.0/system.json",
      "compatibility": { "verified": "1.5.0" }
    }],
    "requires": [{
      "id": "_chatcommands",
      "type": "module",
      "manifest": "https://github.com/League-of-Foundry-Developers/Chat-Commands-Lib/releases/download/1.2.0/module.json",
      "compatibility": { "verified": "1.2.0" }
    }]
  }
}
```
```
Campos básicos obrigatórios: id, title, description, version, compatibility, authors
Campos recomendados: url, bugs, changelog, readme, license, manifest, download
Campo "keywords" NÃO é suportado no manifest do Foundry.
```

**Implicações para a spec:**
- `module.json` v1 usa `relationships.requires` (nunca o campo legado `dependencies`, deprecado desde v10).
- `compatibility.minimum` = `"13.350"`, `compatibility.verified` a definir na primeira release, respeitando teto de `"14.999"` (Constitution Artigo IV).

---

### vitest (Context7 verificado: `/vitest-dev/vitest`)
- **Versão verificada**: v3.2.4 / v4.0.7 / v4.1.6 (múltiplas versões disponíveis no Context7; nenhuma travada ainda para este projeto)
- **Data da consulta**: 2026-08-30
- **Fonte**: Context7 `/vitest-dev/vitest` (`docs/config/index.md`, `docs/guide/mocking/globals.md`, `docs/guide/mocking.md`)
- **Relevante para**: [[Constitution-lumenn-lightweight#Artigo II]] / [[Blueprint-lumenn-lightweight#Testes]]

**Achados (verbatim):**
```
"If you are not using Vite, you can create a standalone vitest.config.js file.
In this file, import defineConfig from 'vitest/config' and define your test options
within the test property."

CONFIG_EXTENSIONS: ['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs']
— .js tem suporte de primeira classe, não é um caso secundário.

Mock de globais (vi.stubGlobal):
import { vi } from 'vitest'
const IntersectionObserverMock = vi.fn(class {
  disconnect = vi.fn()
  observe = vi.fn()
})
vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)
```

**Implicações para a spec:**
- `vitest.config.js` (não `.ts`) é suficiente — nenhuma perda de funcionalidade por não usar TypeScript, confirmando decisão da Constitution Artigo I.
- Globais do Foundry (`FilePicker`, `canvas`, `Hooks`, `game`) devem ser mockados via `vi.stubGlobal` nos testes unitários, seguindo o mesmo padrão mostrado para `IntersectionObserver`.
- Ambiente de teste recomendado: `node` (não `jsdom`/`happy-dom`), já que não há DOM real sendo testado — apenas lógica pura e mocks de objetos globais do Foundry.

---

### WebCodecs vs ffmpeg.wasm (pesquisa web, não Context7 — sem library ID disponível para WebCodecs no Context7 nesta consulta)
- **Data da consulta**: 2026-08-30
- **Fonte**: `burnsub.com/blog/webcodecs-vs-ffmpeg-wasm` (2026-05-19), `dayverse.id` (2026-02-08), `velocaption.com/blog/webcodecs-browser-video-editing` (2026-04-05)
- **Relevante para**: [[Constitution-lumenn-lightweight#Artigo VI]] (roadmap v2 — NÃO implementar agora)

**Achados (verbatim/paráfrase mínima, já registrados na Constitution):**
```
"WebCodecs with MediaBunny for the same 1080p H.264 encoding achieves around 200fps
on identical hardware — eight times faster [than ffmpeg.wasm]. CPU usage is only about 15%."

"ffmpeg.wasm has been benchmarked by the community to run roughly an order of magnitude
slower than the same FFmpeg binary natively."

Compatibilidade: Chrome 94+, Edge 94+, Firefox 133+, Opera 80+, Safari 26.1+ (95.5% global per Can I Use, 2025)
```

**Implicações para a spec:**
- Esta decisão é para v2 (fora de escopo do v1 conforme Constitution Artigo IV) — registrada aqui apenas para não perder o research já feito. Não gerar Blueprint/Specs de vídeo agora.

### Foundry VTT — User#isGM (permissões, verificado via web oficial após Context7 não retornar resultado)
- **Versão verificada**: API v13
- **Data da consulta**: 2026-08-30
- **Fonte**: `https://foundryvtt.com/api/classes/foundry.documents.BaseUser.html` (documentação oficial da API, não Context7 — esta base não retornou resultado para esta consulta específica após tentativas)
- **Relevante para**: [[Requirements-lumenn-lightweight#RF-003]] / RF-011 / [[PDR-lumenn-lightweight]]

**Achados (verbatim):**
```
get isGM(): boolean
"Test whether the User has a GAMEMASTER or ASSISTANT role in this World?"
```

**Implicações para a spec:**
- `game.user.isGM` cobre nativamente GAMEMASTER e ASSISTANT — não é necessário checar `game.user.role`/`CONST.USER_ROLES` manualmente.
- RF-003 (restrição de acesso) e RF-011 (negação a não-GM) DEVEM usar `game.user.isGM` como guarda única.

## Perguntas Sem Resposta na Doc
- [ ] Qual é exatamente o `id` de manifesto oficial do libWrapper e a URL estável do manifest (`lib-wrapper`, confirmar no Foundry Package Listing antes de travar no `module.json` real) — onde procurar: página oficial do pacote `lib-wrapper` em foundryvtt.com/packages
- [ ] Se `FilePicker.upload` mudou de assinatura entre v13 e v14 (documentação consultada foi majoritariamente v13) — onde procurar: Foundry API docs v14 (`foundryvtt.com/api/v14`) e release notes v14 quando estiverem estáveis

## Decisões Informadas por Este Research
| Decisão | Baseada em | Registrada em |
| :--- | :--- | :--- |
| Hook de upload via `libWrapper.register('lumenn-lightweight', 'FilePicker.upload', ...)` | libWrapper (acima) | [[Constitution-lumenn-lightweight#Artigo I]] |
| `module.json` usa `relationships.requires`, não `dependencies` | manifest-migration-guide (acima) | [[Constitution-lumenn-lightweight#Artigo I]] |
| JS puro + `vitest.config.js`, sem TypeScript | vitest docs (acima) | [[Constitution-lumenn-lightweight#Artigo I]] e [[#Artigo II]] |
| Mock de globais do Foundry via `vi.stubGlobal` nos testes | vitest mocking docs (acima) | [[Constitution-lumenn-lightweight#Artigo II]] |
| Setting de qualidade via `game.settings.register` com `range` | Foundry settings API (acima) | a detalhar em [[Blueprint-lumenn-lightweight]] |
| Vídeo (v2) usará WebCodecs + MediaBunny, nunca ffmpeg.wasm | benchmarks web (acima) | [[Constitution-lumenn-lightweight#Artigo VI]] |

---
**Conformidade**: este documento adere à [[Constitution-lumenn-lightweight]].

**Documentos Relacionados**:
- [[Constitution-lumenn-lightweight]]
- [[Blueprint-lumenn-lightweight]]
- [[Specs-lumenn-lightweight]]
- [[STATE-lumenn-lightweight]]
