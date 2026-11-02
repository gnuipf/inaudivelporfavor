# Inaudível Por Favor — site

Site institucional + IPF Store + BDRMD, preparado para GitHub Pages.

## Páginas
- `index.html`: página inicial da Inaudível Por Favor.
- `loja.html`: catálogo e pedidos via WhatsApp.
- `bdrmd/index.html`: banco de lançamentos original, preservado e adaptado para a nova pasta.

## Configurar WhatsApp
Edite `assets/js/loja.js` e substitua `5500000000000` pelo número oficial com DDI, DDD e número, somente dígitos.

## Editar catálogo
Edite o array `products` em `assets/js/loja.js`. Os cards usam arte tipográfica provisória; substitua por fotografias/mockups reais quando estiverem disponíveis.

## BDRMD
A aplicação original foi copiada para `bdrmd/`, incluindo CSS, JavaScript, configuração do Google Sheets e dados de demonstração. A URL CSV e as funcionalidades existentes foram mantidas. O menu da ferramenta permite voltar à página institucional e acessar a loja.

## GitHub Pages
Em Settings → Pages, publique a branch `main` a partir da raiz do repositório. O site não exige backend.

## Observações
- O WhatsApp permanece como número de configuração até ser informado.
- Os produtos e preços do catálogo são exemplos iniciais.
- A atualização do GitHub Pages pode levar alguns minutos após o commit.
