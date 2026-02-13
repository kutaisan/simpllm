import * as vscode from 'vscode';
import {
    MODELS,
    ModelDefinition,
    TaskType,
    getModel,
    AdminConfig,
    DEFAULT_ADMIN_CONFIG,
    CreditTier,
    DEFAULT_TASK_ROUTING,
    TASK_TYPES_LIST
} from './models.js';
import {
    initFeedback,
    recordFeedback,
    recordOverride,
    generateRequestId,
    showFeedbackButtons
} from './feedback.js';
import { openAdminPanel } from './admin.js';

// ============================================
// SESSION STATE
// ============================================
const sessionStats = {
    requestCount: 0,
    tokenCount: { input: 0, output: 0 },
    creditsByModel: {} as Record<string, number>,
    taskTypes: {} as Record<string, number>,
    totalCreditsUsed: 0
};

let statusBarItem: vscode.StatusBarItem;
let forceModelId: string | null = null;
let adminConfig: AdminConfig = DEFAULT_ADMIN_CONFIG;

// Last request info for quick retry
let lastRequest: {
    prompt: string;
    requestId: string;
    modelId: string;
    taskType: string;
} | null = null;

// ============================================
// CLASSIFICATION PROMPT (Two-Pass System)
// ============================================
const CLASSIFIER_SYSTEM_PROMPT = `You are a prompt classifier. Your ONLY job is to analyze the user's request and classify it.

RESPOND WITH EXACTLY ONE LINE in this format:
TASK:<type>

Where <type> is one of: autocomplete, simple, function, algorithm, test, debug, refactor, architecture, security, documentation, conversion, review, long-context

Classification rules:
- autocomplete: completing code, finishing snippets
- simple: typos, formatting, imports, simple questions
- function: writing functions, methods, classes
- algorithm: sorting, searching, data structures, complex logic
- test: unit tests, integration tests, test cases
- debug: finding bugs, fixing errors, troubleshooting
- refactor: restructuring code, design patterns, clean code
- architecture: system design, microservices, database design, scaling
- security: vulnerabilities, auth, encryption, security audit
- documentation: comments, README, API docs, explanations
- conversion: language conversion, migration, framework change
- review: code review, best practices, improvements
- long-context: large codebase analysis, multi-file operations

DO NOT answer the question. DO NOT write code. ONLY classify.
Example: TASK:debug`;

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Two-pass classification using the classifier model
 */
async function classifyPrompt(prompt: string, token: vscode.CancellationToken): Promise<TaskType> {
    const config = vscode.workspace.getConfiguration('simpllm');
    const classifierModelId = config.get<string>('classifierModel', 'gpt-4o');
    const classifierDef = getModel(classifierModelId);

    if (!classifierDef) return fallbackClassify(prompt);

    try {
        const models = await vscode.lm.selectChatModels({
            vendor: 'copilot',
            family: classifierDef.family
        });

        if (models.length === 0) return fallbackClassify(prompt);

        const classifier = models[0];
        const messages = [
            vscode.LanguageModelChatMessage.User(CLASSIFIER_SYSTEM_PROMPT + '\n\nClassify this prompt:\n' + prompt)
        ];

        const response = await classifier.sendRequest(messages, {}, token);
        let result = '';
        for await (const chunk of response.text) {
            result += chunk;
        }

        // Parse classification result
        const match = result.match(/TASK:(\S+)/i);
        if (match) {
            const taskType = match[1].toLowerCase() as TaskType;
            if (TASK_TYPES_LIST.includes(taskType)) {
                return taskType;
            }
        }

        return fallbackClassify(prompt);
    } catch {
        return fallbackClassify(prompt);
    }
}

/**
 * Keyword-based fallback classifier (no API call)
 */
