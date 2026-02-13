/**
 * SimpLLM Model Database
 * All available models in Akbank GitHub Copilot
 */

export type CreditTier = 'free' | 'cheap' | 'standard' | 'premium';

export interface ModelDefinition {
    id: string;
    family: string;
    name: string;
    creditMultiplier: number;
    creditTier: CreditTier;
    isPreview: boolean;

    // Capabilities (1-10 scale)
    capabilities: {
        codeGeneration: number;
        reasoning: number;
        speed: number;
        contextWindow: number; // K tokens
    };

    // Best for these task types
    bestFor: string[];
}

// ============================================
// AKBANK COPILOT MODELS (Güncel Liste)
// ============================================

export const MODELS: ModelDefinition[] = [
    // ========== 0x CREDIT (FREE) ==========
    {
        id: 'gpt-4.1',
        family: 'gpt-4.1',
        name: 'GPT-4.1',
        creditMultiplier: 0,
        creditTier: 'free',
        isPreview: false,
        capabilities: { codeGeneration: 8, reasoning: 7, speed: 7, contextWindow: 128 },
        bestFor: ['general', 'debugging', 'functions']
    },
    {
        id: 'gpt-4o',
        family: 'gpt-4o',
        name: 'GPT-4o',
        creditMultiplier: 0,
        creditTier: 'free',
        isPreview: false,
        capabilities: { codeGeneration: 8, reasoning: 8, speed: 8, contextWindow: 128 },
        bestFor: ['general', 'multimodal', 'debugging', 'documentation']
    },
    {
        id: 'gpt-5-mini',
        family: 'gpt-5-mini',
        name: 'GPT-5 Mini',
        creditMultiplier: 0,
        creditTier: 'free',
        isPreview: false,
        capabilities: { codeGeneration: 7, reasoning: 6, speed: 9, contextWindow: 32 },
        bestFor: ['simple-tasks', 'quick-questions', 'explanations']
    },

    // ========== 0.33x CREDIT ==========
    {
        id: 'claude-haiku-4.5',
        family: 'claude-3.5-haiku',
        name: 'Claude Haiku 4.5',
        creditMultiplier: 0.33,
        creditTier: 'cheap',
        isPreview: false,
        capabilities: { codeGeneration: 7, reasoning: 6, speed: 9, contextWindow: 32 },
        bestFor: ['quick-edits', 'comments', 'simple-refactoring']
    },
    {
        id: 'gemini-3-flash',
        family: 'gemini-flash',
        name: 'Gemini 3 Flash',
        creditMultiplier: 0.33,
        creditTier: 'cheap',
        isPreview: true,
        capabilities: { codeGeneration: 7, reasoning: 6, speed: 10, contextWindow: 128 },
        bestFor: ['quick-tasks', 'formatting']
    },
    {
        id: 'gpt-5.1-codex-mini',
        family: 'gpt-5.1-codex-mini',
        name: 'GPT-5.1-Codex-Mini',
        creditMultiplier: 0.33,
        creditTier: 'cheap',
        isPreview: true,
        capabilities: { codeGeneration: 8, reasoning: 5, speed: 10, contextWindow: 16 },
        bestFor: ['autocomplete', 'inline-suggestions']
    },

    // ========== 1x CREDIT ==========
    {
        id: 'claude-sonnet-4',
        family: 'claude-sonnet-4',
        name: 'Claude Sonnet 4',
        creditMultiplier: 1,
        creditTier: 'standard',
        isPreview: false,
        capabilities: { codeGeneration: 9, reasoning: 8, speed: 6, contextWindow: 200 },
        bestFor: ['code-quality', 'design-patterns', 'refactoring']
    },
    {
        id: 'claude-sonnet-4.5',
        family: 'claude-3.5-sonnet',
        name: 'Claude Sonnet 4.5',
        creditMultiplier: 1,
        creditTier: 'standard',
        isPreview: false,
        capabilities: { codeGeneration: 9, reasoning: 9, speed: 6, contextWindow: 200 },
        bestFor: ['tests', 'complex-algorithms', 'code-review']
    },
    {
        id: 'gemini-2.5-pro',
        family: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        creditMultiplier: 1,
        creditTier: 'standard',
        isPreview: false,
        capabilities: { codeGeneration: 8, reasoning: 8, speed: 5, contextWindow: 1000 },
        bestFor: ['long-context', 'codebase-analysis', 'multi-file']
    },
    {
        id: 'gemini-3-pro',
        family: 'gemini-3-pro',
        name: 'Gemini 3 Pro',
        creditMultiplier: 1,
        creditTier: 'standard',
        isPreview: true,
        capabilities: { codeGeneration: 8, reasoning: 8, speed: 6, contextWindow: 128 },
        bestFor: ['modern-frameworks', 'multimodal']
    },
    {
        id: 'gpt-5',
        family: 'gpt-5',
        name: 'GPT-5',
        creditMultiplier: 1,
        creditTier: 'standard',
        isPreview: false,
        capabilities: { codeGeneration: 9, reasoning: 9, speed: 6, contextWindow: 128 },
        bestFor: ['complex-reasoning', 'system-design']
    },
    {
        id: 'gpt-5-codex',
        family: 'gpt-5-codex',
        name: 'GPT-5-Codex',
        creditMultiplier: 1,
        creditTier: 'standard',
        isPreview: true,
        capabilities: { codeGeneration: 9, reasoning: 8, speed: 7, contextWindow: 64 },
        bestFor: ['code-generation', 'completions']
    },
    {
        id: 'gpt-5.1',
        family: 'gpt-5.1',
        name: 'GPT-5.1',
        creditMultiplier: 1,
        creditTier: 'standard',
        isPreview: false,
        capabilities: { codeGeneration: 9, reasoning: 9, speed: 6, contextWindow: 128 },
        bestFor: ['complex-tasks', 'debugging']
    },
    {
        id: 'gpt-5.1-codex',
        family: 'gpt-5.1-codex',
        name: 'GPT-5.1-Codex',
        creditMultiplier: 1,
        creditTier: 'standard',
        isPreview: false,
        capabilities: { codeGeneration: 9, reasoning: 8, speed: 7, contextWindow: 64 },
        bestFor: ['code-generation', 'refactoring']
    },
    {
        id: 'gpt-5.1-codex-max',
        family: 'gpt-5.1-codex-max',
        name: 'GPT-5.1-Codex-Max',
        creditMultiplier: 1,
        creditTier: 'standard',
        isPreview: false,
        capabilities: { codeGeneration: 10, reasoning: 9, speed: 5, contextWindow: 128 },
        bestFor: ['complex-code', 'large-refactoring']
    },
    {
        id: 'gpt-5.2',
        family: 'gpt-5.2',
        name: 'GPT-5.2',
        creditMultiplier: 1,
        creditTier: 'standard',
        isPreview: false,
        capabilities: { codeGeneration: 9, reasoning: 9, speed: 6, contextWindow: 128 },
        bestFor: ['latest-features', 'complex-reasoning']
    },
    {
        id: 'gpt-5.2-codex',
        family: 'gpt-5.2-codex',
        name: 'GPT-5.2-Codex',
        creditMultiplier: 1,
        creditTier: 'standard',
        isPreview: false,
        capabilities: { codeGeneration: 10, reasoning: 9, speed: 6, contextWindow: 128 },
        bestFor: ['code-generation', 'latest-patterns']
    },

    // ========== 3x CREDIT ==========
    {
        id: 'claude-opus-4.5',
        family: 'claude-opus',
        name: 'Claude Opus 4.5',
        creditMultiplier: 3,
        creditTier: 'premium',
        isPreview: false,
        capabilities: { codeGeneration: 10, reasoning: 10, speed: 4, contextWindow: 200 },
        bestFor: ['architecture', 'security-audit', 'critical-systems', 'legacy-modernization']
    }
];

