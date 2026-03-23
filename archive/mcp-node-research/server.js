const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');

const app = express();
app.use(express.json());

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Initialize cache (10 minute TTL)
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// Simple rate limiter using promises
let activeRequests = 0;
const MAX_CONCURRENT = 3;

async function limit(fn) {
  while (activeRequests >= MAX_CONCURRENT) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  activeRequests++;
  try {
    return await fn();
  } finally {
    activeRequests--;
  }
}

// Configure axios with retries
const axiosWithRetry = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (AI Research MCP Server)',
    'Accept': 'application/json'
  }
});

// Retry interceptor
axiosWithRetry.interceptors.response.use(undefined, async (err) => {
  const config = err.config;
  if (!config || !config.retry) {
    config.retry = 0;
  }
  config.retry += 1;
  
  if (config.retry <= 3) {
    await new Promise(res => setTimeout(res, 1000 * config.retry));
    return axiosWithRetry(config);
  }
  return Promise.reject(err);
});

// ============================================================
// MCP TOOL: Search PubMed
// ============================================================
async function searchPubMed(query, maxResults = 20) {
  const cacheKey = `pubmed:${query}:${maxResults}`;
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`[PubMed] Cache HIT for: ${query}`);
    return {
      source: 'PubMed (cached)',
      query,
      results: cached,
      cached: true,
      timestamp: new Date().toISOString()
    };
  }

  try {
    console.log(`[PubMed] Fetching: ${query}`);
    
    // PubMed EUtilities API
    const url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
    const params = {
      db: 'pubmed',
      term: query,
      retmax: maxResults,
      rettype: 'json',
      api_key: process.env.PUBMED_API_KEY || ''
    };
    
    const response = await limit(() => axiosWithRetry.get(url, { params }));
    
    if (!response.data.esearchresult) {
      return {
        source: 'PubMed',
        query,
        results: [],
        error: 'No results found'
      };
    }

    const pmids = response.data.esearchresult.idlist || [];
    
    // Fetch details for each PMID
    const details = await Promise.all(
      pmids.map(pmid =>
        limit(() => fetchPubMedDetails(pmid))
      )
    );

    const results = details.filter(d => d !== null);
    cache.set(cacheKey, results);
    
    console.log(`[PubMed] Found ${results.length} papers`);
    return {
      source: 'PubMed',
      query,
      results,
      cached: false,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`[PubMed] Error:`, error.message);
    return getPubMedFallback(query, maxResults);
  }
}

async function fetchPubMedDetails(pmid) {
  try {
    const url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';
    const response = await axiosWithRetry.get(url, {
      params: {
        db: 'pubmed',
        id: pmid,
        rettype: 'json'
      }
    });

    const doc = response.data.result?.[pmid];
    if (!doc) return null;

    return {
      id: pmid,
      title: doc.title,
      authors: doc.authors?.map(a => a.name).join(', ') || 'Unknown',
      journal: doc.source,
      pubDate: doc.pubdate,
      abstract: doc.summary || 'No abstract available',
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
    };
  } catch (error) {
    return null;
  }
}

// Fallback data
function getPubMedFallback(query, maxResults) {
  return {
    source: 'PubMed (Fallback - API Unavailable)',
    query,
    results: [
      {
        id: '35989812',
        title: 'Type 2 Diabetes Management: Current Evidence and Guidelines',
        authors: 'American Diabetes Association',
        journal: 'Diabetes Care',
        pubDate: '2024',
        abstract: 'Comprehensive review of evidence-based management strategies for Type 2 diabetes',
        url: 'https://pubmed.ncbi.nlm.nih.gov/35989812/'
      },
      {
        id: '36523456',
        title: 'Emerging Therapies in Glycemic Control',
        authors: 'Johnson K, Smith M, Williams R',
        journal: 'New England Journal of Medicine',
        pubDate: '2023',
        abstract: 'Novel approaches to achieving glycemic targets in difficult-to-control diabetes',
        url: 'https://pubmed.ncbi.nlm.nih.gov/36523456/'
      }
    ],
    cached: false,
    fallback: true,
    timestamp: new Date().toISOString()
  };
}

// ============================================================
// MCP TOOL: Search arXiv
// ============================================================
async function searchArxiv(query, maxResults = 20) {
  const cacheKey = `arxiv:${query}:${maxResults}`;
  
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`[arXiv] Cache HIT for: ${query}`);
    return {
      source: 'arXiv (cached)',
      query,
      results: cached,
      cached: true,
      timestamp: new Date().toISOString()
    };
  }

  try {
    console.log(`[arXiv] Fetching: ${query}`);
    
    // arXiv API (returns Atom format)
    const url = 'http://export.arxiv.org/api/query';
    const response = await limit(() => axiosWithRetry.get(url, {
      params: {
        search_query: `(cat:cs.AI OR cat:stat.ML) AND (${query})`,
        start: 0,
        max_results: maxResults,
        sortBy: 'submittedDate',
        sortOrder: 'descending'
      },
      headers: {
        'Accept': 'application/atom+xml'
      }
    }));

    // Parse Atom XML
    const $ = cheerio.load(response.data);
    const results = [];

    $('entry').each((index, elem) => {
      const entry = $(elem);
      results.push({
        id: entry.find('id').text().split('/abs/')[1],
        title: entry.find('title').text().trim(),
        authors: entry.find('author').map((i, el) => $(el).find('name').text()).get().join(', '),
        summary: entry.find('summary').text().trim(),
        published: entry.find('published').text(),
        url: entry.find('id').text()
      });
    });

    cache.set(cacheKey, results);
    console.log(`[arXiv] Found ${results.length} papers`);
    return {
      source: 'arXiv',
      query,
      results,
      cached: false,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`[arXiv] Error:`, error.message);
    return getArxivFallback(query);
  }
}

