# Copa dos Sabores

Mapa interativo em 3D para explorar selecoes da Copa do Mundo 2026 e descobrir pratos tradicionais de cada pais participante. A experiencia combina um globo navegavel, busca por pais ou receita, destaque visual das selecoes e um modal com imagem, descricao, titulos de Copa e link para a materia.

## Visao Geral

O projeto e uma aplicacao front-end feita com Vite, JavaScript puro, Globe.gl e Three.js. A pagina principal renderiza um globo WebGL com dados geograficos locais, colore os paises participantes e abre detalhes gastronomicos quando o usuario seleciona um pais pelo mapa ou pela busca.

As receitas e a lista de paises clicaveis sao carregadas diretamente do CSV local `assets/paises-mapa-v5.csv`. O GeoJSON continua sendo usado para desenhar o mapa-mundi inteiro no globo.

## Como Rodar

Requisitos:

- Node.js instalado, preferencialmente versao 18 ou superior
- npm instalado

Instale as dependencias:

```bash
npm install
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Abra a URL exibida pelo Vite, normalmente:

```text
http://localhost:5173/
```

Gerar build de producao:

```bash
npm run build
```

Visualizar o build localmente:

```bash
npm run preview
```

## Estrutura

```text
.
├── index.html
├── main.js
├── style.css
├── vite.config.js
├── ne_110m_admin_0_countries.geojson
├── assets/
│   ├── paises-mapa-v5.csv
│   ├── background_desk.webp
│   ├── background_mob.webp
│   ├── mouse-icone.svg
│   ├── mouse-icone-click.svg
│   ├── Gopher/
│   └── GLOBOTIPO/
└── package.json
```

## Principais Arquivos

`index.html` define a estrutura da interface: cabecalho, busca, container do globo, controles de zoom/rotacao e modal de receita.

`main.js` concentra a logica da aplicacao:

- lista os paises participantes exibidos pelo projeto;
- define titulos de Copa por pais;
- carrega receitas do CSV local;
- carrega e normaliza o GeoJSON;
- inicializa o Globe.gl;
- controla hover, clique, zoom, rotacao e ponto de vista da camera;
- popula a busca;
- abre e fecha o modal de receita.

`assets/paises-mapa-v5.csv` contem os dados exibidos no modal: pais, nome da receita, imagem, descricao e link da materia.

`style.css` define a identidade visual, fontes locais, fundos responsivos, layout desktop/mobile, modal glassmorphism, lista de busca, controles do globo e estados de interacao.

`ne_110m_admin_0_countries.geojson` e o mapa base. Ele tem 183 features, foi reduzido para manter apenas as propriedades usadas pela aplicacao (`ADMIN`, `GEOUNIT`, `NAME`, `NAME_LONG`, `NAME_PT`, `SOVEREIGNT` e `ISO_A2`) e fornece a geometria `Polygon` ou `MultiPolygon` com coordenadas compactadas.

`vite.config.js` usa `base: './'`, o que ajuda o build a funcionar em hospedagens com caminhos relativos.

## Como a Aplicacao Funciona

1. `index.html` carrega `style.css`, Globe.gl via CDN e `main.js` como modulo.
2. `main.js` importa a URL do GeoJSON e a URL do CSV local via Vite.
3. A funcao `loadRecipesCsvText()` carrega `assets/paises-mapa-v5.csv`.
4. O CSV e parseado por `parseCSV()`, que suporta campos com aspas, virgulas e quebras de linha.
5. O app cruza o nome do pais no CSV com os nomes do GeoJSON, incluindo `NAME_PT` e o nome traduzido por `Intl.DisplayNames`.
6. Em paralelo, o GeoJSON dos paises e carregado.
7. Cada feature do mapa passa por normalizacao e ajuste de escala.
8. O globo renderiza todos os paises do GeoJSON para manter o mapa completo.
9. Apenas os paises encontrados no CSV recebem interacao de hover, clique, modal e aparecem na busca.
10. Ao clicar em um pais, o globo move a camera para a regiao e abre o modal com receita, bandeira, titulos e link da materia.

## Dados de Receitas

As receitas ficam em `assets/paises-mapa-v5.csv`.

O parser espera as colunas nesta ordem:

| Coluna | Conteudo |
| --- | --- |
| `Pais` | nome do pais em portugues |
| `Nome da receita` | titulo exibido no modal |
| `Imagem` | URL da imagem da receita |
| `Descricao` | texto exibido no modal |
| `Link da receita` | URL usada no CTA "Aprenda a fazer a receita" |

O nome em portugues da coluna `Pais` e usado para encontrar a feature correspondente no GeoJSON. Quando encontra, a receita e salva internamente pela chave `properties.ADMIN`, que e o nome em ingles usado pelo mapa.

Ao adicionar novos paises no CSV, confira se o nome em `Pais` bate com `NAME_PT` do GeoJSON ou com o nome traduzido pelo navegador.

## Globo e Mapa

O globo e criado com:

```js
const world = Globe()(document.getElementById('globeViz'))
```

Configuracoes importantes:

- fundo transparente para integrar com a arte em `assets/background_desk.webp` e `assets/background_mob.webp`;
- oceano com material Three.js customizado;
- atmosfera azul-esverdeada;
- paises participantes com cor e altitude mais fortes;
- paises nao participantes ainda renderizados para manter o contorno mundial;
- zoom padrao desativado para evitar conflito com scroll;
- rotacao nativa desativada, substituida por controle customizado.

Se um pais do CSV nao existir ou nao casar com nenhum nome do GeoJSON, ele continua ausente da busca e nao fica clicavel; um aviso e enviado ao console.

## Interacoes

- Hover em desktop: destaca pais participante, pausa a rotacao e exibe tooltip com bandeira, nome e titulos.
- Clique no pais: calcula centro geografico aproximado, ajusta zoom por tamanho do pais e abre o modal.
- Busca: filtra por nome em portugues, nome em ingles ou nome do prato.
- Mobile: a busca vira overlay em tela cheia quando focada.
- Escape: fecha a busca mobile ou o modal.
- Zoom: botoes `+` e `-` alteram a altitude da camera.
- Rotacao: slider customizado muda longitude; ao segurar nas extremidades, continua girando.

## Responsividade

No desktop, o conteudo textual fica alinhado a esquerda e o globo e deslocado para manter a composicao visual. No mobile, o fundo muda para `background_mob.webp`, a busca fica fixa no rodape e os controles do globo ficam acima dela.

O codigo tambem filtra gestos touch no globo para evitar que arrastos horizontais e cliques sinteticos prejudiquem a navegacao em telas pequenas.

## Assets

- `assets/background_desk.webp`: fundo desktop.
- `assets/background_mob.webp`: fundo mobile.
- `assets/mouse-icone.svg`: cursor customizado.
- `assets/mouse-icone-click.svg`: cursor customizado durante clique.
- `assets/Gopher/`: familia usada em titulos e destaques; o CSS carrega os arquivos `.woff2`.
- `assets/GLOBOTIPO/`: familia usada em textos de apoio; o CSS carrega os arquivos `.woff2`.
- `assets/texturas-globo.ai`: arquivo-fonte de textura/arte.

## Manutencao

Para atualizar titulos de Copa, edite `worldCupTitles` em `main.js`.

Para corrigir bandeiras ou subdivisoes do Reino Unido, ajuste `countryIsoOverrides` e `normalizeMapFeature()` em `main.js`.

Para adicionar, remover ou atualizar paises clicaveis e exibidos na busca, edite `assets/paises-mapa-v5.csv`.

Para mudar o visual da pagina, comece por `:root` em `style.css`, onde ficam cores, fontes e medidas-base do layout.

## Observacoes Tecnicas

- A aplicacao depende de rede para carregar Globe.gl via CDN, imagens externas de receitas e bandeiras do FlagCDN.
- O CSV de receitas e local e entra no build como asset do Vite.
- O build final e gerado em `dist/`.
- Como `base` esta configurado como `./`, os assets do build usam caminhos relativos.
