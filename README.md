# EmpireArchitect AI

AI Publishing Engine — generates content strategies, audience insights, and trend analysis powered by **Ollama Pro (minimax-m2.7)**.

## Features

- **Keyword Mode** — Enter any keyword and generate 12 high-value content ideas across 15+ content types
- **Audience Mode** — Analyze any audience segment to uncover pain points and high-intent keywords
- **Trend Mode** — Discover emerging market trends by location/industry

## Content Types

Online Course, Ezine/Newsletter, Blog Article, How-To Guide, Technical Tutorial, PDF E-Book, Podcast Series, Viral Listicle, Custom AI Agent, Agent Crew (CrewAI), Top Websites, SaaS/Web App, Mobile App, Ad Snippets

## Tech Stack

- React 19 + TypeScript
- Vite 6
- OpenAI SDK → Ollama Pro (minimax-m2.7)

## Setup

```bash
npm install
npm run dev
```

## Environment

```env
VITE_OLLAMA_BASE_URL=https://ollama.com/v1
VITE_OLLAMA_API_KEY=your_api_key
VITE_OLLAMA_MODEL=minimax-m2.7
```

## Build

```bash
npm run build
```