// ============================================
// TASK TYPES & ROUTING
// ============================================

export type TaskType =
    | 'autocomplete' | 'simple' | 'function' | 'algorithm'
    | 'test' | 'debug' | 'refactor' | 'architecture'
    | 'security' | 'documentation' | 'conversion' | 'review' | 'long-context';

export interface TaskPattern {
    type: TaskType;
    patterns: RegExp[];
    keywords: string[];
}

export const TASK_PATTERNS: TaskPattern[] = [
    { type: 'autocomplete', patterns: [/tamamla|complete|finish/i], keywords: ['autocomplete'] },
    { type: 'simple', patterns: [/basit|simple|kolay/i], keywords: ['renk', 'color', 'import', 'typo'] },
    { type: 'function', patterns: [/fonksiyon|function|method/i], keywords: ['yaz', 'write', 'create'] },
    { type: 'algorithm', patterns: [/algoritma|algorithm|sort|search/i], keywords: ['binary', 'hash', 'recursive'] },
    { type: 'test', patterns: [/test|spec|jest|pytest/i], keywords: ['unit', 'integration', 'mock'] },
    { type: 'debug', patterns: [/debug|hata|error|bug|fix/i], keywords: ['neden', 'why', 'crash'] },
    { type: 'refactor', patterns: [/refactor|yeniden yaz|rewrite/i], keywords: ['pattern', 'solid', 'clean'] },
    { type: 'architecture', patterns: [/architecture|mimari|design/i], keywords: ['microservice', 'api', 'scale'] },
    { type: 'security', patterns: [/security|güvenlik|vulnerability/i], keywords: ['sql', 'xss', 'auth'] },
    { type: 'documentation', patterns: [/document|yorum|readme/i], keywords: ['jsdoc', 'açıkla'] },
    { type: 'conversion', patterns: [/convert|dönüştür|migrate/i], keywords: ['typescript', 'async'] },
    { type: 'review', patterns: [/review|incele|check/i], keywords: ['best practice', 'improve'] }
];

