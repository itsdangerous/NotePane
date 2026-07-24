.PHONY: help install build verify run app dev-web dev-app

help:
	@echo "NotePane commands"
	@echo ""
	@echo "  make install  Install npm dependencies"
	@echo "  make build    Build the Vite renderer"
	@echo "  make verify   Build and run unit/static/E2E smoke checks"
	@echo "  make run      Build and run the NotePane desktop app"
	@echo "  make app      Build a macOS zip app package"
	@echo ""
	@echo "Development:"
	@echo "  make dev-web  Start Vite dev server"
	@echo "  make dev-app  Start Electron against http://127.0.0.1:5173"

install:
	npm install
	npm run install:browsers

build:
	npm run build

verify:
	npm run verify

run:
	npm start

app:
	npm run app

dev-web:
	npm run dev:web

dev-app:
	npm run dev:app
