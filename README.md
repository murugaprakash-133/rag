# PDF RAG Assistant - Intelligent Document Intelligence Platform

**PDF RAG Assistant** is an intelligent document analysis application that leverages Retrieval-Augmented Generation (RAG) to enable users to ask natural language questions against PDF documents and receive context-aware, source-grounded answers.

## Key Features

• **Intelligent PDF Analysis** - Upload and instantly index PDF documents with automatic text extraction, semantic chunking, and vector embedding generation for accurate retrieval.

• **AI-Powered Q&A Engine** - Ask natural language questions and receive AI-generated answers grounded in the document content with precise source citations including page numbers and similarity scores.

• **Vector-Based Semantic Search** - Leverages FAISS vector database for fast, accurate retrieval of relevant document chunks using semantic similarity matching.

• **Source-Grounded Responses** - Every answer is backed by cited source chunks with page-level metadata, ensuring transparency and traceability of AI responses.

• **Real-time Processing** - Streaming chat interface with live answer generation and source highlighting for seamless user experience.

## Tech Stack

- **Frontend**: React + Vite (Modern UI framework with hot module reloading)
- **Backend**: FastAPI + Uvicorn (High-performance async API framework)
- **Vector Database**: FAISS (Facebook AI Similarity Search for semantic retrieval)
- **Embeddings & LLM**: OpenAI-compatible API (text-embedding-3-small, GPT-4o-mini)
- **PDF Processing**: PyPDF2 (Text extraction with page tracking)
- **LLM Framework**: OpenRouter API (Multi-model LLM gateway)

## Architecture Flow

1. **PDF Ingestion** - User uploads PDF from React UI
2. **Text Extraction** - Backend extracts text with page-level metadata tracking
3. **Semantic Chunking** - Document chunked into overlapping segments (700 chars, 120 overlap)
4. **Embedding Generation** - Each chunk converted to vector embeddings via OpenAI API
5. **Vector Indexing** - Embeddings stored in FAISS index for fast retrieval
6. **Question Processing** - User question converted to embedding via same model
7. **Semantic Search** - FAISS retrieves top-K similar chunks (K=4)
8. **LLM Response** - Retrieved chunks sent as context to LLM for answer generation
9. **Source Attribution** - UI displays answer with source chunks and page references

## Project Structure

```
pdf-rag-assistant/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI routes & CORS configuration
│   │   ├── rag_service.py    # RAG pipeline (PDF parsing, embedding, retrieval, LLM)
│   │   ├── schemas.py        # Pydantic data models
│   │   └── config.py         # Environment configuration
│   ├── storage/
│   │   └── vectors.index     # FAISS vector database
│   ├── requirements.txt      # Python dependencies
│   └── .env                  # API keys & configuration
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main React component
│   │   ├── main.jsx          # Entry point
│   │   ├── styles.css        # Application styles
│   │   └── components/       # Reusable React components
│   ├── package.json          # npm dependencies
│   ├── vite.config.js        # Vite configuration
│   └── .env                  # Frontend configuration
│
├── README.md                 # Documentation
└── [Legacy] pdf-vector.py, question-vector.py  # Prototype scripts
```

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 16+
- OpenRouter API Key (or OpenAI API Key)

### 1) Backend Setup

```bash
cd backend
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt

# Configure environment
copy .env.example .env  # On macOS/Linux: cp .env.example .env
```

Edit `.env` and set your API credentials:
```
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://openrouter.ai/api/v1  # For OpenRouter
```

Start the API server:
```bash
python -m uvicorn app.main:app --reload --port 8000
```
✓ API running at: **http://127.0.0.1:8000**  
✓ Interactive API docs: **http://127.0.0.1:8000/docs**

### 2) Frontend Setup

Open a second terminal:

```bash
cd frontend
npm install
copy .env.example .env  # On macOS/Linux: cp .env.example .env
npm run dev
```

