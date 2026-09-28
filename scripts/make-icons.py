#!/usr/bin/env python3
"""Gera os quatro ícones do app a partir de `assets/icone-fonte.png`.

A arte de origem vem com cantos arredondados sobre fundo branco — é assim que
todo gerador de ícone entrega. Para o iOS isso não serve: ele aplica a máscara
de canto por cima, e o resultado seria um quadrado arredondado dentro de outro,
com triângulos brancos sobrando nas quinas.

Por isso o passo principal aqui é **preencher as quinas estendendo a arte**:
para cada linha, a cor da borda é replicada para fora. Como o fundo é um
gradiente horizontal suave, a emenda não aparece.

Rode com `python3 scripts/make-icons.py`. Precisa de Pillow.
"""

from __future__ import annotations

import os
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
ASSETS = os.path.join(ROOT, "assets")
FONTE = os.path.join(ASSETS, "icone-fonte.png")

TAMANHO = 1024
LIMIAR_BRANCO = 250          # acima disso é a margem branca, não a arte
RAIO_CANTO = 0.225           # proporção que o iOS usa, para os usos com canto
FOLGA_ANDROID = 0.72         # a máscara circular do Android corta as quinas


def _span_por_linha(im: Image.Image) -> list[tuple[int, int] | None]:
    """Primeiro e último pixel de arte em cada linha.

    Olha só as pontas: a forma é convexa, então tudo entre elas é arte — mesmo
    os tons quase brancos das pessoinhas, que um teste pixel a pixel
    confundiria com a margem.
    """
    larg, alt = im.size
    px = im.load()
    spans: list[tuple[int, int] | None] = []
    for y in range(alt):
        esq = dir_ = None
        for x in range(larg):
            r, g, b = px[x, y]
            if min(r, g, b) < LIMIAR_BRANCO:
                esq = x
                break
        if esq is not None:
            for x in range(larg - 1, -1, -1):
                r, g, b = px[x, y]
                if min(r, g, b) < LIMIAR_BRANCO:
                    dir_ = x
                    break
        spans.append((esq, dir_) if esq is not None and dir_ is not None else None)
    return spans


def preencher_quinas(im: Image.Image) -> Image.Image:
    """Estende a arte até as bordas, eliminando a margem branca e as quinas."""
    im = im.convert("RGB")
    larg, alt = im.size
    spans = _span_por_linha(im)
    out = im.copy()
    px = out.load()

    for y, span in enumerate(spans):
        if span is None:
            continue
        esq, dir_ = span
        cor_e, cor_d = px[esq, y], px[dir_, y]
        for x in range(esq):
            px[x, y] = cor_e
        for x in range(dir_ + 1, larg):
            px[x, y] = cor_d

    # Linhas inteiramente vazias (acima e abaixo da arte) copiam a vizinha útil.
    cheias = [y for y, s in enumerate(spans) if s is not None]
    if cheias:
        primeira, ultima = cheias[0], cheias[-1]
        for y in range(primeira):
            for x in range(larg):
                px[x, y] = px[x, primeira]
        for y in range(ultima + 1, alt):
            for x in range(larg):
                px[x, y] = px[x, ultima]
    return out


def com_cantos(im: Image.Image, raio=RAIO_CANTO) -> Image.Image:
    """Versão com canto arredondado e fundo transparente (splash, favicon)."""
    mascara = Image.new("L", im.size, 0)
    ImageDraw.Draw(mascara).rounded_rectangle(
        [0, 0, im.size[0] - 1, im.size[1] - 1], radius=int(im.size[0] * raio), fill=255)
    saida = Image.new("RGBA", im.size, (0, 0, 0, 0))
    saida.paste(im, (0, 0), mascara)
    return saida


def main() -> None:
    fonte = Image.open(FONTE).convert("RGB")
    if fonte.size != (TAMANHO, TAMANHO):
        fonte = fonte.resize((TAMANHO, TAMANHO), Image.LANCZOS)

    cheio = preencher_quinas(fonte)

    # iOS: quadrado inteiro, sem transparência nenhuma — a Apple recusa alpha.
    cheio.save(os.path.join(ASSETS, "icon.png"))

    # Android: a máscara é circular e corta as quinas, então a arte encolhe e
    # o resto fica com a cor de fundo declarada no app.json.
    lado = int(TAMANHO * FOLGA_ANDROID)
    adaptativo = Image.new("RGBA", (TAMANHO, TAMANHO), (0, 0, 0, 0))
    adaptativo.paste(com_cantos(cheio.resize((lado, lado), Image.LANCZOS), 0.5),
                     ((TAMANHO - lado) // 2, (TAMANHO - lado) // 2))
    adaptativo.save(os.path.join(ASSETS, "adaptive-icon.png"))

    # Splash e favicon vivem sobre fundo claro: canto arredondado, senão o
    # quadrado duro briga com o resto da tela.
    com_cantos(cheio).resize((512, 512), Image.LANCZOS).save(os.path.join(ASSETS, "splash-icon.png"))
    com_cantos(cheio).resize((64, 64), Image.LANCZOS).save(os.path.join(ASSETS, "favicon.png"))

    # A cor de fundo do adaptativo sai da própria arte, não de um palpite.
    r, g, b = cheio.resize((1, 1), Image.LANCZOS).getpixel((0, 0))
    print(f"  icon.png, adaptive-icon.png, splash-icon.png, favicon.png")
    print(f"  cor média da arte: #{r:02X}{g:02X}{b:02X}  (use no adaptiveIcon.backgroundColor)")


if __name__ == "__main__":
    main()
