# Base de clientes Maxfio / AtivaMax — como colocar no ar

Mesmo esquema do CRM Sicredi/MaxIA: projeto Vite + React já configurado,
conectado ao Supabase (mesmo projeto). Sem precisar rodar nada no terminal
do Mac — só GitHub + Cloudflare Pages.

## Passo 1 — Rodar o SQL no Supabase

1. Abra o Supabase → **SQL Editor** → **New query**
2. Cole o conteúdo do arquivo `supabase-schema-ativamax-carteira.sql` (que veio
   junto com este pacote) e clique em **Run**

Isso cria a tabela `ativamax_carteira_clientes`, vazia por enquanto.

## Passo 2 — Criar um repositório no GitHub

1. github.com → **New repository** → nome, ex: `base-clientes-maxfio`
2. Deixe **privado**
3. Suba **todos os arquivos e pastas** desta pasta `base-maxfio-projeto`
   (Add file → Upload files, mantendo a estrutura — `src/main.jsx`,
   `src/BaseClientesMaxfio.jsx` e `src/index.css` precisam ficar DENTRO
   da pasta `src`)
4. Commit changes

## Passo 3 — Conectar ao Cloudflare Pages

1. Workers & Pages → Create application → aba **Pages** → Connect to Git
2. Selecione o repositório que você acabou de criar
3. Configuração de build:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - (se pedir "Framework preset" e não tiver Vite na lista, escolha "None")
4. Save and Deploy

## Passo 4 — Importar os dados pela primeira vez

Depois que o site estiver no ar, abra ele e clique em **"Importar CSV"**,
selecionando o arquivo `ativamax_carteira_rows.csv`. O sistema lê o arquivo
no seu navegador e envia os registros para o Supabase em lotes de 500 —
para ~7.290 linhas isso leva alguns segundos. Depois disso os dados já
ficam salvos no banco; da próxima vez que abrir o site, carrega direto
do Supabase, sem precisar importar de novo.

Reimportar o mesmo CSV depois (ou uma versão atualizada) não duplica nada —
os registros são atualizados pelo `id` de cada linha.
