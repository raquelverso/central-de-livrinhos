#!/bin/bash
cd "$(dirname "$0")" || exit 1

if [ -d "./Central de Livrinhos.app" ]; then
  open -a "$PWD/Central de Livrinhos.app"
  exit 0
fi

clear
echo ""
echo "🌱 Central de Livrinhos: Contador Automático (Mac)"
echo "---------------------------------------------------"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Ops! Não achei o 'Central de Livrinhos.app' nem o Python 3 neste Mac."
  echo "Deixe 'Central de Livrinhos.app' na mesma pasta ou em Aplicativos e abra com dois cliques."
  echo ""
  read -r -p "Pressione Enter para fechar..."
  exit 1
fi

if nc -z 127.0.0.1 8765 >/dev/null 2>&1; then
  echo "✅ O contador automático já está ligado por aqui!"
  echo "É só clicar no tomatinho na barra lá em cima (ou voltar pra página)."
  echo ""
  read -r -p "Pressione Enter para fechar esta janela..."
  exit 0
fi

python3 contador_automatico.py --abrir-seletor-inicial
echo ""
read -r -p "Contador encerrado. Pressione Enter para fechar..."