function fallbackClassify(prompt: string): TaskType {
    const p = prompt.toLowerCase();
    if (/test|spec|jest|pytest|unit|mock/.test(p)) return 'test';
    if (/debug|hata|error|bug|fix|crash/.test(p)) return 'debug';
    if (/security|güvenlik|vulnerability|xss|sql injection/.test(p)) return 'security';
    if (/architecture|mimari|design|microservice|scale/.test(p)) return 'architecture';
    if (/refactor|yeniden yaz|rewrite|clean|solid/.test(p)) return 'refactor';
    if (/algorithm|algoritma|sort|search|recursive/.test(p)) return 'algorithm';
    if (/review|incele|check|best practice/.test(p)) return 'review';
    if (/document|readme|jsdoc|açıkla|explain/.test(p)) return 'documentation';
    if (/convert|dönüştür|migrate|transform/.test(p)) return 'conversion';
    if (/fonksiyon|function|method|class|write|yaz/.test(p)) return 'function';
    if (/basit|simple|import|typo|renk/.test(p)) return 'simple';
    if (/tamamla|complete|finish/.test(p)) return 'autocomplete';
    return 'function';
}

/**
 * Select the best Copilot model, respecting admin config
 */
async function selectCopilotModel(modelDef: ModelDefinition): Promise<vscode.LanguageModelChat | null> {
    try {
        let models = await vscode.lm.selectChatModels({ vendor: 'copilot', family: modelDef.family });
        if (models.length > 0) return models[0];

        // Fallback chain
        const fallbacks = ['gpt-4o', 'gpt-4.1', 'gpt-5-mini'];
        for (const fb of fallbacks) {
            const fbDef = getModel(fb);
            if (fbDef) {
                models = await vscode.lm.selectChatModels({ vendor: 'copilot', family: fbDef.family });
                if (models.length > 0) return models[0];
            }
        }

        // Last resort: any copilot model
        models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
        return models[0] || null;
    } catch (error) {
        console.error('SimpLLM model selection error:', error);
        return null;
    }
}

/**
 * Check model against admin policy
 */
function isModelAllowed(modelDef: ModelDefinition): boolean {
    const config = vscode.workspace.getConfiguration('simpllm');
    const blockedModels = config.get<string[]>('blockedModels', []);
    const maxTier = config.get<string>('maxCreditTier', 'premium') as CreditTier;
    if (blockedModels.includes(modelDef.id)) return false;
    const tierOrder: CreditTier[] = ['free', 'cheap', 'standard', 'premium'];
    return tierOrder.indexOf(modelDef.creditTier) <= tierOrder.indexOf(maxTier);
}

/**
 * Get recommended model for task type (respecting admin overrides)
 */
function getModelForTask(taskType: TaskType): ModelDefinition {
    const config = vscode.workspace.getConfiguration('simpllm');
    const customRouting = config.get<Record<string, string>>('taskRouting', {});

    // Admin override first
    if (customRouting[taskType]) {
        const model = getModel(customRouting[taskType]);
        if (model && isModelAllowed(model)) return model;
    }

    // Default routing
    const defaultId = DEFAULT_TASK_ROUTING[taskType];
    const model = getModel(defaultId);
    if (model && isModelAllowed(model)) return model;

    // Fallback to free model
    return getModel('gpt-4o')!;
}

/**
 * Update status bar with credit budget
 */
function updateStatusBar(model?: ModelDefinition) {
    const config = vscode.workspace.getConfiguration('simpllm');
    const monthlyBudget = config.get<number>('monthlyBudget', 300);
    const usedPercent = monthlyBudget > 0 ? Math.min(100, (sessionStats.totalCreditsUsed / monthlyBudget) * 100) : 0;

    if (model) {
        statusBarItem.text = `$(sparkle) ${model.name} · ${usedPercent.toFixed(0)}%`;
        statusBarItem.tooltip = new vscode.MarkdownString(
            `**SimpLLM**\n\n` +
            `Model: ${model.name} (${model.creditMultiplier}x)\n\n` +
            `Budget: ${sessionStats.totalCreditsUsed.toFixed(1)} / ${monthlyBudget} credits (${usedPercent.toFixed(0)}%)\n\n` +
            `Requests: ${sessionStats.requestCount}`
        );
    } else {
        statusBarItem.text = `$(sparkle) SimpLLM · ${usedPercent.toFixed(0)}%`;
    }

    // Color warning for budget
    if (usedPercent >= 90) {
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    } else if (usedPercent >= 70) {
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
        statusBarItem.backgroundColor = undefined;
    }
}

