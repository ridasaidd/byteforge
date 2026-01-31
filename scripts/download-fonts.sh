#!/bin/bash

# Phase 7.3: Download Variable Fonts
# Downloads woff2 variable fonts from Google Fonts

set -e

FONTS_DIR="/home/ridasaidd/www/byteforge/public/fonts"

# Google Fonts CDN base URL
GF_CDN="https://fonts.gstatic.com/s"

# Font mappings: [family-name:google-font-key]
declare -A FONTS=(
  # Sans fonts
  ["sans/Inter-Variable.woff2"]="inter/v13/UcC73VoevstareEudHxYZ1C3CpG-c1BWq3b7UNaWM.woff2"
  ["sans/Roboto-Variable.woff2"]="roboto/v32/KFOlCnqEu92Fr1MmEU9fBBc4AMP6lbBP.woff2"
  ["sans/OpenSans-Variable.woff2"]="opensans/v40/memtYaGs126MiZpBA-UFUIcVXFi-K_sJYOCWWEg.woff2"
  ["sans/Nunito-Variable.woff2"]="nunito/v26/XRXV3I6Li01BKofINeaBTWlsxC.woff2"
  ["sans/DMSans-Variable.woff2"]="dmsans/v13/rP2Hp2ywxg089UriI5-g4vlH9MZHS-NzK4w.woff2"

  # Serif fonts
  ["serif/PlayfairDisplay-Variable.woff2"]="playfairdisplay/v30/nuFnD-vYSZviVYUq_2wVV37TAfL-B_yJxuAOQ.woff2"
  ["serif/Merriweather-Variable.woff2"]="merriweather/v30/u-490izqplzOf_Z_CbWQhznjRVGK5PPts04.woff2"
  ["serif/CrimsonPro-Variable.woff2"]="crimsonpro/v14/wXK3E25jTg4V4p8lI_TqM9oZcYPF5DcZwQ.woff2"
  ["serif/Lora-Variable.woff2"]="lora/v32/0QI6MX1D_JOuMw_BLaWJr_-W9MHLV-zkkzuH.woff2"

  # Mono fonts
  ["mono/JetBrainsMono-Variable.woff2"]="jetbrainsmono/v18/BBaaL_WNMnkymLEuliXAUXhgyU3rKjZsPuAe.woff2"
  ["mono/FiraCode-Variable.woff2"]="firacode/v22/uU9MCBsR6Z2vfE9aBYiM.woff2"
  ["mono/SourceCodePro-Variable.woff2"]="sourcecodepro/v22/HI_QiYsKILxRpg3hQBFVDt1d-cYjD_zckfY61CU.woff2"
)

echo "Downloading variable fonts from Google Fonts..."

for local_path in "${!FONTS[@]}"; do
  font_url="${GF_CDN}/${FONTS[$local_path]}"
  full_path="${FONTS_DIR}/${local_path}"
  dir=$(dirname "$full_path")

  # Create directory if needed
  mkdir -p "$dir"

  echo "Downloading $(basename $local_path)..."
  curl -s -L "$font_url" -o "$full_path" || echo "Warning: Failed to download $local_path"
done

echo ""
echo "Font download complete!"
echo ""
echo "Downloaded files:"
find "$FONTS_DIR" -name "*.woff2" -exec ls -lh {} \; | awk '{print $9, "(" $5 ")"}'

echo ""
echo "Total: $(find "$FONTS_DIR" -name "*.woff2" | wc -l) fonts"
