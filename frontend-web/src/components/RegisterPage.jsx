import React, { useState } from 'react';
import { API_URL } from '../config';
import { REGISTRO } from '../graphql/queries';

export default function RegisterPage({ onBackToLogin, onRegisterSuccess }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: REGISTRO,
          variables: { nome, email, senha, telefone }
        })
      }).then(r => r.json());

      if (res.errors) {
        throw new Error(res.errors[0].message);
      }

      setSuccess(true);
      setTimeout(() => {
        onRegisterSuccess(email); // Redireciona para login preenchendo o email
      }, 2000);
    } catch (e) {
      setError(e.message || 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-xl p-10 space-y-4">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 scale-in-center">
            ✔
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Conta criada!</h2>
          <p className="text-gray-500">Quase lá! Redirecionando você para o login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-ifoodRed"></div>

      <div className="w-full max-w-[440px] relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="text-3xl font-bold text-ifoodRed tracking-tight">Crie sua conta</h1>
          </div>
          <p className="text-gray-500 font-medium">Junte-se à nossa comunidade de entrega</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase tracking-wider">Nome Completo</label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                required
                placeholder="Como quer ser chamado?"
                className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ifoodRed/20 focus:border-ifoodRed transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase tracking-wider">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="Seu melhor e-mail"
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ifoodRed/20 focus:border-ifoodRed transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase tracking-wider">Telefone</label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={e => setTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ifoodRed/20 focus:border-ifoodRed transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase tracking-wider">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
                placeholder="Mínimo 6 caracteres"
                className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ifoodRed/20 focus:border-ifoodRed transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-ifoodRed text-xs p-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary py-4 text-lg font-bold shadow-lg shadow-red-500/20 mt-2"
            >
              {loading ? 'Criando...' : 'Cadastrar agora'}
            </button>
          </form>

          <button
            onClick={onBackToLogin}
            className="w-full mt-6 text-sm font-bold text-gray-400 hover:text-ifoodRed transition-colors"
          >
            Já tem uma conta? <span className="text-ifoodRed underline">Faça login</span>
          </button>
        </div>
      </div>
    </div>
  );
}
