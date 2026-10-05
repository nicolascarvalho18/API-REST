# Resposta ao teste técnico

## 1. Classes e camadas

Defini rotas para declarar o contrato HTTP, middlewares para autenticação, validação e falhas, controllers enxutos para traduzir requisições em respostas, serviços para concentrar regras de negócio e autorização, repositórios para isolar consultas Prisma e modelos para controlar os campos públicos. A configuração de ambiente e banco fica centralizada. Essa separação mantém cada responsabilidade testável e permite substituir detalhes de persistência sem levar SQL ou regras para os controllers.

## 2. Validações e erros

Uso Zod para validar parâmetros, corpos estritos e formatos antes de executar os serviços. O e-mail é normalizado em minúsculas, o nome exige 3 a 100 caracteres e a senha exige pelo menos 12. Um middleware central converte erros conhecidos em respostas consistentes e registra falhas inesperadas sem enviar stack traces ao cliente. A unicidade do e-mail é aplicada pelo índice PostgreSQL e conflitos Prisma são mapeados para 409, inclusive em cenários concorrentes.

## 3. Códigos HTTP

Retorno 201 ao criar, 200 em consultas, atualizações e autenticação, e 204 em exclusão e logout sem corpo. Uso 400 para JSON malformado, 401 para credencial ou token inválido, 403 para usuário autenticado sem autorização, 404 para recurso ou rota inexistente, 409 para e-mail em conflito, 422 para dados semanticamente inválidos, 429 para excesso de tentativas e 500 para falhas inesperadas. Assim, o status comunica a natureza da falha sem expor detalhes internos.

## 4. Persistência

O Prisma persiste usuários e sessões de refresh em PostgreSQL. O schema versiona UUID, timestamps, e-mail único e chave estrangeira com cascata; a migration SQL correspondente está no repositório. O ORM parametriza consultas. A rotação do refresh token atualiza a sessão antiga e insere a nova na mesma transação, impedindo que dois usos concorrentes validem o mesmo token.

## 5. Autenticação JWT

O serviço de autenticação verifica senhas com Argon2id e emite access token HS256 de curta duração, com `sub`, emissor, audiência e expiração validados em cada chamada. Quando a conta não existe, também executo a verificação Argon2id contra um hash de referência, reduzindo diferenças de tempo que poderiam facilitar enumeração de e-mails. Refresh tokens aleatórios são armazenados somente como hash SHA-256 e rotacionados em transação; a reutilização de um token antigo revoga as sessões ativas da conta. O logout revoga o refresh token. A autorização exige que o identificador do recurso corresponda ao usuário autenticado; não há listagem global. Helmet, CORS restrito, limite de tentativas de login, segredos externos ao código e logs sem tokens completam as proteções contra força bruta, exposição de credenciais e vazamento de sessão.
