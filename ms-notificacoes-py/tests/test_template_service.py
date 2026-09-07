"""
Renderização dos e-mails transacionais.

Um placeholder que não é substituído não gera erro: gera um e-mail com
"{{nome}}" impresso no corpo, enviado a um cliente real. Testar aqui é mais
barato que descobrir na caixa de entrada.
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from services.template_service import TemplateService  # noqa: E402


class TestPagamentoAprovado:
    def test_substitui_todos_os_placeholders(self):
        html = TemplateService.render("pagamento_aprovado.html", {
            "nome": "Ana", "pedido_id": 42, "metodo": "PIX", "valor": "89.90",
        })

        assert "Ana" in html
        assert "42" in html
        assert "PIX" in html
        assert "89.90" in html

    def test_nao_sobra_placeholder_no_corpo(self):
        html = TemplateService.render("pagamento_aprovado.html", {
            "nome": "Ana", "pedido_id": 42, "metodo": "PIX", "valor": "89.90",
        })

        assert "{{" not in html, "algum placeholder ficou sem substituição"

    def test_converte_valores_nao_textuais(self):
        # pedido_id chega como int no payload do evento
        html = TemplateService.render("pagamento_aprovado.html", {
            "nome": "Ana", "pedido_id": 7, "metodo": "CARTAO", "valor": 12.5,
        })

        assert "7" in html and "12.5" in html


class TestPedidoEntregue:
    def test_substitui_os_placeholders(self):
        html = TemplateService.render("pedido_entregue.html", {"nome": "Bruno", "pedido_id": 99})

        assert "Bruno" in html
        assert "99" in html
        assert "{{" not in html


class TestFalhas:
    def test_template_inexistente_falha_alto(self):
        # melhor estourar e mandar a mensagem para a DLQ do que enviar um e-mail vazio
        with pytest.raises(FileNotFoundError):
            TemplateService.render("nao_existe.html", {})

    def test_contexto_incompleto_deixa_o_placeholder_visivel(self):
        """
        Comportamento atual, documentado para não regredir sem querer: faltando
        uma chave, o marcador aparece cru no e-mail. É o argumento para validar
        o payload antes de renderizar.
        """
        html = TemplateService.render("pedido_entregue.html", {"nome": "Bruno"})

        assert "{{pedido_id}}" in html
