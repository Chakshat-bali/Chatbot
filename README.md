
# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1cf0b42b-d8d1-412e-8c1d-3c3cef551791

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


How It Does It (Implementation Mechanisms)
The workspace implements these capabilities through high-precision API wrappers, client state hooks, and custom rendering:

- Intelligent Query Classification: When a query is entered, the client optionally sends a rapid background request to a categorization route. Behind the scenes, the model reads the user's focus and suggests the designated persona (assistant, creative, developer, socratic).
- Dynamic Prompt Customization: Depending on the active agent, the request injected on the server appends dedicated systemInstruction parameters to shape the tone and output constraint of the model.
- File Vectorization & Base64 Forwarding: Attached documents and images are read via the browser's FileReader API as a data stream, packaged into structured inline parts 
inside the server-side API request payload, and parsed directly by the Gemini model.
- Robust JSON Handling & Failure Isolation: The communication layer validates response headers to ensure correct application/json payload structures. If a network fallback occurs, the client captures the status code, extracts potential plain text warnings, and presents a graceful error interface with actionable remedies rather than failing silently.





+-------------------------------------------------------------+
       |                        CLIENT-SIDE                          |
       |                        (Vite/React)                         |
       |                                                             |
       |  +--------------------+             +--------------------+  |
       |  |  Interactive UI    |             |  Thread State      |  |
       |  |  (Tailwind, SVG)   |             |  (localStorage)    |  |
       |  +---------+----------+             +---------+----------+  |
       +------------|----------------------------------^-------------+
                    |                                  |
                    | (POST JSON Payload)              | (JSON Response)
                    v                                  |
       +------------|----------------------------------|-------------+
       |            |           SERVER-SIDE            |             |
       |            |         (Express/Node)           |             |
       |            v                                  |             |
       |  +---------+----------+             +---------+----------+  |
       |  |  /api/classify     |             |  /api/chat         |  |
       |  +---------+----------+             +---------+----------+  |
       |            |                                  |             |
       |            +-----------------+----------------+             |
       |                              |                              |
       |                              v                              |
       |          [ GROQ_API_KEY (Primary) / GEMINI_API_KEY (Fallback) ]
       |                              |                              |
       |                              v                              |
       |                Groq API / Google Gen AI SDK                 |
       +------------------------------|------------------------------+
                                      v
                             [ Llama 3 / Gemini ]









   [ User Input ] 
      │
      ▼
1. CLASSIFY ───► Grow/Gemini analyzes keyword pattern & complexity
      │
      ├─► Developer Persona (Code generation / debugging)
      ├─► Creative Persona  (Brainstorming / copywriting)
      ├─► Socratic Persona  (Conceptual learning / philosophy)
      └─► Assistant Persona (General organization)
      │
      ▼
2. ORCHESTRATE ──► Pairs the input with specialized System Instructions & Chat History
      │
      ▼
3. RESPOND ──────► Streams/Returns response tailored from that expert's point-of-view 