// ============================================
// CHAT HANDLER (Two-Pass)
// ============================================

async function handleChatRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
    const config = vscode.workspace.getConfiguration('simpllm');
    if (!config.get<boolean>('enabled', true)) {
        stream.markdown('SimpLLM is disabled. Enable it in settings.');
        return { metadata: { error: 'disabled' } };
    }

    const requestId = generateRequestId();
    const startTime = Date.now();
    const prompt = request.prompt;

    // Check for slash commands
    if (request.command === 'stats') {
        return handleStatsCommand(stream);
    }
    if (request.command === 'budget') {
        return handleBudgetCommand(stream);
    }

    // Check for force model override
    let cleanPrompt = prompt;
    let forcedId = forceModelId;
    forceModelId = null;

    const forceMatch = prompt.match(/@(\w[\w.-]*)/);
    if (forceMatch) {
        const modelPatterns: Record<string, string> = {
            'opus': 'claude-opus-4.5', 'sonnet4.5': 'claude-sonnet-4.5', 'sonnet': 'claude-sonnet-4',
            'geminipro': 'gemini-2.5-pro', 'gpt5.2': 'gpt-5.2', 'gpt5.1': 'gpt-5.1',
            'gpt5': 'gpt-5', 'gpt4o': 'gpt-4o', 'gpt4.1': 'gpt-4.1',
            'haiku': 'claude-haiku-4.5', 'flash': 'gemini-3-flash', 'codexmini': 'gpt-5.1-codex-mini'
        };
        const key = forceMatch[1].toLowerCase().replace(/-/g, '');
        if (modelPatterns[key]) {
            forcedId = modelPatterns[key];
            cleanPrompt = prompt.replace(forceMatch[0], '').trim();
        }
    }

    // ---- PASS 1: Classification ----
    let taskType: TaskType;
    let selectedModelDef: ModelDefinition;
    let reason: string;

    if (forcedId) {
        // Manual override
        selectedModelDef = getModel(forcedId)!;
        taskType = fallbackClassify(cleanPrompt); // Quick classify, don't waste API call
        reason = `Manual: ${selectedModelDef.name}`;

        if (lastRequest && lastRequest.modelId !== forcedId) {
            await recordOverride(requestId, lastRequest.modelId, forcedId, taskType);
        }
    } else {
        // Two-pass: classify first, then route
        stream.progress('Analyzing request...');
        taskType = await classifyPrompt(cleanPrompt, token);
        selectedModelDef = getModelForTask(taskType);
        reason = `${taskType} → ${selectedModelDef.name}`;
    }

    // Check policy
    if (!isModelAllowed(selectedModelDef)) {
        stream.markdown(`⚠️ **${selectedModelDef.name}** is restricted. Using fallback.\n\n`);
        selectedModelDef = getModel('gpt-4o')!;
    }

    // ---- PASS 2: Execute with selected model ----
    const model = await selectCopilotModel(selectedModelDef);
    if (!model) {
        stream.markdown(`⚠️ **Model not available:** ${selectedModelDef.name}\n\nPlease ensure GitHub Copilot Chat is installed.`);
        return { metadata: { error: 'no_model' } };
    }

    // Show routing info
    if (config.get<boolean>('showModelInfo', true)) {
        stream.markdown(`> **${model.name}** · ${selectedModelDef.creditMultiplier}x credit · ${reason}\n\n`);
    }

    updateStatusBar(selectedModelDef);

    // Build messages with history
    const messages = [vscode.LanguageModelChatMessage.User(cleanPrompt)];
    for (const turn of context.history) {
        if (turn instanceof vscode.ChatRequestTurn) {
            messages.push(vscode.LanguageModelChatMessage.User(turn.prompt));
        } else if (turn instanceof vscode.ChatResponseTurn) {
            let resp = '';
            for (const part of turn.response) {
                if (part instanceof vscode.ChatResponseMarkdownPart) resp += part.value.value;
            }
            if (resp) messages.push(vscode.LanguageModelChatMessage.Assistant(resp));
        }
    }

    try {
        const response = await model.sendRequest(messages, {}, token);
        let outputTokens = 0;
        for await (const chunk of response.text) {
            stream.markdown(chunk);
            outputTokens += chunk.length / 4;
        }

        // Update stats
        const responseTime = Date.now() - startTime;
        sessionStats.requestCount++;
        sessionStats.tokenCount.input += cleanPrompt.length / 4;
        sessionStats.tokenCount.output += outputTokens;
        sessionStats.creditsByModel[selectedModelDef.id] =
            (sessionStats.creditsByModel[selectedModelDef.id] || 0) + selectedModelDef.creditMultiplier;
        sessionStats.taskTypes[taskType] = (sessionStats.taskTypes[taskType] || 0) + 1;
        sessionStats.totalCreditsUsed += selectedModelDef.creditMultiplier;

        // Save last request for retry
        lastRequest = { prompt: cleanPrompt, requestId, modelId: selectedModelDef.id, taskType };

        // Show feedback + retry buttons
        if (config.get<boolean>('collectFeedback', true)) {
            showFeedbackButtons(stream, requestId, selectedModelDef.id, taskType);
        }

        // Quick retry button
        stream.button({
            command: 'simpllm.retryWithModel',
            title: '🔄 Retry with different model',
            arguments: [cleanPrompt]
        });

        updateStatusBar(selectedModelDef);

        // Check budget warnings
        const monthlyBudget = config.get<number>('monthlyBudget', 300);
        const usedPercent = (sessionStats.totalCreditsUsed / monthlyBudget) * 100;
        if (usedPercent >= 90) {
            stream.markdown('\n\n> ⚠️ **Credit budget at ' + usedPercent.toFixed(0) + '%**. Consider requesting extra credits.');
            stream.button({
                command: 'simpllm.requestCredits',
                title: '📋 Request Extra Credits',
                arguments: []
            });
        }

        return {
            metadata: { model: selectedModelDef.name, taskType, credit: selectedModelDef.creditMultiplier, requestId }
        };
    } catch (error) {
        if (error instanceof vscode.LanguageModelError) {
            stream.markdown(`\n\n⚠️ Error: ${error.message}`);
        } else {
            throw error;
        }
        return { metadata: { error: 'request_failed' } };
    }
}

