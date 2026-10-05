# Users REST API

API REST desenvolvida em **JavaScript, Node.js e Express**, com PostgreSQL e Prisma ORM. Segue uma arquitetura **MVC adaptada para APIs REST**, complementada por camadas de Service e Repository.

### Tecnologias

- Node.js e Express
- PostgreSQL e Prisma ORM
- JWT e Argon2id
- Zod
- Swagger/OpenAPI
- Jest e Supertest

### Arquitetura

- **Model:** modelagem dos dados e representação das entidades.
- **Controller:** coordenação das requisições e respostas HTTP.
- **Service:** regras de negócio e autorização.
- **Repository:** acesso persistente ao banco de dados.
- **Routes e Middlewares:** roteamento, autenticação, validação e tratamento de erros.

### Funcionalidades

- CRUD de usuários
- Autenticação JWT com refresh tokens rotativos
- Controle de acesso e proteção de senhas com Argon2id
- Validação de entrada e tratamento centralizado de erros
- Testes de integração e documentação Swagger

O projeto prioriza segurança, organização, baixo acoplamento e facilidade de manutenção e evolução.

### Principais pontos positivos

- **Organização:** separação entre Controllers, Services e Repository, facilitando manutenção e evolução.
- **Segurança:** senhas protegidas com Argon2id e respostas sem expor senha ou hash.
- **Controle de acesso:** cada usuário só pode consultar, atualizar ou excluir a própria conta.
- **Autenticação:** JWT com expiração curta e refresh tokens com rotação e revogação.
- **Validação:** Zod verifica os dados, rejeita campos extras e normaliza o e-mail.
- **Integridade:** restrição única no PostgreSQL previne e-mails duplicados, inclusive em criações concorrentes.
- **Tratamento de erros:** respostas HTTP padronizadas, sem revelar detalhes internos.
- **Documentação:** Swagger permite consultar e experimentar os endpoints.
- **Qualidade:** 12 cenários de integração e um teste de health/Swagger; ESLint e Prettier estão configurados.