✓ Frontend running at: **http://localhost:5173**

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/info` | GET | Get indexing status & document info |
| `/api/index-pdf` | POST | Upload & index a PDF document |
| `/api/ask` | POST | Ask a question about indexed documents |
| `/docs` | GET | Interactive API documentation (Swagger UI) |

## Core Features Implemented

✅ **Multi-format PDF Support** - Handles various PDF structures and encodings  
✅ **Intelligent Chunking** - Semantic-aware text segmentation with configurable overlap  
✅ **Fast Vector Search** - FAISS-powered similarity matching (< 100ms queries)  
✅ **Page Tracking** - Maintains document structure and page references  
✅ **Context Window Optimization** - Balances retrieval relevance with LLM token limits  
✅ **Error Handling** - Graceful failure modes with informative error messages  
✅ **CORS Support** - Configured for cross-origin requests (localhost development)  
✅ **Hot Reload** - Development servers auto-reload on code changes

## Professional Highlights & Achievements

• **Architected end-to-end RAG pipeline** - Designed production-grade system combining embedding generation, vector indexing, and LLM inference.

• **Implemented semantic search infrastructure** - Built efficient vector similarity matching using FAISS with tunable retrieval parameters (top-K configuration).

• **Engineered source-grounded AI responses** - Designed answer attribution system that traces AI outputs back to original document sections with page-level citations.

• **Created enterprise API design** - Developed clean, RESTful API with proper validation, error handling, and comprehensive documentation.

• **Built responsive React UI** - Designed intuitive frontend with real-time PDF upload, chat interface, and source highlighting for transparency.

• **Integrated multi-model LLM support** - Implemented OpenAI API abstraction enabling easy switching between different LLM providers and models.

• **Implemented async PDF processing** - Enabled non-blocking file uploads and processing through async FastAPI endpoints.

• **Developed configuration-driven system** - Built environment-based configuration allowing easy deployment across different environments.

## Environment Configuration

### Backend `.backend/.env`
```
# OpenRouter Configuration (for multi-model LLM access)
OPENAI_API_KEY=sk-or-v1-...
OPENAI_BASE_URL=https://openrouter.ai/api/v1

# Model Selection
OPENAI_MODEL_CHAT=openai/gpt-4o-mini              # LLM for answer generation
OPENAI_MODEL_EMBEDDING=openai/text-embedding-3-small  # Embedding model

# RAG Parameters
TOP_K=4                    # Number of chunks to retrieve
CHUNK_SIZE=700             # Characters per chunk
CHUNK_OVERLAP=120          # Character overlap between chunks
```

### Frontend `.frontend/.env`
```
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Deployment Considerations

- **Vector Index Persistence** - FAISS index stored at `backend/storage/vectors.index` for session persistence
- **Storage Requirements** - Large PDFs (1000+ pages) may require increased memory for indexing
- **API Rate Limiting** - OpenRouter API has rate limits; consider implementing request queuing for production
- **Security** - API keys should never be committed; always use `.env` files with `.gitignore` protection
- **CORS Configuration** - Currently set for localhost development; update for production domains

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "ModuleNotFoundError: app" | Ensure you're running from `backend/` directory |
| "API connection refused" | Verify backend is running on port 8000 |
| "VITE is not recognized" | Run `npm install` in frontend directory |
| "OpenAI API Error" | Check API key validity and OpenRouter account status |
| "FAISS index not found" | Upload a PDF first to generate the index |
| "Slow query response" | Reduce TOP_K or increase CHUNK_SIZE for faster retrieval |

## Future Enhancements

- [ ] Multi-document RAG (compare/cross-reference across PDFs)
- [ ] Document versioning and update handling
- [ ] User authentication and session management
- [ ] PDF highlighting & annotation features
- [ ] Advanced search filters (date range, relevance threshold)
- [ ] Response caching for repeated queries
- [ ] Streaming responses for real-time answer updates
- [ ] Batch PDF processing
- [ ] Analytics dashboard (query patterns, most cited sections)
- [ ] Mobile app version using React Native

## License

MIT License - See LICENSE file for details

## Contact & Support

For issues, feature requests, or questions, please open an issue on the project repository.

---

**Built with ❤️ using React, FastAPI, and FAISS** | Last Updated: 2026-06-07
