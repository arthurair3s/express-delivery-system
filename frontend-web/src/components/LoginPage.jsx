import React, { useState } from 'react';
import { API_URL } from '../config';
import { LOGIN } from '../graphql/queries';

export default function LoginPage({ onLogin, onRegister }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: LOGIN,
          variables: { email, senha }
        })
      }).then(r => r.json());

      if (res.errors) {
        throw new Error(res.errors[0].message);
      }

      const { token, usuario } = res.data.login;
      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));
      onLogin(usuario);
    } catch (e) {
      setError(e.message || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Elementos decorativos de fundo */}
      <div className="absolute top-0 left-0 w-full h-1 bg-ifoodRed"></div>
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-red-500/5 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-red-500/5 rounded-full blur-3xl"></div>

      <div className="w-full max-w-[440px] relative z-10">
        {/* Cabeçalho / Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-4xl">🛵</span>
            <h1 className="text-3xl font-bold text-ifoodRed tracking-tight">
              Express Delivery
            </h1>
          </div>
          <p className="text-gray-500 font-medium">Faça login para começar a pedir</p>
        </div>

        {/* Card de Login */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 md:p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">E-mail</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="exemplo@email.com"
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ifoodRed/20 focus:border-ifoodRed transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Senha</label>
              <input
                id="login-senha"
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ifoodRed/20 focus:border-ifoodRed transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-ifoodRed text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <span>⚠️</span>
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary py-4 text-lg font-bold shadow-lg shadow-red-500/20 active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Entrando...
                </div>
              ) : 'Entrar'}
            </button>
          </form>

          {/* Divisor */}
          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-gray-400 font-bold tracking-widest">Acesso Rápido</span>
            </div>
          </div>

          {/* Contas de Teste */}
          <div className="space-y-3">
            {[
              { email: 'ana.lima@email.com', nome: 'Ana Lima', img: 'AL' },
              { email: 'carlos.mota@email.com', nome: 'Carlos Mota', img: 'CM' },
            ].map(u => (
              <button
                key={u.email}
                type="button"
                onClick={() => { setEmail(u.email); setSenha('senha123'); }}
                className="w-full flex items-center justify-between p-3 rounded-2xl border border-gray-100 hover:border-ifoodRed/30 hover:bg-red-50/30 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 group-hover:bg-ifoodRed group-hover:text-white transition-colors">
                    {u.img}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-700">{u.nome}</p>
                    <p className="text-[10px] text-gray-400">{u.email}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-300 group-hover:text-ifoodRed">→</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => onRegister()}
            className="w-full mt-6 text-sm font-bold text-gray-400 hover:text-ifoodRed transition-colors"
          >
            Não tem uma conta? <span className="text-ifoodRed underline">Cadastre-se aqui</span>
          </button>
        </div>

        {/* Footer */}
        <p className="text-center mt-8 text-gray-400 text-xs">
          Express Delivery &copy; 2026 - Arquitetura de Software
        </p>
      </div>
    </div>
  );
}