Os testes de integração usam um banco PostgreSQL isolado chamado `users_api_test`. A execução completa requer que o PostgreSQL esteja disponível e que as migrations tenham sido aplicadas; consulte [Testes e qualidade](#testes-e-qualidade).

## Requisitos e início

- Node.js 22 LTS ou 24 LTS
- PostgreSQL 14 ou superior
- npm

Crie os bancos `users_api` e `users_api_test` no PostgreSQL. Copie `.env.example` para `.env` e ajuste `DATABASE_URL`, `JWT_ACCESS_SECRET` (mínimo de 32 caracteres) e `CORS_ORIGIN`. Para testes, copie `.env.test.example` para `.env.test` e use credenciais de um banco isolado.

Com `psql`, os bancos podem ser criados uma vez com:

```sql
CREATE DATABASE users_api;
CREATE DATABASE users_api_test;
```

```bash
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

A API inicia em `http://localhost:3000`; health check em `/health`, Swagger em `/api-docs` e endpoints sob `/api`.

## Variáveis de ambiente

| Variável                     | Uso                                        |
| ---------------------------- | ------------------------------------------ |
| `NODE_ENV`                   | `development`, `test` ou `production`      |
| `PORT`                       | Porta HTTP                                 |
| `DATABASE_URL`               | Conexão PostgreSQL usada pelo Prisma       |
| `JWT_ACCESS_SECRET`          | Segredo HS256, ao menos 32 caracteres      |
| `JWT_ISSUER`, `JWT_AUDIENCE` | Claims obrigatórios dos access tokens      |
| `ACCESS_TOKEN_TTL`           | Duração do access token (padrão `15m`)     |
| `REFRESH_TOKEN_TTL_DAYS`     | Validade do refresh token (padrão 30 dias) |
| `CORS_ORIGIN`                | Origens permitidas, separadas por vírgula  |
| `LOG_LEVEL`                  | Nível de log estruturado                   |

## Endpoints

| Método e rota            | Acesso                    | Resultado                         |
| ------------------------ | ------------------------- | --------------------------------- |
| `POST /api/users`        | Público                   | 201; cria usuário                 |
| `GET /api/users/:id`     | Bearer; próprio usuário   | 200                               |
| `PUT /api/users/:id`     | Bearer; próprio usuário   | 200; atualiza `name` e/ou `email` |
| `DELETE /api/users/:id`  | Bearer; próprio usuário   | 204 sem corpo                     |
| `POST /api/auth/login`   | Público; limite 10/15 min | 200; access e refresh tokens      |
| `POST /api/auth/refresh` | Público com refresh token | 200; rotaciona ambos os tokens    |
| `POST /api/auth/logout`  | Público com refresh token | 204; revoga a sessão              |

Exemplo de cadastro:

```http
POST /api/users
Content-Type: application/json

{"name":"Maria da Silva","email":"maria@example.com","password":"Frase-segura-2026!"}
```

O cadastro responde com `data` contendo `id`, `name`, `email`, `createdAt` e `updatedAt`. A senha e seu hash nunca aparecem na resposta. Para rotas privadas, envie `Authorization: Bearer <accessToken>`. O PUT recebe ao menos um de `name` e `email`; campos desconhecidos são rejeitados.

Exemplo de resposta de cadastro:

```json
{
  "data": {
    "id": "<uuid-gerado-pela-api>",
    "name": "Maria da Silva",
    "email": "maria@example.com",
    "createdAt": "<data-hora-ISO-8601>",
    "updatedAt": "<data-hora-ISO-8601>"
  }
}
```

Para autenticar, envie `POST /api/auth/login` com o mesmo e-mail e senha do cadastro. A resposta contém `accessToken`, `refreshToken`, `tokenType` e o usuário público. Use o access token nas rotas de usuário; envie o refresh token para `/api/auth/refresh` e use o token rotacionado a partir daí. Para atualizar, envie `PUT /api/users/<uuid>` com Bearer e, por exemplo, `{"name":"Maria Souza"}`.

## Validação e erros

Zod valida UUIDs, e-mail, nome (3–100 caracteres), senha (12–128 caracteres) e campos permitidos. E-mail é trimado e convertido para minúsculas. Dados semanticamente inválidos retornam 422; JSON malformado, 400; corpo acima do limite, 413; ausência/token inválido, 401; acesso a outro usuário, 403; recurso ausente, 404; e-mail ou relação em conflito, 409; limite excedido, 429; falha inesperada, 500 sem stack trace ou valores recebidos.

## Segurança

Argon2id armazena apenas hashes de senha. Para reduzir diferenças de tempo que poderiam facilitar a descoberta de contas, o login também executa uma verificação Argon2id de custo equivalente quando o e-mail não existe. Access tokens HS256 têm vida curta e validam algoritmo, assinatura, expiração, emissor e audiência. Refresh tokens aleatórios têm seu SHA-256 armazenado no PostgreSQL e são rotacionados em transação atômica; reutilizar um token rotacionado revoga as sessões ativas da conta, inclusive em tentativas concorrentes. Logout revoga o refresh token. O middleware autoriza apenas o proprietário, e não existe listagem geral. Prisma usa queries parametrizadas; o Helmet, CORS por allowlist, limite de corpo JSON e rate limit de login reduzem a superfície de ataque. Logs estruturados não incluem tokens ou corpos de autenticação. Configure os segredos pelo gerenciador de segredos do ambiente de produção.

## Banco de dados

`prisma/schema.prisma` define `User` e `RefreshSession`, chaves UUID, e-mail único, cascata de exclusão e índice de sessões por usuário. A migration versionada está em `prisma/migrations/20261005000000_init/`. Alterações de schema devem gerar migrations e ser aplicadas com `npx prisma migrate deploy` em produção.

## Testes e qualidade

Os testes Jest/Supertest são testes de integração e usam PostgreSQL de verdade; a suíte interrompe a execução antes de limpar dados se `NODE_ENV` não for `test` ou se o banco não se chamar exatamente `users_api_test`. Configure `.env.test` para esse banco descartável:

```bash
npm run db:generate
npx dotenv -e .env.test -- prisma migrate deploy
npm test
npm run lint
npm run format
```

Os testes limpam as tabelas `refresh_sessions` e `users` do banco `users_api_test` antes de cada caso. A configuração exige esse nome exato para reduzir o risco de apagar dados de outro ambiente. Nunca aponte a URL de teste para produção ou para um banco com dados que queira preservar.
