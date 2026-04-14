import React, { useState, useEffect } from 'react';
import { GET_RESTAURANTES } from '../graphql/queries';
import { API_URL } from '../config';

const getLogomarca = (nome = '') => {
  if (nome.toLowerCase().includes('pizza')) return '🍕';
  if (nome.toLowerCase().includes('sushi')) return '🍣';
  if (nome.toLowerCase().includes('burguer')) return '🥓';
  return '🍔';
};

export default function RestaurantList({ onSelectRestaurant }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: GET_RESTAURANTES })
    })
    .then(r => r.json())
    .then(res => {
      if (res.errors) throw new Error(res.errors[0].message);
      setData(res.data);
      setLoading(false);
    })
    .catch(e => {
      setError(e);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="w-12 h-12 border-4 border-ifoodRed border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 font-medium">Buscando restaurantes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-xl border border-red-100 text-center mx-auto max-w-lg mt-12">
        <span className="text-3xl block mb-2">🔌</span>
        <h3 className="text-red-700 font-bold mb-1">Huston, temos um problema</h3>
        <p className="text-red-600 text-sm">Falha ao conectar com o Backend: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Famosos no iFood</h1>
        <p className="text-gray-500">Escolha o seu restaurante favorito para fazer o pedido.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.restaurantes?.map(r => (
          <div 
            key={r.id} 
            onClick={() => onSelectRestaurant(r)}
            className="group glass-card cursor-pointer flex flex-col p-6 hover:border-ifoodRed/30"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
              {getLogomarca(r.nome)}
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-1">{r.nome}</h3>
            <div className="flex items-center text-sm text-gray-500 gap-1 mt-auto">
              <span>📍</span>
              <span className="truncate">{r.endereco || 'Endereço não informado'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
