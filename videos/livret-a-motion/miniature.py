"""Rend les miniatures YouTube (1280×720) + une planche de contrôle à taille réelle de téléphone."""
import asyncio, pathlib, subprocess
from playwright.async_api import async_playwright
ICI = pathlib.Path(__file__).parent; OUT = ICI / "miniatures"; OUT.mkdir(exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 1920, "height": 1080}); err = []
        pg.on("pageerror", lambda e: err.append(str(e)))
        await pg.goto((ICI / "miniature.html").as_uri()); await pg.wait_for_function("window.READY === true")
        for v in ["fissure", "fond", "duel"]:
            await pg.evaluate(f"dessiner('{v}')"); await pg.screenshot(path=str(OUT / f"{v}_1080.png"))
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(OUT / f"{v}_1080.png"), "-vf", "scale=1280:720:flags=lanczos", str(OUT / f"miniature_{v}.png")], check=True)
        await b.close(); print("erreurs:", err or "aucune")
asyncio.run(main())