// ============================================
// SLASH COMMANDS
// ============================================

function handleStatsCommand(stream: vscode.ChatResponseStream): vscode.ChatResult {
    const config = vscode.workspace.getConfiguration('simpllm');
    const monthlyBudget = config.get<number>('monthlyBudget', 300);
    const usedPercent = monthlyBudget > 0 ? (sessionStats.totalCreditsUsed / monthlyBudget * 100).toFixed(1) : '0';

    stream.markdown(`## 📊 SimpLLM Session Statistics\n\n`);
    stream.markdown(`| Metric | Value |\n|--------|-------|\n`);
    stream.markdown(`| Requests | ${sessionStats.requestCount} |\n`);
    stream.markdown(`| Credits Used | ${sessionStats.totalCreditsUsed.toFixed(1)}x |\n`);
    stream.markdown(`| Budget Used | ${usedPercent}% of ${monthlyBudget} |\n`);
    stream.markdown(`| Input Tokens | ~${Math.round(sessionStats.tokenCount.input)} |\n`);
    stream.markdown(`| Output Tokens | ~${Math.round(sessionStats.tokenCount.output)} |\n\n`);

    // Model breakdown
    stream.markdown(`### Model Usage\n\n`);
    stream.markdown(`| Model | Credits | Requests |\n|-------|---------|----------|\n`);
    for (const [id, credits] of Object.entries(sessionStats.creditsByModel).sort(([, a], [, b]) => b - a)) {
        const model = getModel(id);
        stream.markdown(`| ${model?.name || id} | ${credits.toFixed(1)}x | - |\n`);
    }

    // Task breakdown
    stream.markdown(`\n### Task Distribution\n\n`);
    stream.markdown(`| Task | Count |\n|------|-------|\n`);
    for (const [type, count] of Object.entries(sessionStats.taskTypes).sort(([, a], [, b]) => b - a)) {
        stream.markdown(`| ${type} | ${count} |\n`);
    }

    return { metadata: { command: 'stats' } };
}