// All valid task types
export const TASK_TYPES_LIST: TaskType[] = [
    'autocomplete', 'simple', 'function', 'algorithm', 'test', 'debug',
    'refactor', 'architecture', 'security', 'documentation', 'conversion', 'review', 'long-context'
];

// Default routing (can be overridden by admin config)
export const DEFAULT_TASK_ROUTING: Record<TaskType, string> = {
    'autocomplete': 'gpt-4o',           // Free, fast
    'simple': 'gpt-4o',                 // Free, good quality
    'function': 'gpt-4o',               // Free, general purpose
    'algorithm': 'claude-sonnet-4.5',   // 1x, best for complex code
    'test': 'claude-sonnet-4.5',        // 1x, great test generation
    'debug': 'gpt-4o',                  // Free, good debugging
    'refactor': 'claude-sonnet-4',      // 1x, design patterns
    'architecture': 'claude-opus-4.5',  // 3x, only for critical
    'security': 'claude-opus-4.5',      // 3x, security is critical
    'documentation': 'gpt-4o',          // Free, good docs
    'conversion': 'gpt-4o',             // Free, good conversions
    'review': 'claude-sonnet-4.5',      // 1x, quality review
    'long-context': 'gemini-2.5-pro'    // 1x, 1M context
};

// ============================================
// ADMIN CONFIGURATION (from settings/server)
// ============================================

export interface AdminConfig {
    // Custom routing overrides
    taskRouting: Partial<Record<TaskType, string>>;

    // Blocked models
    blockedModels: string[];

    // Max credit tier allowed
    maxCreditTier: CreditTier;

    // Department-specific rules
    departmentRules?: Record<string, {
        allowedModels: string[];
        defaultModel: string;
    }>;
}

export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
    taskRouting: {},
    blockedModels: [],
    maxCreditTier: 'premium'
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getModel(id: string): ModelDefinition | undefined {
    return MODELS.find(m => m.id === id);
}

export function getModelsByTier(tier: CreditTier): ModelDefinition[] {
    return MODELS.filter(m => m.creditTier === tier);
}

export function detectTaskType(prompt: string): TaskType {
    for (const pattern of TASK_PATTERNS) {
        for (const regex of pattern.patterns) {
            if (regex.test(prompt)) return pattern.type;
        }
        for (const keyword of pattern.keywords) {
            if (prompt.toLowerCase().includes(keyword)) return pattern.type;
        }
    }
    return 'function'; // Default
}

export function getRecommendedModel(
    taskType: TaskType,
    adminConfig: AdminConfig = DEFAULT_ADMIN_CONFIG,
    contextSize?: number
): { model: ModelDefinition; reason: string } {
    // Check for very long context
    if (contextSize && contextSize > 100000) {
        const gemini = getModel('gemini-2.5-pro')!;
        return { model: gemini, reason: 'Long context (>100K tokens)' };
    }

    // Check admin override
    const adminRouting = adminConfig.taskRouting[taskType];
    if (adminRouting) {
        const model = getModel(adminRouting);
        if (model) {
            return { model, reason: `Admin configured: ${taskType}` };
        }
    }

    // Use default routing
    const defaultModelId = DEFAULT_TASK_ROUTING[taskType];
    const model = getModel(defaultModelId)!;

    return { model, reason: `${taskType} task` };
}