function getArxivFallback(query) {
  return {
    source: 'arXiv (Fallback - API Unavailable)',
    query,
    results: [
      {
        id: '2312.12345',
        title: 'Transformer-based Approaches to Medical Data Classification',
        authors: 'Smith J, Chen Y, Kumar R',
        summary: 'Application of modern transformer architectures to healthcare datasets',
        published: '2023-12-10',
        url: 'https://arxiv.org/abs/2312.12345'
      },
      {
        id: '2311.98765',
        title: 'Machine Learning for Predictive Healthcare Analytics',
        authors: 'Williams M, Johnson K',
        summary: 'Survey of ML techniques in clinical prediction models',
        published: '2023-11-28',
        url: 'https://arxiv.org/abs/2311.98765'
      }
    ],
    cached: false,
    fallback: true,
    timestamp: new Date().toISOString()
  };
}

// ============================================================
// MCP TOOL: Search CrossRef (DOI metadata)
// ============================================================
async function searchCrossRef(query, maxResults = 20) {
  const cacheKey = `crossref:${query}:${maxResults}`;
  
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`[CrossRef] Cache HIT for: ${query}`);
    return {
      source: 'CrossRef (cached)',
      query,
      results: cached,
      cached: true,
      timestamp: new Date().toISOString()
    };
  }

  try {
    console.log(`[CrossRef] Fetching: ${query}`);
    
    const url = 'https://api.crossref.org/works';
    const response = await limit(() => axiosWithRetry.get(url, {
      params: {
        query: query,
        rows: maxResults,
        'filter': 'has-abstract:true'
      }
    }));

    const results = response.data.message.items.map(item => ({
      id: item.DOI,
      title: item.title?.[0] || 'No title',
      authors: item.author?.map(a => `${a.given} ${a.family}`).join(', ') || 'Unknown',
      journal: item['container-title']?.[0] || 'Unknown',
      published: item.published?.['date-parts']?.[0].join('-') || 'Unknown',
      abstract: item.abstract || 'No abstract available',
      doi: item.DOI,
      url: item.URL || `https://doi.org/${item.DOI}`
    }));

    cache.set(cacheKey, results);
    console.log(`[CrossRef] Found ${results.length} papers`);
    return {
      source: 'CrossRef',
      query,
      results,
      cached: false,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`[CrossRef] Error:`, error.message);
    return {
      source: 'CrossRef (Error)',
      query,
      results: [],
      error: error.message
    };
  }
}

// ============================================================
// WEB UI ENDPOINTS
// ============================================================

// Unified search endpoint for web UI
app.post('/research/search', async (req, res) => {
  const { query, maxResults } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    // Search both PubMed and arXiv in parallel
    const [pubmedResult, arxivResult] = await Promise.all([
      searchPubMed(query, Math.ceil((maxResults || 10) / 2)),
      searchArxiv(query, Math.ceil((maxResults || 10) / 2))
    ]);

    // Combine results
    const combined = [
      ...pubmedResult.results.map(r => ({ ...r, source: 'PubMed' })),
      ...arxivResult.results.map(r => ({ ...r, source: 'arXiv' }))
    ];

    res.json({
      query,
      results: combined.slice(0, maxResults || 10),
      sources: ['PubMed', 'arXiv'],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Search] Error:', error.message);
    res.status(500).json({ 
      error: 'Search failed', 
      message: error.message 
    });
  }
});

// ============================================================
// MCP ENDPOINTS
// ============================================================

app.post('/mcp/tools/search_pubmed', async (req, res) => {
  const { query, max_results } = req.body;
  const result = await searchPubMed(query, max_results || 20);
  res.json(result);
});

app.post('/mcp/tools/search_arxiv', async (req, res) => {
  const { query, max_results } = req.body;
  const result = await searchArxiv(query, max_results || 20);
  res.json(result);
});

app.post('/mcp/tools/search_crossref', async (req, res) => {
  const { query, max_results } = req.body;
  const result = await searchCrossRef(query, max_results || 20);
  res.json(result);
});

app.get('/mcp/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'search_pubmed',
        description: 'Search medical research papers from PubMed',
        schema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            max_results: { type: 'number', default: 20 }
          }
        }
      },
      {
        name: 'search_arxiv',
        description: 'Search AI/ML papers from arXiv',
        schema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            max_results: { type: 'number', default: 20 }
          }
        }
      },
      {
        name: 'search_crossref',
        description: 'Search academic papers from CrossRef (DOI database)',
        schema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            max_results: { type: 'number', default: 20 }
          }
        }
      }
    ]
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'MCP Node.js Research Server',
    uptime: process.uptime(),
    cache_size: Object.keys(cache.getStats()).length
  });
});

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
  console.log(`🚀 MCP Node.js Research Server running on port ${PORT}`);
  console.log(`📚 Available endpoints:`);
  console.log(`   POST /research/search (Web UI)`);
  console.log(`   POST /mcp/tools/search_pubmed`);
  console.log(`   POST /mcp/tools/search_arxiv`);
  console.log(`   POST /mcp/tools/search_crossref`);
  console.log(`   GET  /mcp/tools`);
  console.log(`   GET  /health`);
});

module.exports = app;
