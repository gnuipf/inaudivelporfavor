# Inaudível Por Favor

Site institucional da **Inaudível Por Favor**, projeto independente dedicado ao rock, ao metal e à cultura underground. O repositório também mantém a aplicação **BDRMD (Brutal Display of Raw Metal Data)**, uma base de consulta de lançamentos musicais.

O projeto é desenvolvido com HTML, CSS e JavaScript puro e publicado pelo GitHub Pages. Não requer backend, processo de build ou instalação de dependências.

**Site:** https://www.inaudivelporfavor.com.br  
**Repositório:** https://github.com/gnuipf/inaudivelporfavor

## Conteúdo

- **Página institucional:** apresenta a Inaudível Por Favor, seus objetivos e os formatos de conteúdo.
- **BDRMD:** ferramenta para pesquisar e explorar lançamentos de rock e metal.
- **IPF Store:** página e implementação da loja mantidas no código, mas temporariamente ocultas e fora da navegação pública. A estrutura foi preservada para uma possível reativação.

## Funcionalidades

### Site institucional

- Apresentação do projeto e de sua proposta editorial.
- Navegação por seções da página.
- Acesso à aplicação BDRMD e aos canais oficiais da IPF.
- Layout responsivo para desktop e dispositivos móveis.

### BDRMD

- Consulta de lançamentos a partir de uma planilha pública do Google Sheets.
- Base JSON local para demonstração quando a URL da planilha não estiver configurada.
- Pesquisa por banda e título, com normalização para facilitar buscas com diferenças de acentuação e caixa.
- Filtros por tipo de lançamento e ano.
- Ordenação por data, título ou banda.
- Paginação e seleção da quantidade de registros por página.
- Exibição em tabela no desktop e em cartões em telas menores.
- Indicadores de quantidade de lançamentos, bandas e aniversários do dia.
- Cálculo de aniversários de lançamentos.
- Mapa Mental interativo, organizado por décadas, meses e dias, respeitando os filtros ativos.
- Preservação de caracteres especiais e grafias originais dos títulos.

## Estrutura de diretórios

```text
.
├── index.html                 # Página inicial institucional
├── loja.html                  # Página da IPF Store (temporariamente oculta)
├── CNAME                      # Domínio personalizado do GitHub Pages
├── README.md                  # Documentação do projeto
├── logo_fundo_tran.png        # Logotipo principal
├── favicon-32x32.png          # Favicon usado pelo site
│
├── assets/
│   ├── css/
│   │   └── style.css          # Estilos do site institucional e da loja
│   ├── js/
│   │   ├── main.js            # Menu responsivo e ano do rodapé
│   │   └── loja.js            # Catálogo e integração de pedidos via WhatsApp
│   └── img/
│       └── favicon.svg        # Ícone SVG mantido nos assets
│
├── bdrmd/
│   ├── index.html             # Interface da aplicação BDRMD
│   ├── config.js              # Configuração da fonte de dados
│   ├── favicon.svg             # Favicon da aplicação
│   ├── css/
│   │   └── style.css          # Estilos da aplicação BDRMD
│   ├── js/
│   │   └── app.js             # Pesquisa, filtros, renderização e mapa mental
│   └── data/
│       └── releases.json      # Base local de demonstração
│
├── config.js                  # Configuração da versão legada da BDRMD
├── css/
│   └── style.css              # Estilos da versão legada da BDRMD
├── js/
│   └── app.js                 # JavaScript da versão legada da BDRMD
└── data/
    └── releases.json          # Dados locais da versão legada da BDRMD
```

> **Nota sobre os arquivos legados:** as pastas `config.js`, `css/`, `js/` e `data/` na raiz foram mantidas no repositório como cópias da estrutura anterior da BDRMD. A página atualmente publicada da ferramenta utiliza os arquivos dentro de `bdrmd/`.

## Fonte de dados da BDRMD

A configuração fica em `bdrmd/config.js`:

```javascript
window.BDRMD_CONFIG = {
  SHEET_CSV_URL: "URL_PUBLICA_CSV_DO_GOOGLE_SHEETS"
};
```

A planilha deve estar publicada na web em formato CSV e conter os cabeçalhos:

| Campo | Descrição |
| --- | --- |
| `banda` | Nome da banda ou artista |
| `titulo` | Título do lançamento |
| `data` | Data no formato `YYYY-MM-DD` |
| `work_type` | Tipo de lançamento |

Tipos utilizados pela aplicação: `album`, `ep`, `single`, `compilation`, `demo` e `live`.

Para utilizar somente os dados locais de demonstração, deixe `SHEET_CSV_URL` como uma string vazia. Quando uma URL estiver configurada, a aplicação consulta a planilha; se a leitura falhar ou não houver registros válidos, apresenta uma mensagem de erro em vez de trocar silenciosamente para os dados de demonstração.

O arquivo `bdrmd/data/releases.json` contém registros de demonstração e segue a mesma estrutura básica dos dados normalizados pela aplicação.

## Desenvolvimento e publicação

### Requisitos

- Navegador moderno com suporte a JavaScript.
- Conta e repositório no GitHub.
- GitHub Pages habilitado para o repositório.

Não há dependências de Node.js, gerenciador de pacotes ou etapa de compilação.

### Executar localmente

Como o projeto utiliza arquivos estáticos, basta servir a raiz do repositório com um servidor HTTP local. Por exemplo, com Python:

```bash
python -m http.server 8000
```

Depois, acesse:

- Site institucional: http://localhost:8000/
- BDRMD: http://localhost:8000/bdrmd/

O uso de um servidor HTTP local é recomendado para que as requisições aos arquivos JSON e à planilha funcionem corretamente.

### GitHub Pages

1. Acesse **Settings → Pages** no repositório.
2. Configure a publicação a partir da branch `main`, diretório `/(root)`.
3. Salve as configurações e aguarde a publicação.
4. Mantenha o arquivo `CNAME` e os registros DNS correspondentes ao domínio personalizado.

As alterações publicadas na branch configurada são implantadas automaticamente pelo GitHub Pages. A atualização pode levar alguns minutos.

## Manutenção

- Atualize a interface institucional em `index.html`.
- Altere o visual institucional em `assets/css/style.css`.
- Altere o comportamento do menu e do rodapé em `assets/js/main.js`.
- Mantenha a aplicação BDRMD organizada dentro de `bdrmd/`.
- Atualize a fonte de dados da BDRMD em `bdrmd/config.js`.
- Para alterar a lógica da BDRMD, edite `bdrmd/js/app.js`; para o visual, edite `bdrmd/css/style.css`.
- A página e os recursos da IPF Store estão preservados em `loja.html`, `assets/css/style.css` e `assets/js/loja.js`. A ocultação atual é controlada pela classe CSS `.temporarily-hidden`; não é necessário excluir os arquivos para manter a loja fora da navegação.

## Licença

Este repositório não declara uma licença de uso ou redistribuição. Entre em contato com a administração da Inaudível Por Favor antes de reutilizar conteúdo, identidade visual ou dados próprios do projeto.
