---
type: constitution
status: draft
created: 2026-08-30
updated: 2026-08-30
tags: [sdd, constitution, principles, foundry-vtt, lumenn-lightweight]
---

# Constitution: lumenn-lightweight

> [!abstract] Propósito
> Princípios **inegociáveis** deste projeto. Todo artefato seguinte (Requirements, PDR, Blueprint, Specs) e toda implementação DEVEM declarar conformidade com esta constituição. É o que impede deriva, over-engineering e decisões fora do combinado.

> [!warning] Como usar
> Cada artigo é uma **regra verificável**, não um desejo. Mantenha entre 5 e 9 artigos. Se uma regra não pode ser checada objetivamente, reescreva-a até que possa.

## Artigos

### Artigo I — Stack e Ferramentas

- **Obrigatório**: JavaScript puro (ES Modules), sem TypeScript, sem build step de transpilação. `vitest` para testes automatizados (`vitest.config.js`, ambiente `node`). Dependência de runtime: `libWrapper` (para interceptar `FilePicker.upload`).
- **Proibido**: TypeScript, qualquer bundler/transpiler obrigatório para desenvolvimento (esbuild/webpack/rollup só serão introduzidos se uma necessidade concreta surgir e for aprovada como emenda), `ffmpeg.wasm` (decisão v2, ver Artigo VI).

### Artigo II — Qualidade e Testes

- Toda função pura (compressão, cálculo de economia de espaço, parsing de path) DEVE ter teste `vitest` antes de ser considerada pronta.
- Interações com a API do Foundry (`FilePicker`, `canvas`, `Hooks`) DEVEM ser testadas via mocks (`vi.stubGlobal`), nunca contra uma instância real do Foundry nos testes automatizados.
- Nenhuma decisão técnica sobre API do Foundry ou de bibliotecas externas entra em Spec sem verificação prévia via Context7 ou documentação oficial — nunca de memória de treino (ver `Research-lumenn-lightweight.md`).

### Artigo III — Arquitetura

- Uma responsabilidade por arquivo: separar claramente lógica de compressão, lógica de hook/upload, lógica de UI (Application/Dialog), e lógica de configuração (`game.settings`).
- Módulo NÃO É destrutivo por padrão: arquivos originais nunca são sobrescritos ou apagados automaticamente sem confirmação explícita do usuário.
- Nenhum ID de ator/item/cena hardcoded — sempre resolver via API do Foundry (`fromUuid`, coleções).

### Artigo IV — Compatibilidade e Escopo

- Versão mínima suportada: Foundry VTT v13.350 até v14.999.
- v1 cobre **apenas imagens** (Atores, Itens, Cenas). Vídeo é explicitamente fora de escopo do v1 (ver Artigo VI).
- O módulo deve funcionar tanto em modo lote (otimizar biblioteca existente) quanto interceptando uploads novos — os dois modos são obrigatórios desde o v1, não faseados.

### Artigo V — Licença e Comunidade

- Licença: **GPL-3.0**. Qualquer fork ou distribuição derivada DEVE permanecer com código aberto sob a mesma licença.
- Código deve ser legível e simples o suficiente para reduzir barreira de entrada a contribuidores externos — este é um critério de design, não só de estilo.

### Artigo VI — Roadmap Técnico (v2, não implementar agora)

- Suporte a vídeo (v2) DEVE usar `WebCodecs` (`VideoEncoder`) + `MediaBunny` para muxing. `ffmpeg.wasm` está proibido para essa finalidade (decisão tomada com base em benchmarks: WebCodecs é 3–8x mais rápido por usar encoder de hardware, sem overhead de WASM).
- Este artigo existe para prevenir que uma implementação futura de vídeo reabra uma decisão já tomada sem justificativa nova.

## Processo de Emenda

Mudar a constituição exige aprovação explícita do usuário e propagação para os artefatos afetados. Registre a data e o motivo de cada emenda.

| Data       | Artigo | Mudança | Motivo                                                                                                      |
| :--------- | :----- | :------ | :---------------------------------------------------------------------------------------------------------- |
| 2026-08-30 | —      | Criação | Bootstrap do projeto — decisões consolidadas de sessão de planejamento (nome, licença, stack, escopo v1/v2) |

---

**Documentos Relacionados**:

- [[Requirements-lumenn-lightweight]]
- [[PDR-lumenn-lightweight]]
- [[Blueprint-lumenn-lightweight]]
- [[Specs-lumenn-lightweight]]
