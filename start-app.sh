#!/usr/bin/env bash
# Script para rodar o Passo a Passo em desenvolvimento
# Pré-requisitos: pnpm instalado

cd /workspace/artifacts/passo-a-passo

# Rodar em desenvolvimento (hot-reload)
echo "🚀 Iniciando Passo a Passo em http://localhost:5173"
pnpm run dev

# Alternativamente, para visualizar o build de produção:
# npx serve dist/public