function handleBudgetCommand(stream: vscode.ChatResponseStream): vscode.ChatResult {
    const config = vscode.workspace.getConfiguration('simpllm');
    const monthlyBudget = config.get<number>('monthlyBudget', 300);
    const used = sessionStats.totalCreditsUsed;
    const remaining = Math.max(0, monthlyBudget - used);
    const usedPercent = (used / monthlyBudget * 100).toFixed(1);

    const bar = '█'.repeat(Math.round(used / monthlyBudget * 20)) + '░'.repeat(Math.max(0, 20 - Math.round(used / monthlyBudget * 20)));

    stream.markdown(`## 💰 Credit Budget\n\n`);
    stream.markdown(`\`${bar}\` ${usedPercent}%\n\n`);
    stream.markdown(`| | Credits |\n|---|---|\n`);
    stream.markdown(`| Used | ${used.toFixed(1)}x |\n`);
    stream.markdown(`| Remaining | ${remaining.toFixed(1)}x |\n`);
    stream.markdown(`| Monthly Budget | ${monthlyBudget}x |\n\n`);

    if (remaining < 30) {
        stream.markdown(`> ⚠️ Low credits! Request more to avoid interruptions.\n\n`);
        stream.button({
            command: 'simpllm.requestCredits',
            title: '📋 Request Extra Credits',
            arguments: []
        });
    }

    return { metadata: { command: 'budget' } };
}

// ============================================
// MODEL PICKER & CREDIT REQUEST
// ============================================

async function showModelPicker() {
    const items: vscode.QuickPickItem[] = [
        { label: '$(sparkle) Auto', description: 'Intelligent routing', detail: 'auto' },
        { label: '', kind: vscode.QuickPickItemKind.Separator },
        { label: '0x Credit', kind: vscode.QuickPickItemKind.Separator },
        ...MODELS.filter(m => m.creditTier === 'free').map(m => ({
            label: m.name, description: `${m.creditMultiplier}x`, detail: m.id
        })),
        { label: '0.33x Credit', kind: vscode.QuickPickItemKind.Separator },
        ...MODELS.filter(m => m.creditTier === 'cheap').map(m => ({
            label: m.name + (m.isPreview ? ' (Preview)' : ''), description: `${m.creditMultiplier}x`, detail: m.id
        })),
        { label: '1x Credit', kind: vscode.QuickPickItemKind.Separator },
        ...MODELS.filter(m => m.creditTier === 'standard').map(m => ({
            label: m.name + (m.isPreview ? ' (Preview)' : ''), description: `${m.creditMultiplier}x`, detail: m.id
        })),
        { label: '3x Credit', kind: vscode.QuickPickItemKind.Separator },
        ...MODELS.filter(m => m.creditTier === 'premium').map(m => ({
            label: m.name, description: `${m.creditMultiplier}x`, detail: m.id
        }))
    ];

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select model for next request',
        title: 'SimpLLM'
    });

    if (selected?.detail) {
        if (selected.detail === 'auto') {
            forceModelId = null;
            vscode.window.showInformationMessage('SimpLLM: Auto routing enabled');
        } else {
            forceModelId = selected.detail;
            vscode.window.showInformationMessage(`SimpLLM: Next request → ${getModel(forceModelId)?.name}`);
        }
        updateStatusBar();
    }
}

