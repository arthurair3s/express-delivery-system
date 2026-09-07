#!/usr/bin/env bash
# Roda as quatro suítes de teste do monorepo.
#
# Nenhuma delas precisa de Docker, banco ou broker: os testes exercitam domínio,
# casos de uso e adaptadores com dublês. É essa a diferença entre uma suíte que
# roda em segundos e uma que ninguém executa.
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
falhas=0

secao() { printf '\n\033[1m── %s\033[0m\n' "$1"; }
checar() { [ "$1" -eq 0 ] || { falhas=$((falhas + 1)); printf '\033[31m   falhou\033[0m\n'; }; }

secao "Backend Core (Vitest)"
(cd "$RAIZ/api-node" && npm test --silent); checar $?

secao "Microserviços .NET (xUnit)"
(cd "$RAIZ" && dotnet test ms-tests-cs/ms-tests-cs.csproj -v q --nologo 2>&1 | grep -vE 'warning MSB3277'); checar $?

secao "MS Recomendação (pytest)"
(cd "$RAIZ/ms-recomendacao-py" && .venv/bin/python -m pytest tests/ -q); checar $?

secao "MS Notificações (pytest)"
(cd "$RAIZ/ms-notificacoes-py" && .venv/bin/python -m pytest tests/ -q); checar $?

printf '\n'
if [ "$falhas" -eq 0 ]; then
  printf '\033[32mTodas as suítes passaram.\033[0m\n'
else
  printf '\033[31m%d suíte(s) falharam.\033[0m\n' "$falhas"
fi
exit "$falhas"
