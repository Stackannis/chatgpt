"""Rendu du Livret A, édition motion design (60 i/s).
   python rendu.py apercu [t1 t2 ...]  -> planche d'images fixes
   python rendu.py                     -> toutes les images (30 i/s, 4 pages en parallèle) + son + mp4
   python rendu.py depuis=240          -> ne recalcule que les images à partir de 240 s
"""
import asyncio, json, pathlib, shutil, subprocess, sys, time
from playwright.async_api import async_playwright

ICI = pathlib.Path(__file__).parent
OUT = ICI / "rendu"
FPS, OUVRIERS = 60, 4
JUSQUA = next((float(a.split("=")[1]) for a in sys.argv if a.startswith("jusqua=")), None)
DEPUIS = next((float(a.split("=")[1]) for a in sys.argv if a.startswith("depuis=")), None)

async def page_prete(b, erreurs):
    pg = await b.new_page(viewport={"width": 1920, "height": 1080})
    pg.on("pageerror", lambda e: erreurs.append(str(e)))
    pg.on("console", lambda m: m.type == "error" and erreurs.append(m.text))
    await pg.goto((ICI / "index.html").as_uri())
    await pg.wait_for_function("window.READY === true", timeout=30000)
    return pg

async def capturer(pg, images, dossier):
    for i, t in images:
        await pg.evaluate(f"render({t})")
        await pg.screenshot(path=str(dossier / f"f{i:05d}.jpg"), type="jpeg", quality=92)

async def main(apercu):
    OUT.mkdir(exist_ok=True)
    dossier = OUT / ("apercu" if apercu else "images")
    if DEPUIS is None or apercu:
        shutil.rmtree(dossier, ignore_errors=True); dossier.mkdir()
    erreurs, t0 = [], time.time()
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        pg = await page_prete(b, erreurs)
        dur, polices = await pg.evaluate("DUREE"), await pg.evaluate("POLICES")
        if apercu:
            ts = [float(x) for x in sys.argv[2:]] or [i * dur / 24 for i in range(24)]
            await capturer(pg, list(enumerate(ts)), dossier)
        else:
            images = [(i, i / FPS) for i in range(int(dur * FPS)) if (DEPUIS is None or i / FPS >= DEPUIS) and (JUSQUA is None or i / FPS <= JUSQUA)]
            pages = [pg] + [await page_prete(b, erreurs) for _ in range(OUVRIERS - 1)]
            await asyncio.gather(*[capturer(q, images[k::OUVRIERS], dossier) for k, q in enumerate(pages)])
        (OUT / "sons.json").write_text(json.dumps({"dur": dur, "sons": await pg.evaluate("SONS")}), encoding="utf-8")
        await b.close()
    n = len(list(dossier.glob("*.jpg")))
    print(f"durée {dur:.1f} s, {n} images en {time.time() - t0:.0f} s, polices {polices}, erreurs: {erreurs or 'aucune'}")
    if apercu:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "1", "-i", str(dossier / "f%05d.jpg"),
                        "-vf", f"scale=480:270,tile=4x{(n + 3) // 4}", "-frames:v", "1", str(OUT / "planche.png")], check=True)
        print("instants :", [round(t, 1) for t in ts])
    else:
        subprocess.run([sys.executable, str(ICI / "son.py")], check=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(dossier / "f%05d.jpg"),
                        "-i", str(OUT / "mix.wav"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium",
                        "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(OUT / "livret_a_motion.mp4")], check=True)
        print("vidéo :", OUT / "livret_a_motion.mp4", f"({time.time() - t0:.0f} s au total)")

asyncio.run(main(len(sys.argv) > 1 and sys.argv[1] == "apercu"))
