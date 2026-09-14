import React, { useState, useEffect } from 'react';
import {
  GET_RESTAURANTES,
  OBTER_INSIGHTS_LOJA,
  ATUALIZAR_ASSINATURA,
  GET_RESTAURANTE_MENU,
  CRIAR_PRODUTO,
  DELETAR_PRODUTO,
  CRIAR_CATEGORIA,
  GET_PEDIDOS_RESTAURANTE,
  EDITAR_STATUS_PEDIDO,
  EDITAR_RESTAURANTE
} from '../graphql/queries';
import { API_URL } from '../config';

const authFetch = (query, variables = {}) => {
  const token = localStorage.getItem('token');
  return fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ query, variables })
  }).then(r => r.json());
};

export default function RestaurantePanel({ usuario }) {
  const [restaurantes, setRestaurantes] = useState([]);
  const [selectedRestauranteId, setSelectedRestauranteId] = useState('');
  
  // Abas: 'pedidos', 'cardapio', 'insights', 'config'
  const [activeTab, setActiveTab] = useState('pedidos');
  
  // Pedidos
  const [pedidos, setPedidos] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  
  // Cardápio
  const [menu, setMenu] = useState(null);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('');
  const [novoProduto, setNovoProduto] = useState({ nome: '', descricao: '', preco: '', categoriaId: '' });
  
  // Insights B2B
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [updatingSubscription, setUpdatingSubscription] = useState(false);
  
  // Config
  const [config, setConfig] = useState({ nome: '', descricao: '', endereco: '', latitude: '', longitude: '' });
  const [savingConfig, setSavingConfig] = useState(false);

  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // 1. Carrega os restaurantes
  useEffect(() => {
    authFetch(GET_RESTAURANTES)
      .then(res => {
        if (res.errors) throw new Error(res.errors[0].message);
        const list = res.data.restaurantes || [];
        setRestaurantes(list);
        
        // Se o usuário tem restaurante_id, forçamos a seleção dele
        if (usuario?.restaurante_id) {
          setSelectedRestauranteId(String(usuario.restaurante_id));
        } else if (list.length > 0) {
          setSelectedRestauranteId(String(list[0].id));
        }
      })
      .catch(err => {
        console.error(err);
        setError('Falha ao carregar a lista de restaurantes.');
      });
  }, [usuario]);

  // Atualiza restaurante ativo quando muda a seleção
  useEffect(() => {
    if (selectedRestauranteId) {
      const rest = restaurantes.find(r => String(r.id) === selectedRestauranteId);
      if (rest) {
        setConfig({
          nome: rest.nome || '',
          descricao: rest.descricao || '',
          endereco: rest.endereco || '',
          latitude: rest.latitude != null ? String(rest.latitude) : '',
          longitude: rest.longitude != null ? String(rest.longitude) : ''
        });
      }
      
      // Recarrega dados dependentes
      fetchPedidos(selectedRestauranteId);
      fetchMenu(selectedRestauranteId);
      fetchInsights(selectedRestauranteId);
    }
  }, [selectedRestauranteId, restaurantes]);

  // 2. Busca pedidos do restaurante
  const fetchPedidos = async (restauranteId) => {
    if (!restauranteId) return;
    setLoadingPedidos(true);
    try {
      const res = await authFetch(GET_PEDIDOS_RESTAURANTE, { restaurante_id: restauranteId });
      if (res.errors) throw new Error(res.errors[0].message);
      setPedidos(res.data.pedidosPorRestaurante || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPedidos(false);
    }
  };

  // 3. Busca o cardápio (categorias e produtos)
  const fetchMenu = async (restauranteId) => {
    if (!restauranteId) return;
    setLoadingMenu(true);
    try {
      const res = await authFetch(GET_RESTAURANTE_MENU, { id: restauranteId });
      if (res.errors) throw new Error(res.errors[0].message);
      setMenu(res.data.restaurante);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMenu(false);
    }
  };

  // 4. Busca insights
  const fetchInsights = (restauranteId) => {
    if (!restauranteId) return;
    setLoadingInsights(true);
    authFetch(OBTER_INSIGHTS_LOJA, { restauranteId: parseInt(restauranteId) })
      .then(res => {
        if (res.errors) throw new Error(res.errors[0].message);
        setInsights(res.data.obterInsightsLoja);
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        setLoadingInsights(false);
      });
  };

  // Aceitar / Mudar status de pedido
  const handleAlterarStatusPedido = async (pedidoId, novoStatus) => {
    setError(null);
    try {
      const res = await authFetch(EDITAR_STATUS_PEDIDO, { id: pedidoId, status: novoStatus });
      if (res.errors) throw new Error(res.errors[0].message);
      
      showSuccess(`Pedido #${pedidoId} status alterado para ${novoStatus}!`);
      fetchPedidos(selectedRestauranteId);
    } catch (e) {
      showError(e.message || 'Erro ao alterar status do pedido.');
    }
  };

  // Criar categoria
  const handleCriarCategoria = async (e) => {
    e.preventDefault();
    if (!novaCategoriaNome.trim()) return;
    setError(null);
    try {
      const res = await authFetch(CRIAR_CATEGORIA, { nome: novaCategoriaNome, restaurante_id: selectedRestauranteId });
      if (res.errors) throw new Error(res.errors[0].message);
      
      setNovaCategoriaNome('');
      showSuccess('Categoria criada com sucesso!');
      fetchMenu(selectedRestauranteId);
    } catch (e) {
      showError(e.message || 'Erro ao criar categoria.');
    }
  };

  // Criar produto
  const handleCriarProduto = async (e) => {
    e.preventDefault();
    if (!novoProduto.nome || !novoProduto.preco) return;
    setError(null);
    try {
      const res = await authFetch(CRIAR_PRODUTO, {
        nome: novoProduto.nome,
        descricao: novoProduto.descricao,
        preco: parseFloat(novoProduto.preco),
        categoria_id: novoProduto.categoriaId || null
      });
      if (res.errors) throw new Error(res.errors[0].message);
      
      setNovoProduto({ nome: '', descricao: '', preco: '', categoriaId: '' });
      showSuccess('Produto cadastrado com sucesso!');
      fetchMenu(selectedRestauranteId);
    } catch (e) {
      showError(e.message || 'Erro ao cadastrar produto.');
    }
  };

  // Deletar produto
  const handleDeletarProduto = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover este produto?')) return;
    setError(null);
    try {
      const res = await authFetch(DELETAR_PRODUTO, { id });
      if (res.errors) throw new Error(res.errors[0].message);
      
      showSuccess('Produto excluído com sucesso!');
      fetchMenu(selectedRestauranteId);
    } catch (e) {
      showError(e.message || 'Erro ao excluir produto.');
    }
  };

  // Salvar Configurações da Loja
  const handleSalvarConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    setError(null);
    try {
      const res = await authFetch(EDITAR_RESTAURANTE, {
        id: selectedRestauranteId,
        nome: config.nome,
        descricao: config.descricao,
        endereco: config.endereco,
        latitude: config.latitude ? parseFloat(config.latitude) : null,
        longitude: config.longitude ? parseFloat(config.longitude) : null
      });
      if (res.errors) throw new Error(res.errors[0].message);
      
      showSuccess('Configurações atualizadas!');
      // Atualizar lista local
      setRestaurantes(prev => prev.map(r => String(r.id) === selectedRestauranteId ? { ...r, ...res.data.editarRestaurante } : r));
    } catch (e) {
      showError(e.message || 'Erro ao salvar configurações.');
    } finally {
      setSavingConfig(false);
    }
  };

  // Assinatura Premium
  const handleAtualizarAssinatura = async (novoPlano) => {
    setUpdatingSubscription(true);
    setError(null);
    try {
      const res = await authFetch(ATUALIZAR_ASSINATURA, {
        restauranteId: parseInt(selectedRestauranteId),
        plano: novoPlano
      });
      if (res.errors) throw new Error(res.errors[0].message);
      
      showSuccess(`Plano de assinatura atualizado para ${novoPlano}!`);
      fetchInsights(selectedRestauranteId);
    } catch (e) {
      showError(e.message || 'Erro ao atualizar plano.');
    } finally {
      setUpdatingSubscription(false);
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  };

  const formatarData = (dataStr) => {
    if (!dataStr) return 'Sem data';
    const num = Number(dataStr);
    const parsed = new Date(isNaN(num) ? dataStr : num);
    return isNaN(parsed.getTime()) ? dataStr : parsed.toLocaleString('pt-BR');
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'PENDENTE': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'EM_PREPARO_ENTREGA': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'EM_TRANSITO': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'ENTREGUE': return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELADO': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSuggestionBadgeStyle = (tipo) => {
    switch (tipo) {
      case 'BAIXAR_PRECO_COMPETITIVO': return 'bg-red-50 text-red-600 border-red-200';
      case 'MANTER_PRECO_PROMO': return 'bg-green-50 text-green-600 border-green-200';
      case 'PROMOÇÃO_LOCAL': return 'bg-purple-50 text-purple-600 border-purple-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getSuggestionBadgeText = (tipo) => {
    switch (tipo) {
      case 'BAIXAR_PRECO_COMPETITIVO': return 'Preço Desalinhado';
      case 'MANTER_PRECO_PROMO': return 'Preço Competitivo';
      case 'PROMOÇÃO_LOCAL': return 'Oportunidade Local';
      default: return 'Recomendação';
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <span>🏪</span> Painel do Restaurante
          </h1>
          <p className="text-gray-500 mt-1">Gerencie seu cardápio, acompanhe pedidos recebidos e otimize vendas.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-gray-600">Restaurante Ativo:</label>
          <select
            value={selectedRestauranteId}
            onChange={(e) => setSelectedRestauranteId(e.target.value)}
            disabled={usuario?.restaurante_id != null && !import.meta.env.DEV}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-brandRed/20 disabled:bg-gray-50 disabled:text-gray-500"
          >
            {restaurantes.map(r => (
              <option key={r.id} value={r.id}>{r.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-red-600 text-sm mb-6 flex items-center gap-3 animate-shake">
          <span>⚠️</span>
          <p className="font-semibold">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-green-600 text-sm mb-6 flex items-center gap-3 animate-fade-in">
          <span>✔</span>
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}

      {/* Navegação de Abas */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto gap-2">
        {[
          { id: 'pedidos', label: '📋 Pedidos', count: pedidos.filter(p => p.status === 'PENDENTE').length },
          { id: 'cardapio', label: '🍕 Cardápio' },
          { id: 'insights', label: '💡 Insights B2B' },
          { id: 'config', label: '⚙️ Configurações' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 font-semibold text-sm rounded-t-xl transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-brandRed text-white shadow-md'
                : 'text-gray-500 hover:text-brandRed hover:bg-gray-50'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-2 bg-white text-brandRed text-xs px-2 py-0.5 rounded-full font-bold">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ABA DE PEDIDOS */}
      {activeTab === 'pedidos' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Fila de Pedidos</h2>
            <button
              onClick={() => fetchPedidos(selectedRestauranteId)}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 font-medium"
            >
              🔄 Atualizar
            </button>
          </div>

          {loadingPedidos ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-brandRed border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-3 text-gray-500 text-sm">Carregando pedidos...</p>
            </div>
          ) : pedidos.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-100 rounded-3xl p-8">
              <span className="text-4xl">📭</span>
              <h3 className="text-lg font-bold text-gray-800 mt-4">Nenhum pedido recente</h3>
              <p className="text-gray-400 text-sm mt-1">Os novos pedidos feitos pelos clientes aparecerão aqui.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pedidos.map(p => (
                <div key={p.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-gray-200 transition-all">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-gray-900 text-lg">Pedido #{p.id}</span>
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${getStatusStyle(p.status)}`}>
                        {p.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 break-words">
                      Cliente: <span className="font-bold text-gray-700">{p.usuario?.nome}</span> ({p.usuario?.endereco})
                    </p>
                    <p className="text-xs text-gray-400">
                      Criado em: {formatarData(p.data_criacao)}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto shrink-0">
                    <div className="text-left sm:text-right sm:pr-4 border-b sm:border-b-0 sm:border-r border-gray-100 pb-2 sm:pb-0">
                      <p className="text-xs text-gray-400 font-bold uppercase">Valor Total</p>
                      <p className="text-lg font-extrabold text-slate-800">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor_total)}
                      </p>
                    </div>

                    {p.status === 'PENDENTE' && (
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleAlterarStatusPedido(p.id, 'EM_PREPARO_ENTREGA')}
                          className="flex-1 sm:flex-none px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition"
                        >
                          ✔ Aceitar
                        </button>
                        <button
                          onClick={() => handleAlterarStatusPedido(p.id, 'CANCELADO')}
                          className="flex-1 sm:flex-none px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-sm transition"
                        >
                          ✖ Recusar
                        </button>
                      </div>
                    )}

                    {p.status === 'EM_PREPARO_ENTREGA' && (
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-2 rounded-xl text-center">
                        ⏳ Preparando / Aguardando Entregador
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA DE CARDÁPIO */}
      {activeTab === 'cardapio' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Criar Categoria */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-1.5">
                <span>📁</span> Nova Categoria
              </h3>
              <form onSubmit={handleCriarCategoria} className="space-y-3">
                <input
                  type="text"
                  placeholder="Nome da categoria (ex: Bebidas)"
                  value={novaCategoriaNome}
                  onChange={e => setNovaCategoriaNome(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brandRed/20 focus:border-brandRed text-sm"
                  required
                />
                <button type="submit" className="w-full px-4 py-2 bg-brandRed text-white rounded-xl font-bold text-sm">
                  + Adicionar Categoria
                </button>
              </form>
            </div>

            {/* Criar Produto */}
            <div className="md:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-1.5">
                <span>🍕</span> Novo Produto
              </h3>
              <form onSubmit={handleCriarProduto} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Nome do produto"
                    value={novoProduto.nome}
                    onChange={e => setNovoProduto(prev => ({ ...prev, nome: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brandRed/20 text-sm"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Descrição curta"
                    value={novoProduto.descricao}
                    onChange={e => setNovoProduto(prev => ({ ...prev, descricao: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brandRed/20 text-sm"
                  />
                </div>
                <div className="space-y-3">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Preço (ex: 29.90)"
                    value={novoProduto.preco}
                    onChange={e => setNovoProduto(prev => ({ ...prev, preco: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brandRed/20 text-sm"
                    required
                  />
                  <select
                    value={novoProduto.categoriaId}
                    onChange={e => setNovoProduto(prev => ({ ...prev, categoriaId: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brandRed/20 text-sm"
                  >
                    <option value="">Sem categoria</option>
                    {menu?.categorias?.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nome}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="sm:col-span-2 px-4 py-2.5 bg-brandRed text-white rounded-xl font-bold text-sm mt-2">
                  + Adicionar Produto ao Menu
                </button>
              </form>
            </div>
          </div>

          {/* Lista do Cardápio */}
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Cardápio Atual</h3>
            {loadingMenu ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-brandRed border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : !menu?.categorias || menu.categorias.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <p className="text-gray-400">Cardápio vazio. Comece criando categorias e adicionando produtos!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {menu.categorias.map(cat => (
                  <div key={cat.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
                    <h4 className="font-extrabold text-gray-900 border-b pb-2 flex justify-between items-center">
                      <span>📁 {cat.nome}</span>
                      <span className="text-xs text-gray-400 font-medium">{cat.produtos?.length || 0} produtos</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {cat.produtos && cat.produtos.length > 0 ? (
                        cat.produtos.map(prod => (
                          <div key={prod.id} className="bg-gray-50 border border-gray-200/50 rounded-xl p-4 flex justify-between items-center gap-4">
                            <div>
                              <h5 className="font-bold text-gray-800">{prod.nome}</h5>
                              {prod.descricao && <p className="text-xs text-gray-400 mt-1">{prod.descricao}</p>}
                              <p className="text-sm font-extrabold text-slate-800 mt-2">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.preco)}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeletarProduto(prod.id)}
                              className="text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 p-2 rounded-xl transition"
                              title="Remover produto"
                            >
                              🗑️
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400 italic">Sem produtos nesta categoria.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA DE INSIGHTS B2B */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          {loadingInsights ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-12 h-12 border-4 border-brandRed border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-500 font-medium">Consultando gRPC recomendacao-py...</p>
            </div>
          ) : insights ? (
            <div>
              {/* Card de Informações da Assinatura / Plano */}
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-2xl">
                    {insights.plano === 'PREMIUM' ? '🌟' : '🛡️'}
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 font-medium">Plano Atual</p>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      Plano {insights.plano}
                      <span className={`px-2 py-0.5 text-[10px] rounded-full uppercase tracking-wider font-bold border ${
                        insights.plano === 'PREMIUM' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                      }`}>
                        {insights.plano}
                      </span>
                    </h3>
                  </div>
                </div>
                <div>
                  {insights.plano === 'GRATUITO' ? (
                    <button
                      disabled={updatingSubscription}
                      onClick={() => handleAtualizarAssinatura('PREMIUM')}
                      className="btn btn-primary px-6 py-3 font-bold shadow-lg shadow-red-500/20 active:scale-95"
                    >
                      {updatingSubscription ? 'Assinando...' : '🚀 Ativar Plano Premium (gRPC)'}
                    </button>
                  ) : (
                    <button
                      disabled={updatingSubscription}
                      onClick={() => handleAtualizarAssinatura('GRATUITO')}
                      className="btn btn-secondary px-4 py-2.5 text-xs text-gray-500"
                    >
                      {updatingSubscription ? 'Cancelando...' : 'Rebaixar para Plano Gratuito'}
                    </button>
                  )}
                </div>
              </div>

              {/* Renderização condicional dependendo do plano de insights */}
              {insights.plano === 'GRATUITO' ? (
                <div className="bg-gradient-to-br from-slate-950 to-slate-900 text-white rounded-3xl p-8 md:p-12 relative overflow-hidden border border-slate-800 shadow-xl shadow-slate-900/10">
                  <div className="absolute right-0 bottom-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl"></div>
                  <div className="absolute left-1/4 top-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>

                  <div className="max-w-2xl relative z-10">
                    <span className="text-xs font-bold text-brandRed uppercase tracking-widest bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                      Exclusivo Premium
                    </span>
                    <h2 className="text-3xl md:text-4xl font-extrabold mt-6 mb-4 tracking-tight leading-tight">
                      Previsão de Preços & Análise da Concorrência em Tempo Real
                    </h2>
                    <p className="text-slate-400 text-base md:text-lg mb-8 leading-relaxed">
                      Desbloqueie o acesso a algoritmos inteligentes de precificação dinâmica. O microsserviço analítico de Python escuta mudanças via CDC (Kafka) nas lojas parceiras, compara e sugere descontos baseados no horário de pico local e na distância geográfica.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                      {[
                        { title: 'Concorrência', desc: 'Distâncias geográficas via Haversine' },
                        { title: 'Dinâmica', desc: 'Preços baseados no pico do concorrente' },
                        { title: 'Recomendação', desc: 'Sincronização instantânea via CDC' }
                      ].map((feat, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                          <p className="font-bold text-white mb-1">{feat.title}</p>
                          <p className="text-xs text-slate-400">{feat.desc}</p>
                        </div>
                      ))}
                    </div>

                    <button
                      disabled={updatingSubscription}
                      onClick={() => handleAtualizarAssinatura('PREMIUM')}
                      className="btn btn-primary px-8 py-4 text-base font-bold shadow-xl shadow-red-500/25"
                    >
                      {updatingSubscription ? 'Processando...' : 'Liberar Painel de Inteligência Agora'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Área Geográfica Analisada</p>
                      <h4 className="text-3xl font-extrabold text-gray-800">Raio de 5.0 km</h4>
                      <p className="text-sm text-gray-500 mt-2">Buscando concorrência ativa nas coordenadas geográficas cadastradas.</p>
                    </div>
                    <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Competidores Próximos</p>
                      <h4 className="text-3xl font-extrabold text-blue-600">
                        {insights.concorrentesAnalisados}{' '}
                        <span className="text-sm text-gray-500 font-normal">
                          {insights.concorrentesAnalisados === 1 ? 'loja concorrente' : 'lojas concorrentes'}
                        </span>
                      </h4>
                      <p className="text-sm text-gray-500 mt-2">Número de marcas na mesma região identificadas no banco analítico de recomendações.</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Sugestões de Precificação Dinâmica</h3>
                    {insights.insights && insights.insights.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {insights.insights.map((insight, idx) => (
                          <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col justify-between border-l-4 border-l-brandRed shadow-sm">
                            <div>
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="font-bold text-gray-900 text-lg leading-tight">{insight.produtoNome}</h4>
                                  <p className="text-xs text-gray-400 mt-0.5">ID do Produto: #{insight.produtoId}</p>
                                </div>
                                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider border ${getSuggestionBadgeStyle(insight.tipoSugestao)}`}>
                                  {getSuggestionBadgeText(insight.tipoSugestao)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4 border border-gray-100 leading-relaxed">
                                {insight.sugestao}
                              </p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
                              <span className="text-gray-500 font-medium">Preço Base Atual:</span>
                              <span className="font-extrabold text-slate-800">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(insight.precoAtual)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center bg-gray-50 py-12 rounded-2xl border border-gray-100">
                        <p className="text-gray-400 font-medium">Nenhum insight disponível no momento.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Nenhum insight retornado. Certifique-se de que o restaurante possui produtos.
            </div>
          )}
        </div>
      )}

      {/* ABA DE CONFIGURAÇÕES */}
      {activeTab === 'config' && (
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm max-w-2xl">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-1.5">
            <span>⚙️</span> Detalhes do Restaurante
          </h3>
          <form onSubmit={handleSalvarConfig} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase tracking-wider">Nome do Restaurante</label>
              <input
                type="text"
                value={config.nome}
                onChange={e => setConfig(prev => ({ ...prev, nome: e.target.value }))}
                required
                className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brandRed/20 focus:border-brandRed transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase tracking-wider">Descrição</label>
              <textarea
                value={config.descricao}
                onChange={e => setConfig(prev => ({ ...prev, descricao: e.target.value }))}
                className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brandRed/20 focus:border-brandRed transition-all text-sm h-24"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase tracking-wider">Endereço Completo</label>
              <input
                type="text"
                value={config.endereco}
                onChange={e => setConfig(prev => ({ ...prev, endereco: e.target.value }))}
                className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brandRed/20 focus:border-brandRed transition-all text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase tracking-wider">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={config.latitude}
                  onChange={e => setConfig(prev => ({ ...prev, latitude: e.target.value }))}
                  placeholder="-22.90"
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brandRed/20 focus:border-brandRed transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase tracking-wider">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={config.longitude}
                  onChange={e => setConfig(prev => ({ ...prev, longitude: e.target.value }))}
                  placeholder="-43.20"
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brandRed/20 focus:border-brandRed transition-all text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingConfig}
              className="w-full px-5 py-4 bg-brandRed text-white rounded-2xl font-bold text-base shadow-lg shadow-red-500/20 transition-all mt-4"
            >
              {savingConfig ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
