"""
Os handlers de CDC — o coração do read-model.

O Debezium entrega at-least-once: reprocessar é comportamento normal, não
exceção. Se estes testes passarem, a réplica converge para o mesmo estado
independentemente de quantas vezes o tópico for relido.
"""
import pytest

from conftest import envelope
from messaging.kafka_consumer import (
    KafkaCDCConsumer,
    TOPICO_RESTAURANTES,
    TOPICO_CATEGORIAS,
    TOPICO_PRODUTOS,
    TOPICO_PEDIDOS,
    TOPICO_ITENS,
)
from models import (
    RestauranteReplica,
    CategoriaReplica,
    ProdutoReplica,
    HistoricoPedido,
    VendaProdutoAnalise,
)


@pytest.fixture
def consumidor():
    return KafkaCDCConsumer()


RESTAURANTE = {"id": 1, "nome": "Cantina", "latitude": -22.9, "longitude": -43.2}
CATEGORIA = {"id": 10, "nome": "Massas", "restaurante_id": 1}
PRODUTO = {"id": 100, "nome": "Lasanha", "preco": 45.0, "categoria_id": 10}
PEDIDO = {
    "id": 7, "usuario_id": 3, "restaurante_id": 1, "valor_total": 90.0,
    "destino_latitude": -22.95, "destino_longitude": -43.18,
    "data_criacao": 1_760_000_000_000_000,  # microssegundos, como o Debezium envia
}
ITEM = {"id": 500, "pedido_id": 7, "produto_id": 100, "quantidade": 2, "preco_unitario": 45.0}


def catalogo_completo(consumidor, op="c"):
    consumidor._processar(TOPICO_RESTAURANTES, envelope(op, RESTAURANTE))
    consumidor._processar(TOPICO_CATEGORIAS, envelope(op, CATEGORIA))
    consumidor._processar(TOPICO_PRODUTOS, envelope(op, PRODUTO))


class TestCatalogo:
    def test_cria_restaurante_categoria_e_produto(self, consumidor, sessao):
        catalogo_completo(consumidor)

        assert sessao.query(RestauranteReplica).count() == 1
        assert sessao.query(CategoriaReplica).count() == 1
        produto = sessao.query(ProdutoReplica).one()
        assert produto.nome == "Lasanha"
        assert produto.preco == 45.0
        # o restaurante é resolvido pela categoria, não vem no evento de produto
        assert produto.restaurante_id == 1

    def test_snapshot_inicial_e_tratado_como_criacao(self, consumidor, sessao):
        # op "r" é o snapshot do Debezium; ignorá-lo deixaria a réplica vazia
        consumidor._processar(TOPICO_RESTAURANTES, envelope("r", RESTAURANTE))
        assert sessao.query(RestauranteReplica).count() == 1

    def test_atualizacao_sobrescreve_sem_duplicar(self, consumidor, sessao):
        consumidor._processar(TOPICO_RESTAURANTES, envelope("c", RESTAURANTE))
        consumidor._processar(TOPICO_RESTAURANTES,
                              envelope("u", {**RESTAURANTE, "nome": "Cantina Nova"}))

        assert sessao.query(RestauranteReplica).count() == 1
        assert sessao.query(RestauranteReplica).one().nome == "Cantina Nova"

    def test_delete_remove_da_replica(self, consumidor, sessao):
        consumidor._processar(TOPICO_RESTAURANTES, envelope("c", RESTAURANTE))
        consumidor._processar(TOPICO_RESTAURANTES, envelope("d", before=RESTAURANTE))

        assert sessao.query(RestauranteReplica).count() == 0

    def test_tombstone_nao_quebra_o_consumidor(self, consumidor, sessao):
        # o Debezium emite valor nulo após delete quando há compactação de log
        consumidor._processar(TOPICO_RESTAURANTES, None)
        assert sessao.query(RestauranteReplica).count() == 0

    def test_produto_fora_de_ordem_e_corrigido_quando_a_categoria_chega(self, consumidor, sessao):
        # o snapshot não garante ordem entre tabelas
        consumidor._processar(TOPICO_PRODUTOS, envelope("r", PRODUTO))
        assert sessao.query(ProdutoReplica).one().restaurante_id == 0

        consumidor._processar(TOPICO_CATEGORIAS, envelope("r", CATEGORIA))
        sessao.expire_all()
        assert sessao.query(ProdutoReplica).one().restaurante_id == 1


