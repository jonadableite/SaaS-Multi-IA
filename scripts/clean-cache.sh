#!/bin/bash
# Script para limpar cache do Next.js e Turbopack

echo "🧹 Limpando cache do Next.js e Turbopack..."

# Limpar pasta .next
if [ -d ".next" ]; then
  echo "Removendo pasta .next..."
  rm -rf .next
fi

# Limpar cache do node_modules
if [ -d "node_modules/.cache" ]; then
  echo "Removendo cache do node_modules..."
  rm -rf node_modules/.cache
fi

# Limpar cache do Turbo
if [ -d ".turbo" ]; then
  echo "Removendo cache do Turbo..."
  rm -rf .turbo
fi

# Limpar cache do Turbopack (Windows)
if [ -d "$LOCALAPPDATA/Temp/next-turbopack" ]; then
  echo "Removendo cache do Turbopack (Windows)..."
  rm -rf "$LOCALAPPDATA/Temp/next-turbopack"
fi

# Limpar cache do Turbopack (Linux/Mac)
if [ -d "$HOME/.cache/next-turbopack" ]; then
  echo "Removendo cache do Turbopack (Linux/Mac)..."
  rm -rf "$HOME/.cache/next-turbopack"
fi

echo "✅ Cache limpo com sucesso!"
echo ""
echo "Agora você pode reiniciar o servidor com: pnpm run dev"

