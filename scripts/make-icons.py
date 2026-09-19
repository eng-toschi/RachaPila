#!/usr/bin/env python3
"""Gera os ícones do app a partir de código, não de um PNG solto.

O desenho é um disco partido em dois, deslocado — o gesto que o app faz,
legível a 60px, que é o tamanho em que a pessoa realmente vê o ícone na tela
inicial. Sem texto: nome de app não se lê nesse tamanho.

Rode com `python3 scripts/make-icons.py` depois de mudar cor ou proporção.
Precisa de Pillow (`pip install pillow`).
"""

from __future__ import annotations

import os
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
ASSETS = os.path.join(ROOT, "assets")

ACCENT = (109, 74, 255)      # tokens.ts LIGHT.accent — #6D4AFF
ON_ACCENT = (255, 255, 255)

SIZE = 1024
SUPERSAMPLE = 4              # desenha grande e reduz: borda lisa sem antialias manual


# Três partes de tamanhos diferentes, começando às 12h: a conta quase nunca
# divide igual, e pedaços desiguais dizem "a parte de cada um" em vez de
# "gráfico genérico".
BOUNDARIES = (-90, 60, 180, 270)
GAP_DEGREES = 7


def draw_mark(canvas_px: int, disc_ratio: float, color: tuple[int, int, int]) -> Image.Image:
    """Rosca repartida em três partes desiguais."""
    big = canvas_px * SUPERSAMPLE
    disc = big * disc_ratio
    hole = disc * 0.38               # vazio no meio: vira rosca, não pizza
    center = big / 2

    layer = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    pen = ImageDraw.Draw(layer)

    for index in range(len(BOUNDARIES) - 1):
        pen.pieslice(
            [center - disc / 2, center - disc / 2, center + disc / 2, center + disc / 2],
            BOUNDARIES[index] + GAP_DEGREES / 2,
            BOUNDARIES[index + 1] - GAP_DEGREES / 2,
            fill=color + (255,),
        )

    # Um furo só, no fim e no centro exato. Furar fatia por fatia deixa a
    # borda interna irregular — some na miniatura, mas aparece no 1024.
    pen.ellipse(
        [center - hole / 2, center - hole / 2, center + hole / 2, center + hole / 2],
        fill=(0, 0, 0, 0),
    )

    return layer.resize((canvas_px, canvas_px), Image.LANCZOS)


def write(name: str, image: Image.Image) -> None:
    path = os.path.join(ASSETS, name)
    image.save(path, "PNG")
    print(f"{name}: {image.size[0]}x{image.size[1]}")


def main() -> None:
    os.makedirs(ASSETS, exist_ok=True)

    # iOS: quadrado cheio, sem transparência e sem cantos arredondados — quem
    # arredonda é o sistema, e um PNG já arredondado ganha borda dupla.
    ios = Image.new("RGB", (SIZE, SIZE), ACCENT)
    ios.paste(draw_mark(SIZE, 0.56, ON_ACCENT), (0, 0), draw_mark(SIZE, 0.56, ON_ACCENT))
    write("icon.png", ios)

    # Android adaptativo: só o primeiro plano, e a marca precisa caber no
    # círculo seguro (o sistema recorta as bordas em formatos variados).
    write("adaptive-icon.png", draw_mark(SIZE, 0.40, ON_ACCENT))

    # Splash: a mesma marca, que o Expo centraliza sobre a cor de fundo.
    write("splash-icon.png", draw_mark(SIZE, 0.46, ACCENT))

    # Web (usado pelo `expo start --web`; irrelevante nas lojas).
    write("favicon.png", ios.resize((48, 48), Image.LANCZOS))


if __name__ == "__main__":
    main()
