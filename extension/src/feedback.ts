/**
 * SimpLLM Feedback System
 * Collects explicit (thumbs up/down) and implicit (model override) feedback
 */
import * as vscode from 'vscode';

export interface FeedbackEntry {
    timestamp: string;
    requestId: string;
    selectedModel: string;
    taskType: string;
    rating: 'positive' | 'negative' | 'override';
    overriddenTo?: string;
    promptLength?: number;
    responseTime?: number;
}

// In-memory feedback store (persisted to globalState)
let feedbackLog: FeedbackEntry[] = [];
let extensionContext: vscode.ExtensionContext;

/**
 * Initialize feedback system
 */
export function initFeedback(context: vscode.ExtensionContext) {
    extensionContext = context;
    feedbackLog = context.globalState.get<FeedbackEntry[]>('simpllm.feedback', []);
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Record explicit feedback (thumbs up/down)
 */
export async function recordFeedback(
    requestId: string,
    selectedModel: string,
    taskType: string,
    rating: 'positive' | 'negative',
    promptLength?: number,
    responseTime?: number
) {
    const entry: FeedbackEntry = {
        timestamp: new Date().toISOString(),
        requestId,
        selectedModel,
        taskType,
        rating,
        promptLength,
        responseTime
    };

    feedbackLog.push(entry);
    await persistFeedback();

    // Optionally POST to admin endpoint
    await sendToEndpoint(entry);
}

/**
 * Record implicit feedback (model override)
 */
export async function recordOverride(
    requestId: string,
    originalModel: string,
    overriddenTo: string,
    taskType: string
) {
    const entry: FeedbackEntry = {
        timestamp: new Date().toISOString(),
        requestId,
        selectedModel: originalModel,
        taskType,
        rating: 'override',
        overriddenTo
    };

    feedbackLog.push(entry);
    await persistFeedback();
    await sendToEndpoint(entry);
}

/**
 * Persist to globalState
 */
async function persistFeedback() {
    // Keep last 1000 entries
    if (feedbackLog.length > 1000) {
        feedbackLog = feedbackLog.slice(-1000);
    }
    await extensionContext.globalState.update('simpllm.feedback', feedbackLog);
}

/**
 * Send feedback to configured endpoint (if set)
 */
async function sendToEndpoint(entry: FeedbackEntry) {
    const config = vscode.workspace.getConfiguration('simpllm');
    const endpoint = config.get<string>('feedbackEndpoint', '');

    if (!endpoint) return;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...entry,
                teamId: config.get<string>('teamId', ''),
                departmentId: config.get<string>('departmentId', '')
            })
        });
        if (!response.ok) {
            console.warn(`SimpLLM feedback endpoint returned ${response.status}`);
        }
    } catch {
        // Silently fail - feedback is optional
    }
}

/**
 * Get feedback statistics
 */
export function getFeedbackStats(): {
    total: number;
    positive: number;
    negative: number;
    overrides: number;
    byModel: Record<string, { positive: number; negative: number; overrides: number }>;
    byTask: Record<string, { positive: number; negative: number }>;
} {
    const stats = {
        total: feedbackLog.length,
        positive: 0,
        negative: 0,
        overrides: 0,
        byModel: {} as Record<string, { positive: number; negative: number; overrides: number }>,
        byTask: {} as Record<string, { positive: number; negative: number }>
    };

    for (const entry of feedbackLog) {
        if (entry.rating === 'positive') stats.positive++;
        else if (entry.rating === 'negative') stats.negative++;
        else stats.overrides++;

        // By model
        if (!stats.byModel[entry.selectedModel]) {
            stats.byModel[entry.selectedModel] = { positive: 0, negative: 0, overrides: 0 };
        }
        stats.byModel[entry.selectedModel][entry.rating === 'override' ? 'overrides' : entry.rating]++;

        // By task
        if (!stats.byTask[entry.taskType]) {
            stats.byTask[entry.taskType] = { positive: 0, negative: 0 };
        }
        if (entry.rating !== 'override') {
            stats.byTask[entry.taskType][entry.rating]++;
        }
    }

    return stats;
}

/**
 * Get all feedback entries (for admin panel)
 */
export function getFeedbackLog(): FeedbackEntry[] {
    return [...feedbackLog];
}

/**
 * Clear all feedback data
 */
export async function clearFeedback() {
    feedbackLog = [];
    await extensionContext.globalState.update('simpllm.feedback', []);
}

/**
 * Show feedback buttons in chat response
 */
export function showFeedbackButtons(
    stream: vscode.ChatResponseStream,
    requestId: string,
    modelName: string,
    taskType: string
) {
    // Use chat response follow-ups for feedback
    stream.markdown('\n\n---\n');
    stream.button({
        command: 'simpllm.feedbackPositive',
        title: '👍',
        arguments: [requestId, modelName, taskType]
    });
    stream.button({
        command: 'simpllm.feedbackNegative',
        title: '👎',
        arguments: [requestId, modelName, taskType]
    });
}