async function retryWithModel(originalPrompt: string) {
    // Show model picker, then channel the prompt back
    const items = MODELS.map(m => ({
        label: m.name + (m.isPreview ? ' (Preview)' : ''),
        description: `${m.creditMultiplier}x credit`,
        detail: m.id
    }));

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select model for retry',
        title: 'SimpLLM — Retry with different model'
    });

    if (selected?.detail) {
        forceModelId = selected.detail;
        // Re-send via chat
        await vscode.commands.executeCommand('workbench.action.chat.open');
        vscode.window.showInformationMessage(
            `SimpLLM: Next request will use ${getModel(selected.detail)?.name}. Please re-send your prompt.`
        );
    }
}

async function requestExtraCredits() {
    const reason = await vscode.window.showInputBox({
        placeHolder: 'Why do you need extra credits?',
        title: 'SimpLLM — Extra Credit Request',
        prompt: 'This will be sent to your admin for approval.'
    });

    if (reason) {
        const config = vscode.workspace.getConfiguration('simpllm');
        const endpoint = config.get<string>('feedbackEndpoint', '');

        if (endpoint) {
            try {
                await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'credit_request',
                        timestamp: new Date().toISOString(),
                        teamId: config.get<string>('teamId', ''),
                        departmentId: config.get<string>('departmentId', ''),
                        currentUsage: sessionStats.totalCreditsUsed,
                        reason
                    })
                });
                vscode.window.showInformationMessage('SimpLLM: Credit request submitted! Your admin will review it.');
            } catch {
                vscode.window.showWarningMessage('SimpLLM: Could not submit request. Contact your admin directly.');
            }
        } else {
            vscode.window.showInformationMessage('SimpLLM: No admin endpoint configured. Please contact your admin directly.');
        }
    }
}

// ============================================
// ACTIVATION
// ============================================

export function activate(context: vscode.ExtensionContext) {
    console.log('SimpLLM: Activating with', MODELS.length, 'models');

    initFeedback(context);

    // Load admin config
    const config = vscode.workspace.getConfiguration('simpllm');
    adminConfig = {
        ...DEFAULT_ADMIN_CONFIG,
        taskRouting: config.get<Record<string, string>>('taskRouting', {}) as Partial<Record<TaskType, string>>,
        blockedModels: config.get<string[]>('blockedModels', []),
        maxCreditTier: config.get<string>('maxCreditTier', 'premium') as CreditTier
    };

    // Watch config changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('simpllm')) {
                const cfg = vscode.workspace.getConfiguration('simpllm');
                adminConfig = {
                    ...DEFAULT_ADMIN_CONFIG,
                    taskRouting: cfg.get<Record<string, string>>('taskRouting', {}) as Partial<Record<TaskType, string>>,
                    blockedModels: cfg.get<string[]>('blockedModels', []),
                    maxCreditTier: cfg.get<string>('maxCreditTier', 'premium') as CreditTier
                };
                updateStatusBar();
            }
        })
    );

    // Status bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'simpllm.setTier';
    updateStatusBar();
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Chat participant with slash commands
    const participant = vscode.chat.createChatParticipant('simpllm.router', handleChatRequest);
    participant.iconPath = new vscode.ThemeIcon('sparkle');
    context.subscriptions.push(participant);

    // Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('simpllm.setTier', showModelPicker),
        vscode.commands.registerCommand('simpllm.showStats', () => openAdminPanel(context, sessionStats)),
        vscode.commands.registerCommand('simpllm.openAdmin', () => openAdminPanel(context, sessionStats)),
        vscode.commands.registerCommand('simpllm.retryWithModel', retryWithModel),
        vscode.commands.registerCommand('simpllm.requestCredits', requestExtraCredits),
        vscode.commands.registerCommand('simpllm.feedbackPositive', async (requestId: string, model: string, taskType: string) => {
            await recordFeedback(requestId, model, taskType, 'positive');
            vscode.window.showInformationMessage('SimpLLM: Thanks for the feedback! 👍');
        }),
        vscode.commands.registerCommand('simpllm.feedbackNegative', async (requestId: string, model: string, taskType: string) => {
            await recordFeedback(requestId, model, taskType, 'negative');
            vscode.window.showInformationMessage('SimpLLM: Feedback recorded 👎');
        })
    );
}

export function deactivate() { }
