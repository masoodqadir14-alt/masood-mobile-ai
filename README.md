# Masood Mobile AI

A mobile-friendly, installable chatbot that does not use Ollama. It uses a server-side OpenAI API connection, so the phone does not need your laptop to be running.

## Files
- server.js: secure backend; keeps API key off the phone
- public/: mobile chatbot interface / PWA
- data/personal_info.txt: personal knowledge
- data/academic_info.txt: academic knowledge
- data/memory.json: persistent memory
- .env.example: configuration template

## Run
1. Install Node.js on the server/hosting machine.
2. Copy `.env.example` to `.env`.
3. Put your API key in `.env`.
4. Run `npm install`.
5. Run `npm start`.
6. Open the server URL on Android Chrome and use Add to Home Screen.

For 24/7 use while the laptop is off, deploy this project to an always-on cloud host. Do not put the API key in public/index.html or app.js.
