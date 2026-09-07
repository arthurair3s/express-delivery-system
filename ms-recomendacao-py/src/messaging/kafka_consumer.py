import json
import os
import time
import logging
from threading import Thread
from datetime import datetime, timezone
from typing import Optional

# pyrefly: ignore [missing-import]
from kafka import KafkaConsumer
from database import SessionLocal
from replica import grupo_consumidor
from observability import eventos_cdc, eventos_cdc_erro
from models import (
    RestauranteReplica,
    CategoriaReplica,
    ProdutoReplica,
    HistoricoPedido,
    VendaProdutoAnalise,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("KafkaCDCConsumer")

PREFIXO = "dbserver1.public."

TOPICO_RESTAURANTES = PREFIXO + "restaurantes"
TOPICO_CATEGORIAS = PREFIXO + "categorias"
TOPICO_PRODUTOS = PREFIXO + "produtos"
TOPICO_PEDIDOS = PREFIXO + "pedidos"
TOPICO_ITENS = PREFIXO + "itens_pedido"


class KafkaCDCConsumer:
    """
    Aplica na réplica analítica as mudanças capturadas do WAL do banco principal
    pelo Debezium.

    A diferença em relação a publicar eventos pela aplicação é a origem do dado:
    aqui o evento é derivado de uma transação já commitada, então não existe o
    dual write — não há como o banco gravar e o evento se perder. E como o WAL
    não sabe quem escreveu, escritas fora da API (seed, migration, SQL manual)
    também são replicadas. Ver docs/adr/0006.
    """

    def __init__(self):
        self.bootstrap_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
        self.topics = [
            TOPICO_RESTAURANTES,
            TOPICO_CATEGORIAS,
            TOPICO_PRODUTOS,
            TOPICO_PEDIDOS,
            TOPICO_ITENS,
        ]
        self.consumer: Optional[KafkaConsumer] = None
        self.running = False
        self.thread = None

    # ── ciclo de vida ────────────────────────────────────────────────────────

    def start(self):
        self.running = True
        self.thread = Thread(target=self._run, daemon=True)
        self.thread.start()
        logger.info("Thread do consumer CDC iniciada.")

    def stop(self):
        self.running = False
        if self.consumer is not None:
            # pyrefly: ignore [missing-attribute]
            self.consumer.close()
            logger.info("Conexão com o Kafka encerrada.")

    def _run(self):
        while self.running:
            try:
                logger.info(f"Conectando ao Kafka em {self.bootstrap_servers}...")
                # pyrefly: ignore [bad-assignment]
                self.consumer = KafkaConsumer(
                    *self.topics,
                    bootstrap_servers=self.bootstrap_servers,
                    value_deserializer=lambda m: json.loads(m.decode("utf-8")) if m else None,
                    # earliest é o que permite reconstruir a réplica do zero:
                    # um consumer novo relê o tópico desde o snapshot inicial.
                    auto_offset_reset="earliest",
                    group_id=grupo_consumidor(),
                    enable_auto_commit=True,
                )
                logger.info(f"Conectado. Escutando: {self.topics}")
                break
            except Exception as e:
                logger.error(f"Falha ao conectar no Kafka: {e}. Nova tentativa em 5s...")
                time.sleep(5)

        if not self.running:
            return

        while self.running:
            try:
                if self.consumer is None:
                    time.sleep(1)
                    continue
                # pyrefly: ignore [missing-attribute]
                lotes = self.consumer.poll(timeout_ms=1000)
                for _particao, registros in lotes.items():
                    for registro in registros:
                        self._processar(registro.topic, registro.value)
            except Exception as e:
                if self.running:
                    logger.error(f"Erro no loop de consumo: {e}")
                    time.sleep(2)

    # ── despacho ─────────────────────────────────────────────────────────────

    def _processar(self, topico: str, mensagem):
        # tombstone: o Debezium emite valor nulo após um delete quando a
        # compactação de log está ativa. Não há o que aplicar.
        if not mensagem:
            return

        # com schemas.enable=false o envelope vem direto; mantemos a leitura do
        # invólucro "payload" para tolerar a configuração com schema.
        envelope = mensagem.get("payload") if "payload" in mensagem else mensagem
        if not envelope:
            return

        op = envelope.get("op")
        antes = envelope.get("before") or {}
        depois = envelope.get("after") or {}

        db = SessionLocal()
        try:
            if topico == TOPICO_RESTAURANTES:
                self._restaurante(db, op, antes, depois)
            elif topico == TOPICO_CATEGORIAS:
                self._categoria(db, op, antes, depois)
            elif topico == TOPICO_PRODUTOS:
                self._produto(db, op, antes, depois)
            elif topico == TOPICO_PEDIDOS:
                self._pedido(db, op, antes, depois)
            elif topico == TOPICO_ITENS:
                self._item_pedido(db, op, antes, depois)
            db.commit()
            eventos_cdc.labels(tabela=topico.removeprefix(PREFIXO), operacao=op or "?").inc()
        except Exception as e:
            db.rollback()
            eventos_cdc_erro.labels(tabela=topico.removeprefix(PREFIXO)).inc()
            logger.error(f"Erro ao aplicar mudança de '{topico}' (op={op}): {e}")
        finally:
            db.close()

    # ── catálogo ─────────────────────────────────────────────────────────────

    def _restaurante(self, db, op, antes, depois):
        # 'r' é o snapshot inicial; 'c' e 'u' são escrita e atualização.
        if op in ("c", "r", "u"):
            rid = depois.get("id")
            rest = db.query(RestauranteReplica).filter(RestauranteReplica.id == rid).first()
            if rest:
                rest.nome = depois.get("nome")
                rest.latitude = depois.get("latitude")
                rest.longitude = depois.get("longitude")
            else:
                db.add(RestauranteReplica(
                    id=rid, nome=depois.get("nome"),
                    latitude=depois.get("latitude"), longitude=depois.get("longitude"),
                ))
            logger.info(f"Restaurante #{rid} sincronizado.")
        elif op == "d":
            rid = antes.get("id")
            rest = db.query(RestauranteReplica).filter(RestauranteReplica.id == rid).first()
            if rest:
                db.delete(rest)
                logger.info(f"Restaurante #{rid} removido da réplica.")

    def _categoria(self, db, op, antes, depois):
        if op in ("c", "r", "u"):
            cid = depois.get("id")
            rid = depois.get("restaurante_id")
            cat = db.query(CategoriaReplica).filter(CategoriaReplica.id == cid).first()
            if cat:
                cat.nome = depois.get("nome")
                cat.restaurante_id = rid
            else:
                db.add(CategoriaReplica(id=cid, nome=depois.get("nome"), restaurante_id=rid))

            # O snapshot não garante ordem entre tabelas: um produto pode ter
            # chegado antes da sua categoria e ficado sem restaurante (0).
            # quando a categoria chega, os pendentes são corrigidos.
            pendentes = db.query(ProdutoReplica).filter(
                ProdutoReplica.categoria_id == cid,
                ProdutoReplica.restaurante_id == 0,
            ).all()
            for p in pendentes:
                p.restaurante_id = rid
                logger.info(f"Produto #{p.id} reassociado ao restaurante #{rid}.")
            logger.info(f"Categoria #{cid} sincronizada.")
        elif op == "d":
            cid = antes.get("id")
            cat = db.query(CategoriaReplica).filter(CategoriaReplica.id == cid).first()
            if cat:
                db.delete(cat)

    def _produto(self, db, op, antes, depois):
        if op in ("c", "r", "u"):
            pid = depois.get("id")
            cid = depois.get("categoria_id")
            rid = 0
            if cid:
                cat = db.query(CategoriaReplica).filter(CategoriaReplica.id == cid).first()
                if cat:
                    rid = cat.restaurante_id

            prod = db.query(ProdutoReplica).filter(ProdutoReplica.id == pid).first()
            if prod:
                prod.nome = depois.get("nome")
                prod.preco = depois.get("preco")
                prod.categoria_id = cid
                # só sobrescreve o restaurante se já sabemos qual é, para não
                # zerar uma associação que já havia sido resolvida.
                if rid:
                    prod.restaurante_id = rid
            else:
                db.add(ProdutoReplica(
                    id=pid, nome=depois.get("nome"), preco=depois.get("preco"),
                    categoria_id=cid, restaurante_id=rid,
                ))
            logger.info(f"Produto #{pid} sincronizado (restaurante #{rid}).")
        elif op == "d":
            pid = antes.get("id")
            prod = db.query(ProdutoReplica).filter(ProdutoReplica.id == pid).first()
            if prod:
                db.delete(prod)

    # ── pedidos e vendas ─────────────────────────────────────────────────────

    @staticmethod
    def _para_datetime(valor) -> datetime:
        """
        O Debezium serializa timestamp sem timezone como microssegundos desde a
        epoch. Aceita também string ISO, caso a configuração do connector mude.
        """
        if valor is None:
            return datetime.now(timezone.utc)
        if isinstance(valor, (int, float)):
            return datetime.fromtimestamp(valor / 1_000_000, tz=timezone.utc)
        try:
            return datetime.fromisoformat(str(valor).replace("Z", "+00:00"))
        except ValueError:
            return datetime.now(timezone.utc)

    def _pedido(self, db, op, antes, depois):
        if op in ("c", "r", "u"):
            pid = depois.get("id")
            criado_em = self._para_datetime(depois.get("data_criacao"))

            hist = db.query(HistoricoPedido).filter(HistoricoPedido.pedido_id == pid).first()
            if hist:
                hist.valor_total = float(depois.get("valor_total") or 0)
                hist.data_criacao = criado_em
            else:
                db.add(HistoricoPedido(
                    pedido_id=pid,
                    usuario_id=depois.get("usuario_id") or 0,
                    restaurante_id=depois.get("restaurante_id") or 0,
                    valor_total=float(depois.get("valor_total") or 0),
                    destino_latitude=float(depois.get("destino_latitude") or 0),
                    destino_longitude=float(depois.get("destino_longitude") or 0),
                    data_criacao=criado_em,
                ))

            # backfill dos itens que chegaram antes deste pedido e por isso
            # ficaram sem restaurante ou com data provisória.
            pendentes = db.query(VendaProdutoAnalise).filter(
                VendaProdutoAnalise.pedido_id == pid
            ).all()
            for v in pendentes:
                v.restaurante_id = depois.get("restaurante_id") or v.restaurante_id
                v.data_criacao = criado_em
            logger.info(f"Pedido #{pid} sincronizado ({len(pendentes)} itens ajustados).")
        elif op == "d":
            pid = antes.get("id")
            hist = db.query(HistoricoPedido).filter(HistoricoPedido.pedido_id == pid).first()
            if hist:
                db.delete(hist)

    def _item_pedido(self, db, op, antes, depois):
        """
        Cada item de pedido vira uma linha de venda analítica — com quantidade e
        preço reais, vindos da tabela. Antes disso, este serviço sorteava
        produtos e quantidades para preencher a análise.
        """
        if op in ("c", "r", "u"):
            item_id = depois.get("id")
            pedido_id = depois.get("pedido_id")
            produto_id = depois.get("produto_id")
            if not pedido_id or not produto_id:
                return

            pedido = db.query(HistoricoPedido).filter(
                HistoricoPedido.pedido_id == pedido_id
            ).first()

            if pedido:
                restaurante_id = pedido.restaurante_id
                criado_em = pedido.data_criacao
            else:
                # item chegou antes do pedido: usa o restaurante do produto e
                # marca a data como provisória. O handler de pedido corrige.
                prod = db.query(ProdutoReplica).filter(ProdutoReplica.id == produto_id).first()
                restaurante_id = prod.restaurante_id if prod else 0
                criado_em = datetime.now(timezone.utc)

            venda = db.query(VendaProdutoAnalise).filter(
                VendaProdutoAnalise.item_pedido_id == item_id
            ).first()
            if venda:
                venda.quantidade = depois.get("quantidade") or 0
                venda.preco_unitario = float(depois.get("preco_unitario") or 0)
                venda.restaurante_id = restaurante_id
                venda.data_criacao = criado_em
            else:
                db.add(VendaProdutoAnalise(
                    item_pedido_id=item_id,
                    pedido_id=pedido_id,
                    produto_id=produto_id,
                    restaurante_id=restaurante_id,
                    preco_unitario=float(depois.get("preco_unitario") or 0),
                    quantidade=depois.get("quantidade") or 0,
                    data_criacao=criado_em,
                ))
            logger.info(f"Venda do item #{item_id} (pedido #{pedido_id}) sincronizada.")
        elif op == "d":
            item_id = antes.get("id")
            venda = db.query(VendaProdutoAnalise).filter(
                VendaProdutoAnalise.item_pedido_id == item_id
            ).first()
            if venda:
                db.delete(venda)
