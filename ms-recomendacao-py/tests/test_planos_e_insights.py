"""
A resolução do plano comercial e o Strategy que ela seleciona.

É a regra que separa o que o lojista gratuito vê do que o assinante vê — e a
que depende de o plano viver fora do conjunto replicado, para sobreviver a um
rebuild da réplica.
"""
import pytest

from models import RestauranteReplica, AssinaturaRestaurante, ProdutoReplica, CategoriaReplica
from services.recommendation_service import RecommendationService


@pytest.fixture
def servico():
    return RecommendationService()


@pytest.fixture
def loja(sessao):
    sessao.add(RestauranteReplica(id=1, nome="Cantina", latitude=-22.9, longitude=-43.2))
    sessao.add(CategoriaReplica(id=10, nome="Massas", restaurante_id=1))
    sessao.add(ProdutoReplica(id=100, nome="Lasanha", preco=45.0, categoria_id=10, restaurante_id=1))
    sessao.commit()
    return sessao


def test_restaurante_desconhecido_devolve_erro(servico, sessao):
    resposta = servico.get_store_recommendations(db=sessao, restaurante_id=999)
    assert resposta["status"] == "ERROR"


def test_sem_assinatura_o_lojista_e_tratado_como_gratuito(servico, loja):
    # ausência de registro significa plano gratuito, não erro
    resposta = servico.get_store_recommendations(db=loja, restaurante_id=1)

    assert resposta["plano"] == "GRATUITO"
    assert resposta["status"] == "ACESS_DENIED"
    assert "PREMIUM" in resposta["mensagem"]


def test_assinatura_premium_libera_a_analise(servico, loja):
    loja.add(AssinaturaRestaurante(restaurante_id=1, plano="PREMIUM"))
    loja.commit()

    resposta = servico.get_store_recommendations(db=loja, restaurante_id=1)

    assert resposta["plano"] == "PREMIUM"
    assert resposta["status"] != "ACESS_DENIED"


def test_downgrade_volta_a_negar(servico, loja):
    assinatura = AssinaturaRestaurante(restaurante_id=1, plano="PREMIUM")
    loja.add(assinatura)
    loja.commit()

    assinatura.plano = "GRATUITO"
    loja.commit()

    assert servico.get_store_recommendations(db=loja, restaurante_id=1)["status"] == "ACESS_DENIED"


def test_plano_e_lido_sem_distincao_de_caixa(servico, loja):
    loja.add(AssinaturaRestaurante(restaurante_id=1, plano="premium"))
    loja.commit()

    assert servico.get_store_recommendations(db=loja, restaurante_id=1)["status"] != "ACESS_DENIED"


def test_assinatura_de_um_lojista_nao_vaza_para_outro(servico, loja):
    loja.add(RestauranteReplica(id=2, nome="Outra", latitude=-22.8, longitude=-43.1))
    loja.add(AssinaturaRestaurante(restaurante_id=1, plano="PREMIUM"))
    loja.commit()

    assert servico.get_store_recommendations(db=loja, restaurante_id=2)["plano"] == "GRATUITO"


def test_assinatura_vive_fora_do_conjunto_replicado(loja):
    """
    Um rebuild da réplica derruba só as tabelas derivadas. Se a assinatura
    estivesse dentro de RestauranteReplica, como já esteve, este teste falharia
    e todos os lojistas perderiam o plano contratado.
    """
    from models import TABELAS_DERIVADAS

    nomes_derivadas = {t.name for t in TABELAS_DERIVADAS}
    assert AssinaturaRestaurante.__tablename__ not in nomes_derivadas
    assert RestauranteReplica.__tablename__ in nomes_derivadas
