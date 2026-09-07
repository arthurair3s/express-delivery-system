#!/bin/sh
# Registra o connector Debezium no Kafka Connect.
#
# Existe porque a configuração do connector nunca esteve versionada: era preciso
# fazer um POST manual na API do Connect depois de cada `docker compose up`, e
# quem clonasse o repositório subia o Kafka sem nenhum dado fluindo.
#
# O script é idempotente, mas não ingênuo: um connector que existe e está com a
# task falhada é recriado. Sem isso, o CDC morria em silêncio a partir da segunda
# subida — o `prisma db push --force-reset` do api derruba as tabelas, o connector
# perde o acesso a elas e a task falha para sempre.
set -e

CONNECT_URL="${CONNECT_URL:-http://debezium-connect:8083}"
CONFIG="/debezium/connector-catalogo.json"
NOME="delivery-catalogo-connector"

for var in DB_USER DB_PASS DB_NAME; do
  eval valor=\$$var
  if [ -z "$valor" ]; then
    echo "[Debezium] ERRO: variável $var não definida." >&2
    exit 1
  fi
done

echo "[Debezium] Aguardando o Kafka Connect em ${CONNECT_URL}..."
i=0
until curl -sf "${CONNECT_URL}/connectors" > /dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then
    echo "[Debezium] ERRO: Connect não respondeu após 60 tentativas." >&2
    exit 1
  fi
  sleep 2
done
echo "[Debezium] Connect disponível."

registrar() {
  sed -e "s|\${DB_USER}|${DB_USER}|g" \
      -e "s|\${DB_PASS}|${DB_PASS}|g" \
      -e "s|\${DB_NAME}|${DB_NAME}|g" \
      "$CONFIG" > /tmp/connector.json

  codigo=$(curl -s -o /tmp/resposta.json -w '%{http_code}' \
    -X POST "${CONNECT_URL}/connectors" \
    -H 'Content-Type: application/json' \
    --data @/tmp/connector.json)

  case "$codigo" in
    200|201) echo "[Debezium] Connector registrado. Snapshot inicial em andamento."; return 0 ;;
    409)     echo "[Debezium] Connector já existia (409). Nada a fazer.";            return 0 ;;
    *)       echo "[Debezium] ERRO: Connect respondeu ${codigo}." >&2
             cat /tmp/resposta.json >&2
             return 1 ;;
  esac
}

if curl -sf "${CONNECT_URL}/connectors/${NOME}/status" -o /tmp/status.json 2>/dev/null; then
  # A task é quem realmente lê o WAL; o connector pode estar RUNNING com a task
  # morta, que é o estado em que o CDC para sem gerar erro visível.
  if grep -q '"state":"FAILED"' /tmp/status.json; then
    echo "[Debezium] Connector '${NOME}' existe, mas a task está FAILED. Recriando..."
    curl -s -X DELETE "${CONNECT_URL}/connectors/${NOME}" > /dev/null
    sleep 3
    registrar
    exit $?
  fi
  echo "[Debezium] Connector '${NOME}' já registrado e saudável."
  exit 0
fi

echo "[Debezium] Registrando '${NOME}'..."
registrar
