<p align="center">
  <img src="assets/lumenn-logo.webp" alt="Lumenn Lightweight" width="400">
</p>

<h1 align="center">Lumenn Lightweight</h1>

<p align="center">
  Módulo Foundry VTT para otimizar imagens (PNG/JPG → WebP) com modo lote e hook de upload automático.
</p>

---

## Funcionalidades

- **Compressão WebP automática** — converte imagens ao upload via FilePicker
- **Modo lote** — otimiza toda a biblioteca de uma vez
- **Configurações flexíveis** — qualidade, economia mínima, auto-otimizar
- **Não-destrutivo** — arquivos originais nunca são apagados sem confirmação
- **i18n** — Inglês e Português (Brasil)

## Compatibilidade

- Foundry VTT v13.350 até v14.999
- Requer [libWrapper](https://foundryvtt.com/packages/lib-wrapper) (dependência automática)

## Instalação

1. No Foundry VTT, vá em **Add-on Modules** → **Install Module**
2. Cole a URL do manifest: `https://github.com/SEU-USER/lumenn-lightweight/releases/latest/download/module.json`
3. Clique em **Install**

## Uso

### Upload Automático
Ativado por padrão. Ao enviar uma imagem via FilePicker, ela é automaticamente comprimida para WebP.

### Modo Lote
1. Abra as Configurações do Módulo
2. Clique em **Otimizador de Imagens**
3. Ajuste a qualidade e economia mínima
4. Clique em **Otimizar Biblioteca**

### API

```javascript
game.modules.get('lumenn-lightweight').api.openOptimizerDialog();
```

## Configurações

| Config | Tipo | Default | Descrição |
|--------|------|---------|-----------|
| Qualidade | Slider 0.1–1.0 | 0.75 | Qualidade da compressão WebP |
| Economia Mínima % | Slider 0–90 | 25 | Porcentagem mínima de redução para substituir |
| Auto-otimizar | Boolean | true | Comprimir ao upload via FilePicker |
| Pular WebP existente | Boolean | false | Pular arquivos que já têm .webp |

## Desenvolvimento

```bash
npm install
npm test
```

## Licença

GPL-3.0
