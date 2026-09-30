# Masood Mobile AI — Local Knowledge Base

**Purpose:** Reference file for starting a new ChatGPT conversation about the Masood Mobile AI project. This file contains stable project information, current architecture, tested behavior, and working procedures. It does **not** contain API keys, passwords, or other secrets.

**Last updated:** 30 September 2026

---

## 1. Project identity

- Project name: **Masood Mobile AI**
- Windows project folder:
  `C:\Users\Micro\Downloads\masood-mobile-ai`
- GitHub repository:
  `masoodqadir14-alt/masood-mobile-ai`
- GitHub Pages:
  `https://masoodqadir14-alt.github.io/masood-mobile-ai/`
- Frontend direct URL:
  `https://masoodqadir14-alt.github.io/masood-mobile-ai/public/`
- Vercel backend:
  `https://masood-mobile-ai.vercel.app`

### Main architecture

Phone/browser → GitHub Pages frontend → Vercel backend/API → Gemini AI + Supabase memory

API keys are kept on the backend and should never be placed in the public frontend.

---

## 2. Current backend

### Status endpoint

`https://masood-mobile-ai.vercel.app/api/status`

Latest verified response:

```json
{"online":true,"model":"gemini-3.1-flash-lite"}
```

### Memory endpoint

`https://masood-mobile-ai.vercel.app/api/memory`

This returns permanent and daily memory records.

### Chat endpoint

`https://masood-mobile-ai.vercel.app/api/chat`

The frontend sends the user message and recent browser conversation history to this endpoint.

---

## 3. Important project files

### `server.js`
Main backend file. It:
- runs the Express server;
- connects to Supabase;
- connects to Gemini;
- reads personal and academic knowledge files;
- reads and saves permanent/daily memory;
- handles memory deletion;
- provides `/api/status`, `/api/memory`, and `/api/chat`.

### `public/index.html`
Main frontend HTML.

### `public/app.js`
Frontend chat logic. It:
- sends messages to the Vercel backend;
- displays user/assistant bubbles;
- stores browser conversation history in localStorage;
- checks backend status.

Local browser history key:
`masood_ai_history`

### `public/style.css`
Frontend styling.

### `personal_info.txt`
Personal/daily information available to the AI.

### `academic_info.txt`
Academic, curriculum, course-code, and related information available to the AI.

### `knowledge_base.md`
This file. It is intended as a reusable project reference for future ChatGPT chats.

---

## 4. Memory system

Permanent memory is stored in Supabase in the `memories` table.

Memory types currently supported:
- `permanent`
- `daily`

### Explicit saving
The assistant treats these as memory-save requests when appropriate:
- “Remember that ...”
- “Remember ...”
- “Save this ...”
- “Store this ...”
- “Note that ...”
- “Note ...”

The current implementation uses prefix-based detection rather than simply checking whether the word `remember` appears anywhere. This prevents ordinary questions from accidentally being saved.

### Normal statements
A normal statement such as:

> My favorite color is blue.

must **not** be saved to permanent memory.

The assistant should explain that it understands the information but it has not been saved unless the user explicitly requested saving.

### Verified normal-statement behavior
Tested successfully:

> My favorite color is blue.

Response:

> I understand that your favorite color is blue, but please note that this information has not been saved to my permanent memory.

The `/api/memory` endpoint confirmed that the normal statement was not stored.

### Verified explicit-save behavior
Tested successfully:

> Remember that my favorite color is blue.

Response:

> I have saved that your favorite color is blue to your permanent memory.

The `/api/memory` endpoint confirmed that the record was saved.

### Forget/delete behavior
The backend supports requests beginning with:
- `forget`
- `remove`
- `delete`

Forget handling occurs before the Gemini request, so a delete request does not depend on Gemini being available.

The current deletion function uses substring matching against saved memory content.

### Important distinction
Browser conversation history is **not** the same as permanent saved memory.

- Browser history: localStorage, temporary/conversation context.
- Permanent memory: Supabase `memories` table.

---

## 5. Current verified permanent memory

As of the latest check, the permanent memory contains exactly:

1. `Remember that my favorite crop for research is sorghum.`
2. `Remember that my favorite color is blue.`

Daily memory:

- Empty.

