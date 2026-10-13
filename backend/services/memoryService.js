import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import supabase from '../config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const MEMORY_FILE = path.join(DATA_DIR, 'memory.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial knowledge base seeds for Memory and Learning Agent
const INITIAL_MEMORIES = [
  {
    id: 'mem-seed-1',
    key: 'student_budget_constraint',
    memory_type: 'preference',
    value: 'Students typically have strict capital limits ($8,000–$16,000 upfront), prioritize insurance costs, and require low routine maintenance.',
    confidence: 0.95,
    tags: ['student', 'budget', 'demographic', 'transportation'],
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'mem-seed-2',
    key: 'ev_charging_infrastructure_rule',
    memory_type: 'fact',
    value: 'Level 1 charging (120V) provides 3–5 miles of range per hour. Level 2 (240V) provides 25–35 miles/hr. Apartment-dwelling students without dedicated parking rely heavily on campus or municipal public chargers.',
    confidence: 0.98,
    tags: ['ev', 'charging', 'infrastructure', 'apartment'],
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'mem-seed-3',
    key: 'battery_degradation_benchmark',
    memory_type: 'fact',
    value: 'Modern liquid-cooled lithium-ion batteries degrade at approximately 1.5%–2.3% capacity per year. Used EVs should have battery state-of-health (SoH) diagnostics verified prior to purchase.',
    confidence: 0.96,
    tags: ['ev', 'battery', 'longevity', 'degradation'],
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'mem-seed-4',
    key: 'used_clean_vehicle_tax_credit',
    memory_type: 'learning',
    value: 'US Section 25E provides up to 30% or $4,000 federal tax credit for eligible used clean vehicles purchased from licensed dealers under $25,000, subject to income thresholds.',
    confidence: 0.99,
    tags: ['ev', 'tax_credit', 'incentive', 'finance'],
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

// Initialize local JSON file if missing
const initMemoryStore = () => {
  if (!fs.existsSync(MEMORY_FILE)) {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(INITIAL_MEMORIES, null, 2), 'utf8');
  }
};
initMemoryStore();

const readLocalMemories = () => {
  try {
    initMemoryStore();
    const raw = fs.readFileSync(MEMORY_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[MemoryService] Error reading local memory file:', err.message);
    return INITIAL_MEMORIES;
  }
};

const writeLocalMemories = (memories) => {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2), 'utf8');
  } catch (err) {
    console.error('[MemoryService] Error writing local memory file:', err.message);
  }
};

export const memoryService = {
  /**
   * Retrieves relevant memory entries based on text query keywords and tags
   */
  async retrieveRelevantMemories(query = '', tags = []) {
    const localList = readLocalMemories();
    const queryTokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

    // Score memories
    const scored = localList.map((mem) => {
      let score = 0;
      const memText = `${mem.key} ${mem.value} ${(mem.tags || []).join(' ')}`.toLowerCase();

      queryTokens.forEach((token) => {
        if (memText.includes(token)) score += 2;
      });

      if (tags && tags.length > 0 && mem.tags) {
        tags.forEach((tag) => {
          if (mem.tags.includes(tag.toLowerCase())) score += 3;
        });
      }

      return { ...mem, relevanceScore: score };
    });

    const relevant = scored
      .filter((m) => m.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);

    // If query has few direct hits, return general domain seeds
    return relevant.length > 0 ? relevant : localList.slice(0, 3);
  },

  /**
   * Stores a new memory into persistent storage (Supabase with JSON fallback)
   */
  async storeMemory(entry, userId = null) {
    const newEntry = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      user_id: userId,
      key: entry.key || 'generic_learning',
      value: entry.value,
      memory_type: entry.memory_type || 'learning',
      confidence: entry.confidence || 0.9,
      tags: entry.tags || [],
      created_at: new Date().toISOString(),
    };

    // Store locally
    const current = readLocalMemories();
    current.unshift(newEntry);
    writeLocalMemories(current);

    // Attempt Supabase insert if table exists
    try {
      await supabase.from('agent_memories').insert({
        user_id: userId,
        key: newEntry.key,
        value: newEntry.value,
        memory_type: newEntry.memory_type,
        confidence: newEntry.confidence,
        tags: newEntry.tags,
      });
    } catch {
      // Graceful fallback to local persistence
    }

    return newEntry;
  },

  /**
   * Returns all memories
   */
  async getAllMemories() {
    return readLocalMemories();
  },

  /**
   * Save user feedback to adjust agent learning
   */
  async recordFeedback(taskId, rating, comments, userId = null) {
    const feedbackMemory = {
      key: `user_feedback_task_${taskId}`,
      memory_type: 'feedback',
      value: `User feedback rating: ${rating}/5. Commentary: "${comments || 'None'}". Agent recommendation accuracy and tone should reflect this guidance.`,
      confidence: 1.0,
      tags: ['user_feedback', rating >= 4 ? 'positive' : 'correction', 'learning'],
    };

    return await this.storeMemory(feedbackMemory, userId);
  },
};
