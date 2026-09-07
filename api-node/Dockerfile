FROM node:20-alpine
WORKDIR /app

# O contexto de build é a raiz do repositório, porque a imagem precisa dos
# protos além do código do serviço. O layout montado aqui é o mesmo que os
# volumes do compose reproduzem em desenvolvimento: /app é a raiz do api-node e
# /app/protos guarda os contratos gRPC — que é onde src/grpc os procura.
COPY api-node/package*.json ./
RUN npm install

COPY api-node/ ./
COPY protos/ ./protos/

RUN npx prisma generate

EXPOSE 4000
CMD ["npm", "run", "dev"]