class TestVendas:
    def test_venda_usa_quantidade_e_preco_reais(self, consumidor, sessao):
        catalogo_completo(consumidor)
        consumidor._processar(TOPICO_PEDIDOS, envelope("c", PEDIDO))
        consumidor._processar(TOPICO_ITENS, envelope("c", ITEM))

        venda = sessao.query(VendaProdutoAnalise).one()
        assert venda.quantidade == 2
        assert venda.preco_unitario == 45.0
        assert venda.produto_id == 100
        assert venda.restaurante_id == 1

    def test_item_antes_do_pedido_e_corrigido_depois(self, consumidor, sessao):
        catalogo_completo(consumidor)
        consumidor._processar(TOPICO_ITENS, envelope("c", ITEM))

        # sem o pedido, o restaurante vem do produto e a data é provisória
        venda = sessao.query(VendaProdutoAnalise).one()
        assert venda.restaurante_id == 1

        consumidor._processar(TOPICO_PEDIDOS, envelope("c", PEDIDO))
        sessao.expire_all()
        pedido = sessao.query(HistoricoPedido).one()
        assert sessao.query(VendaProdutoAnalise).one().data_criacao == pedido.data_criacao

    def test_data_vem_do_pedido_e_nao_do_momento_do_processamento(self, consumidor, sessao):
        # a análise de melhor dia e horário depende disso
        catalogo_completo(consumidor)
        consumidor._processar(TOPICO_PEDIDOS, envelope("c", PEDIDO))
        consumidor._processar(TOPICO_ITENS, envelope("c", ITEM))

        assert sessao.query(VendaProdutoAnalise).one().data_criacao.year == 2025

    def test_delete_do_item_remove_a_venda(self, consumidor, sessao):
        catalogo_completo(consumidor)
        consumidor._processar(TOPICO_PEDIDOS, envelope("c", PEDIDO))
        consumidor._processar(TOPICO_ITENS, envelope("c", ITEM))
        consumidor._processar(TOPICO_ITENS, envelope("d", before=ITEM))

        assert sessao.query(VendaProdutoAnalise).count() == 0


class TestIdempotencia:
    """A garantia central: reprocessar o tópico converge, não duplica."""

    def test_mesmo_evento_duas_vezes_nao_duplica(self, consumidor, sessao):
        catalogo_completo(consumidor)
        consumidor._processar(TOPICO_PEDIDOS, envelope("c", PEDIDO))
        consumidor._processar(TOPICO_ITENS, envelope("c", ITEM))
        consumidor._processar(TOPICO_ITENS, envelope("c", ITEM))

        assert sessao.query(VendaProdutoAnalise).count() == 1

    def test_replay_completo_do_topico_mantem_o_mesmo_estado(self, consumidor, sessao):
        def aplicar_tudo():
            catalogo_completo(consumidor, op="r")
            consumidor._processar(TOPICO_PEDIDOS, envelope("r", PEDIDO))
            consumidor._processar(TOPICO_ITENS, envelope("r", ITEM))

        aplicar_tudo()
        antes = {
            "restaurantes": sessao.query(RestauranteReplica).count(),
            "categorias": sessao.query(CategoriaReplica).count(),
            "produtos": sessao.query(ProdutoReplica).count(),
            "pedidos": sessao.query(HistoricoPedido).count(),
            "vendas": sessao.query(VendaProdutoAnalise).count(),
        }

        aplicar_tudo()  # rebalance, restart ou reset de offset
        sessao.expire_all()
        depois = {
            "restaurantes": sessao.query(RestauranteReplica).count(),
            "categorias": sessao.query(CategoriaReplica).count(),
            "produtos": sessao.query(ProdutoReplica).count(),
            "pedidos": sessao.query(HistoricoPedido).count(),
            "vendas": sessao.query(VendaProdutoAnalise).count(),
        }

        assert antes == depois == {
            "restaurantes": 1, "categorias": 1, "produtos": 1, "pedidos": 1, "vendas": 1,
        }

    def test_reprocessar_atualizacao_reflete_o_ultimo_estado(self, consumidor, sessao):
        catalogo_completo(consumidor)
        consumidor._processar(TOPICO_PRODUTOS, envelope("u", {**PRODUTO, "preco": 52.0}))
        consumidor._processar(TOPICO_PRODUTOS, envelope("u", {**PRODUTO, "preco": 52.0}))

        assert sessao.query(ProdutoReplica).count() == 1
        assert sessao.query(ProdutoReplica).one().preco == 52.0


class TestResiliencia:
    def test_payload_invalido_nao_derruba_o_consumidor(self, consumidor, sessao):
        # a mensagem é perdida, mas o consumidor continua processando as próximas
        consumidor._processar(TOPICO_ITENS, envelope("c", {"id": 1}))  # sem pedido_id
        consumidor._processar(TOPICO_RESTAURANTES, envelope("c", RESTAURANTE))

        assert sessao.query(RestauranteReplica).count() == 1

    def test_envelope_com_invólucro_payload_tambem_e_aceito(self, consumidor, sessao):
        # tolerância à configuração do connector com schemas.enable=true
        consumidor._processar(TOPICO_RESTAURANTES, {"payload": envelope("c", RESTAURANTE)})
        assert sessao.query(RestauranteReplica).count() == 1
