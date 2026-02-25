

## Pagina de Cadastro de Membros (nao indexada)

Criar uma pagina publica `/cadastro` onde membros podem se auto-cadastrar selecionando sua equipe. A pagina nao sera indexada pelos motores de busca.

### Alteracoes

**1. Edge Function `register-member`**
- Nova edge function que recebe nome, email, senha e team_id
- Usa service role para criar o usuario via `auth.admin.createUser`
- Busca a `region_id` da equipe selecionada automaticamente
- Atualiza o profile com `team_id` e `region_id`
- Insere a role `member` na tabela `user_roles`
- NAO requer autenticacao (endpoint publico, protegido apenas pela anon key)

**2. Pagina `src/pages/Register.tsx`**
- Formulario com campos: Nome Completo, E-mail, Senha e Equipe (select)
- Busca todas as equipes agrupadas por regiao para facilitar a selecao
- Ao submeter, chama a edge function `register-member`
- Apos sucesso, redireciona para `/auth` com mensagem de confirmacao
- Link de volta para a pagina de login

**3. Rota no `src/App.tsx`**
- Adicionar rota `/cadastro` apontando para a pagina Register (fora do ProtectedRoute)

**4. Meta tag noindex no `index.html`**
- Adicionar `<meta name="robots" content="noindex, nofollow">` diretamente na pagina Register via React Helmet ou um useEffect que manipula o head
- Alternativa mais simples: usar um componente que injeta a meta tag ao montar

**5. Link na pagina de login**
- Adicionar um link discreto na pagina `/auth` para `/cadastro` ("Ainda nao tem conta? Cadastre-se")

### Detalhes tecnicos

- A edge function usa `SUPABASE_SERVICE_ROLE_KEY` para criar usuarios e atribuir roles, contornando RLS
- A equipe carregada via query publica nas tabelas `teams` e `regions` (que ja possuem policies de SELECT para autenticados) -- como o usuario nao esta logado, a edge function buscara os dados das equipes tambem
- A meta tag `noindex` sera injetada via useEffect no componente Register para nao afetar outras paginas
- Somente a role `member` sera atribuida, sem opcao de escolha pelo usuario