The previous duplicate mango memories were intentionally deleted. The earlier favorite-animal/cat memory was also successfully deleted.

---

## 6. Current AI instructions / behavior

The assistant is instructed to:

1. Act as Dr. Masood Qadir's personal AI assistant.
2. Use stored personal, academic, and saved-memory information when relevant.
3. Prefer the latest saved memory when information conflicts.
4. Never invent personal, academic, or administrative facts.
5. Be natural, friendly, accurate, and concise.
6. Not claim to be Dr. Masood.
7. If asked who it is, say it is Dr. Masood's AI assistant.
8. Reply in English when the user writes in English.
9. Use Urdu/Roman Urdu when appropriate.
10. Use academic information for academic/curriculum questions.
11. Give exact stored course codes when asked.
12. Never invent, modify, or guess course codes.
13. Avoid unnecessarily mentioning Dr. Masood in routine academic answers.
14. Clearly say when information is unavailable.
15. Not make official or important decisions on Dr. Masood's behalf.
16. Treat explicit remember/save/store/note wording as memory-save requests.
17. Handle forget/remove/delete requests as memory-deletion requests.
18. Use saved memory when asked what is remembered.
19. Distinguish temporary conversation history from permanent saved memory.
20. Rely on stored information instead of guessing for important personal or academic information.
21. Never claim information was saved, stored, recorded, or added to memory unless the user explicitly requested saving and the application actually performed the save.

---

## 7. Current Git state

Latest verified commit:

`4a97e71` — Improve memory saving response

Latest successful push:

`main → 4a97e71`

Recent relevant commits:

- `8633683` — Fix memory rule syntax
- `5412c16` — Improve memory response rules
- `4d12cb8` — Move forget handling before Gemini
- `8666a87` — Fix forget matching
- `a61c22b` — Fix Gemini chat history validation
- `41989e8` — Add forget command logic
- `3105482` — Fix memory save detection
- `1f26e8d` — Add Gemini retry logic
- `0c11286` — Fix CORS

---

## 8. Safe development workflow

The user prefers **one step at a time**. Do not give many unrelated commands at once.

For a backend code change:

1. Make one small change.
2. Check syntax:

```powershell
node --check server.js
```

3. Stage:

```powershell
git add server.js
```

4. Commit:

```powershell
git commit -m "Short description"
```

5. Push:

```powershell
git push origin main
```

6. Wait for Vercel to deploy.
7. Verify:

`https://masood-mobile-ai.vercel.app/api/status`

8. Test the chatbot.
9. Check `/api/memory` when database verification is needed.

Do not make several unrelated changes in one step.

---

## 9. Known issue not yet fixed

The frontend currently registers the service worker using:

```javascript
navigator.serviceWorker.register('/sw.js')
```

The service worker path currently produces a 404 because the GitHub Pages project is hosted under `/masood-mobile-ai/`.

This does **not** prevent normal chatbot operation. It should be fixed later if PWA/offline functionality is required.

---

## 10. Previous local WhatsApp AI project

This is a separate earlier project and should not be confused with Masood Mobile AI.

Earlier Windows project:
`C:\Users\Micro\Desktop\masood-whatsapp-ai`

Earlier technologies included:
- Node.js v24.21.0
- Ollama `llama3.2`
- `ollama@0.6.3`
- `whatsapp-web.js@1.34.7`
- `qrcode-terminal@0.12.0`

Do not modify that project when working on Masood Mobile AI unless explicitly requested.

---

## 11. How to use this file in a new ChatGPT chat

When starting a new ChatGPT conversation about Masood Mobile AI:

1. Upload `knowledge_base.md`.
2. Say that it is the current project knowledge base.
3. Ask the assistant to read it before suggesting changes.
4. Mention that you prefer one step at a time.
5. Do not share API keys or passwords in the file or chat.

Example opening message:

> This is the current knowledge base for my Masood Mobile AI project. Please read it carefully before helping me. Keep the existing working features intact and guide me one step at a time.

---

## 12. Security reminder

Never put any of the following in this knowledge-base file:
- Gemini API key
- Supabase service-role key
- passwords
- private tokens
- authentication secrets

The knowledge base is intended to be safe to upload to a new ChatGPT conversation.
