.PHONY: run check

run:
	python3 -m http.server 8000

check:
	node --check src/game.js
