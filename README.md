# Agente IA

Aplicacao web de chat com Google Gemini e memoria persistida no MongoDB.

## Tecnologias

- Node.js e Express
- Google Generative AI
- MongoDB e Mongoose
- HTML, CSS e JavaScript
- Health check para monitoramento externo

## Configuracao

1. Copie `.env.example` para `.env`.
2. Preencha `GEMINI_API_KEY` e `MONGO_URI`.
3. Instale as dependencias com `npm install`.
4. Inicie com `npm start`.
5. Abra `http://localhost:3000`.

Nunca publique `.env` ou chaves reais no repositorio. O arquivo `.gitignore` ja bloqueia esse arquivo.

## Health check

A rota publica `GET /api/health` retorna JSON com status `ok` e timestamp. Ela pode ser cadastrada no UptimeRobot usando a URL de producao, com intervalo de 14 minutos.

## Estado da auditoria

O health check e o indicador visual do front-end estao implementados. Os testes de producao ainda precisam ser executados com a URL implantada e credenciais reais. Autenticacao JWT, upload de imagens com Cloudinary e Function Calling de clima nao fazem parte da implementacao atual e devem ser tratados como pendencias no relatorio, caso ainda nao tenham sido adicionados.

## Rotas

- `GET /api/health`: verifica a disponibilidade da API.
- `POST /api/chat`: envia uma pergunta para o agente.
- `DELETE /api/chat/limpar`: remove o historico salvo.
