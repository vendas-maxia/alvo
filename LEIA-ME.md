# CRM Sicredi Hauer — como colocar no ar (sem usar terminal)

Este é um projeto completo (Vite + React + Tailwind), já configurado com o
Supabase. Siga os passos abaixo — tudo pode ser feito pelo site do GitHub e
do Cloudflare, sem precisar rodar comando nenhum no seu computador.

## Passo 1 — Criar um repositório no GitHub

1. Acesse https://github.com e crie uma conta (se ainda não tiver)
2. Clique em "New repository" (Novo repositório)
3. Dê um nome, ex: `crm-sicredi-hauer`
4. Deixe como **privado** (recomendado, já que tem a chave do Supabase)
5. Clique em "Create repository"

## Passo 2 — Subir os arquivos desta pasta

1. Na página do repositório recém-criado, clique em "uploading an existing file"
   (ou "Add file" → "Upload files")
2. Arraste **todos os arquivos e pastas** desta pasta `crm-sicredi-hauer-projeto`
   para dentro da janela do navegador (mantenha a estrutura de pastas — o
   arquivo `src/CRMSicrediHauer.jsx` precisa continuar dentro de `src/`)
3. Clique em "Commit changes" (Confirmar alterações)

## Passo 3 — Conectar ao Cloudflare Pages

1. Acesse o painel do Cloudflare → **Workers & Pages**
2. Clique em "Create application" → aba **Pages** → "Connect to Git"
3. Autorize o Cloudflare a acessar sua conta do GitHub, se pedir
4. Selecione o repositório `crm-sicredi-hauer` que você acabou de criar
5. Na tela de configuração de build, preencha:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
6. Clique em "Save and Deploy"

O Cloudflare vai baixar o projeto, rodar o `npm install` e o build sozinho —
isso leva 1 a 3 minutos. Quando terminar, ele te dá um link
(algo como `crm-sicredi-hauer.pages.dev`) onde o CRM já estará no ar,
conectado ao Supabase.

## Depois de publicado

Qualquer atualização futura: é só subir o arquivo alterado de novo no GitHub
(mesma tela do Passo 2) e o Cloudflare rebuilda e republica automaticamente.

## Se der erro no build

Copie a mensagem de erro que aparece no painel do Cloudflare (aba "Deployments"
→ clique no deploy que falhou → veja o log) e me mande — eu ajudo a resolver.
