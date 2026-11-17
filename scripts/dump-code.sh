#!/bin/sh
# Gera UM arquivo único com todo o código-fonte do projeto Passo a Passo.
# Descoberta automática de arquivos (sem lista fixa), com sumário no topo.
set -eu
cd /workspace
OUT="codigo-completo-app.txt"
LIST=".dump-filelist.tmp"

# ---------------------------------------------------------------- descoberta
# Diretórios varridos (find por diretório: evita travar na raiz do sandbox).
DIRS="artifacts/passo-a-passo artifacts/api-server artifacts/mockup-sandbox lib scripts"
ROOTFILES="package.json tsconfig.json tsconfig.base.json pnpm-workspace.yaml start-app.sh replit.md passo-a-passo.html"

: > "$LIST"

for f in $ROOTFILES; do
  [ -f "$f" ] && echo "$f" >> "$LIST"
done

for d in $DIRS; do
  [ -d "$d" ] || continue
  timeout 30 find "$d" -type f \
    -not -path "*/node_modules/*" \
    -not -path "*/dist/*" \
    -not -path "*/build/*" \
    -not -name "*.tsbuildinfo" \
    -not -name "*.log" \
    2>/dev/null >> "$LIST" || true
done

# entrega: só os HTML (o bundle minificado não entra)
[ -d entrega ] && timeout 20 find entrega -type f -name "*.html*" 2>/dev/null >> "$LIST" || true

# ------------------------------------------------------- filtros de conteúdo
# Só texto: descarta binários e artefatos pesados/gerados.
filtered() {
  while IFS= read -r f; do
    case "$f" in
      *.png|*.jpg|*.jpeg|*.gif|*.ico|*.webp|*.woff|*.woff2|*.ttf|*.eot|*.zip|*.gz|*.tgz|*.pdf|*.mp4|*.mp3) continue ;;
      pnpm-lock.yaml|*/pnpm-lock.yaml) continue ;;
      entrega/app-pronto/assets/*) continue ;;
    esac
    [ -f "$f" ] || continue
    # heurística de binário: NUL byte nos primeiros 2KB
    if head -c 2000 "$f" | od -An -tx1 2>/dev/null | grep -q " 00 "; then continue; fi
    echo "$f"
  done
}

filtered < "$LIST" | sort -u > "$LIST.clean"

# Ordem de leitura: app primeiro, depois domínio, servidor, libs, resto.
order() {
  # 1) entrada e núcleo do app
  for p in \
    artifacts/passo-a-passo/index.html \
    artifacts/passo-a-passo/package.json \
    artifacts/passo-a-passo/vite.config.ts \
    artifacts/passo-a-passo/components.json \
    artifacts/passo-a-passo/src/main.tsx \
    artifacts/passo-a-passo/src/App.tsx \
    artifacts/passo-a-passo/src/index.css ; do
    grep -Fx "$p" "$LIST.clean" 2>/dev/null || true
  done
  # 2) resto do app em ordem alfabética (app/, domain/, persistence/, pages/, components/, hooks/, lib/)
  grep -E "^artifacts/passo-a-passo/(src|public)/" "$LIST.clean" 2>/dev/null | sort || true
  # 3) servidor, sandbox, libs, scripts, raiz e entrega
  grep -vE "^artifacts/passo-a-passo/" "$LIST.clean" 2>/dev/null | sort || true
}

order | awk '!seen[$0]++' > "$LIST.final"

# ------------------------------------------------------------------ cabeçalho
COUNT=$(wc -l < "$LIST.final")
TOTAL=$(wc -l < "$LIST.final" >/dev/null && cat $(cat "$LIST.final") 2>/dev/null | wc -l)

{
  echo "################################################################"
  echo "#  PASSO A PASSO — CÓDIGO-FONTE COMPLETO (ARQUIVO ÚNICO)"
  echo "#  Gerado em: $(date '+%d/%m/%Y %H:%M')"
  echo "#  Arquivos: $COUNT  |  Linhas de código: $TOTAL"
  echo "################################################################"
  echo ""
  echo "SUMÁRIO"
  echo "----------------------------------------------------------------"
  i=0
  while IFS= read -r f; do
    i=$((i + 1))
    printf "%3d. %-70s %5s linhas\n" "$i" "$f" "$(wc -l < "$f" 2>/dev/null || echo 0)"
  done < "$LIST.final"
  echo ""
  echo ""
} > "$OUT"

# -------------------------------------------------------------------- corpo
i=0
while IFS= read -r f; do
  i=$((i + 1))
  {
    echo "================================================================"
    echo "ARQUIVO $i/$COUNT: $f"
    echo "================================================================"
    cat "$f"
    echo ""
    echo ""
  } >> "$OUT"
done < "$LIST.final"

rm -f "$LIST" "$LIST.clean" "$LIST.final"

echo "OK: $OUT gerado — $COUNT arquivos, $(wc -l < "$OUT") linhas totais."
