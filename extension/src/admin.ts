/**
 * SimpLLM Admin Panel
 * Webview-based dashboard for managing routing, feedback, and analytics
 */
import * as vscode from 'vscode';
import { MODELS, getModel, TaskType, DEFAULT_TASK_ROUTING } from './models.js';
import { getFeedbackStats, getFeedbackLog, FeedbackEntry } from './feedback.js';

/**
 * Open admin panel
 */
export function openAdminPanel(
  context: vscode.ExtensionContext,
  sessionStats: {
    requestCount: number;
    tokenCount: { input: number; output: number };
    creditsByModel: Record<string, number>;
    taskTypes: Record<string, number>;
    totalCreditsUsed: number;
  }
) {
  const panel = vscode.window.createWebviewPanel(
    'simpllmAdmin',
    'SimpLLM Admin',
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  const feedbackStats = getFeedbackStats();
  const feedbackLog = getFeedbackLog();
  const config = vscode.workspace.getConfiguration('simpllm');
  const taskRouting = config.get<Record<string, string>>('taskRouting', {});

  panel.webview.html = getAdminHTML(sessionStats, feedbackStats, feedbackLog, taskRouting);

  // Handle messages from webview
  panel.webview.onDidReceiveMessage(async (message) => {
    switch (message.type) {
      case 'saveRouting':
        await config.update('taskRouting', message.routing, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('SimpLLM: Routing rules saved');
        break;
      case 'saveSettings':
        for (const [key, value] of Object.entries(message.settings)) {
          await config.update(key, value, vscode.ConfigurationTarget.Global);
        }
        vscode.window.showInformationMessage('SimpLLM: Settings saved');
        break;
    }
  }, undefined, context.subscriptions);
}

function getAdminHTML(
  sessionStats: any,
  feedbackStats: any,
  feedbackLog: FeedbackEntry[],
  taskRouting: Record<string, string>
): string {
  const totalCredits = Object.values(sessionStats.creditsByModel as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
  const satisfactionRate = feedbackStats.total > 0
    ? ((feedbackStats.positive / (feedbackStats.positive + feedbackStats.negative || 1)) * 100).toFixed(0)
    : 'N/A';

  const modelOptions = MODELS.map(m =>
    `<option value="${m.id}">${m.name} (${m.creditMultiplier}x)</option>`
  ).join('');

  const taskTypes: TaskType[] = [
    'autocomplete', 'simple', 'function', 'algorithm', 'test', 'debug',
    'refactor', 'architecture', 'security', 'documentation', 'conversion', 'review', 'long-context'
  ];

  const routingRows = taskTypes.map(t => {
    const current = taskRouting[t] || DEFAULT_TASK_ROUTING[t];
    const currentModel = getModel(current);
    return `
      <tr>
        <td>${t}</td>
        <td>${currentModel?.name || current}</td>
        <td>
          <select data-task="${t}" class="routing-select">
            <option value="">Default</option>
            ${MODELS.map(m =>
      `<option value="${m.id}" ${current === m.id ? 'selected' : ''}>${m.name} (${m.creditMultiplier}x)</option>`
    ).join('')}
          </select>
        </td>
      </tr>
    `;
  }).join('');

  const recentFeedback = feedbackLog.slice(-20).reverse().map(f => {
    const icon = f.rating === 'positive' ? '👍' : f.rating === 'negative' ? '👎' : '🔄';
    const model = getModel(f.selectedModel);
    return `
      <tr>
        <td>${icon}</td>
        <td>${model?.name || f.selectedModel}</td>
        <td>${f.taskType}</td>
        <td>${f.overriddenTo ? `→ ${getModel(f.overriddenTo)?.name || f.overriddenTo}` : '-'}</td>
        <td>${new Date(f.timestamp).toLocaleString()}</td>
      </tr>
    `;
  }).join('');

  const modelUsageRows = Object.entries(sessionStats.creditsByModel as Record<string, number>)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .map(([id, credits]) => {
      const model = getModel(id);
      const fb = feedbackStats.byModel[id];
      return `
        <tr>
          <td>${model?.name || id}</td>
          <td>${(credits as number).toFixed(1)}x</td>
          <td>${fb ? fb.positive : 0}</td>
          <td>${fb ? fb.negative : 0}</td>
          <td>${fb ? fb.overrides : 0}</td>
        </tr>
      `;
    }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #0d1117; color: #c9d1d9; padding: 0;
  }
  .header {
    background: linear-gradient(135deg, #161b22 0%, #0d1117 100%);
    border-bottom: 1px solid #30363d;
    padding: 24px 32px;
    display: flex; align-items: center; gap: 12px;
  }
  .header h1 { font-size: 20px; font-weight: 600; }
  .header .badge {
    background: #238636; color: #fff; padding: 2px 8px;
    border-radius: 12px; font-size: 11px;
  }
  .tabs {
    display: flex; border-bottom: 1px solid #30363d;
    background: #161b22; padding: 0 32px;
  }
  .tab {
    padding: 12px 16px; cursor: pointer; border-bottom: 2px solid transparent;
    color: #8b949e; font-size: 13px; font-weight: 500;
  }
  .tab.active { color: #c9d1d9; border-bottom-color: #f78166; }
  .tab:hover { color: #c9d1d9; }
  .content { padding: 24px 32px; display: none; }
  .content.active { display: block; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .card {
    background: #161b22; border: 1px solid #30363d;
    border-radius: 8px; padding: 20px;
  }
  .card .label { font-size: 12px; color: #8b949e; text-transform: uppercase; letter-spacing: 0.5px; }
  .card .value { font-size: 28px; font-weight: 600; margin-top: 4px; }
  .card .value.green { color: #3fb950; }
  .card .value.blue { color: #58a6ff; }
  .card .value.orange { color: #d29922; }
  .card .value.red { color: #f85149; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 10px 12px; font-size: 12px; color: #8b949e; border-bottom: 1px solid #30363d; font-weight: 500; }
  td { padding: 10px 12px; border-bottom: 1px solid #21262d; font-size: 13px; }
  tr:hover { background: #161b22; }
  select {
    background: #21262d; color: #c9d1d9; border: 1px solid #30363d;
    border-radius: 6px; padding: 6px 10px; font-size: 13px; width: 100%;
  }
  .btn {
    background: #238636; color: #fff; border: none; padding: 8px 16px;
    border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;
    margin-top: 12px;
  }
  .btn:hover { background: #2ea043; }
  .section-title { font-size: 16px; font-weight: 600; margin: 24px 0 12px; }
  .empty { color: #8b949e; text-align: center; padding: 40px; }
</style>
</head>
<body>
  <div class="header">
    <span style="font-size:24px">⚡</span>
    <h1>SimpLLM Admin</h1>
    <span class="badge">Enterprise</span>
  </div>

  <div class="tabs">
    <div class="tab active" data-tab="dashboard">Dashboard</div>
    <div class="tab" data-tab="feedback">Feedback</div>
    <div class="tab" data-tab="routing">Routing Rules</div>
    <div class="tab" data-tab="settings">Settings</div>
  </div>

  <!-- Dashboard -->
  <div class="content active" id="dashboard">
    <div class="grid">
      <div class="card">
        <div class="label">Requests</div>
        <div class="value blue">${sessionStats.requestCount}</div>
      </div>
      <div class="card">
        <div class="label">Credits Used</div>
        <div class="value orange">${totalCredits.toFixed(1)}x</div>
      </div>
      <div class="card">
        <div class="label">Budget</div>
        <div class="value ${sessionStats.totalCreditsUsed > 270 ? 'red' : sessionStats.totalCreditsUsed > 210 ? 'orange' : 'green'}">${((sessionStats.totalCreditsUsed / 300) * 100).toFixed(0)}%</div>
      </div>
      <div class="card">
        <div class="label">Satisfaction</div>
        <div class="value green">${satisfactionRate}%</div>
      </div>
      <div class="card">
        <div class="label">Overrides</div>
        <div class="value red">${feedbackStats.overrides}</div>
      </div>
    </div>

    <div class="section-title">Model Usage</div>
    <div class="card">
      <table>
        <tr><th>Model</th><th>Credits</th><th>👍</th><th>👎</th><th>🔄</th></tr>
        ${modelUsageRows || '<tr><td colspan="5" class="empty">No data yet</td></tr>'}
      </table>
    </div>
  </div>

  <!-- Feedback -->
  <div class="content" id="feedback">
    <div class="grid">
      <div class="card">
        <div class="label">Total Feedback</div>
        <div class="value blue">${feedbackStats.total}</div>
      </div>
      <div class="card">
        <div class="label">Positive</div>
        <div class="value green">${feedbackStats.positive}</div>
      </div>
      <div class="card">
        <div class="label">Negative</div>
        <div class="value red">${feedbackStats.negative}</div>
      </div>
    </div>

    <div class="section-title">Recent Feedback</div>
    <div class="card">
      <table>
        <tr><th>Rating</th><th>Model</th><th>Task</th><th>Override</th><th>Time</th></tr>
        ${recentFeedback || '<tr><td colspan="5" class="empty">No feedback yet</td></tr>'}
      </table>
    </div>
  </div>

  <!-- Routing Rules -->
  <div class="content" id="routing">
    <p style="color:#8b949e; margin-bottom:16px">Configure which model handles each task type. Changes apply to all users via managed settings.</p>
    <div class="card">
      <table>
        <tr><th>Task Type</th><th>Current</th><th>Override</th></tr>
        ${routingRows}
      </table>
      <button class="btn" id="saveRouting">Save Routing Rules</button>
    </div>
  </div>

  <!-- Settings -->
  <div class="content" id="settings">
    <div class="card" style="max-width:600px">
      <div class="section-title" style="margin-top:0">Classification</div>
      <p style="color:#8b949e;margin-bottom:12px;font-size:13px">The classifier model analyzes each prompt and routes it to the best task model. Choose a free model (0x credit) for zero-cost classification.</p>
      <table>
        <tr>
          <td>Classifier Model</td>
          <td>
            <select id="classifierModel">
              ${MODELS.filter(m => m.creditMultiplier === 0 || m.creditMultiplier === 0.33).map(m =>
    `<option value="${m.id}">${m.name} (${m.creditMultiplier}x)</option>`
  ).join('')}
            </select>
          </td>
        </tr>
      </table>

      <div class="section-title">Budget & Limits</div>
      <table>
        <tr>
          <td>Monthly Budget</td>
          <td>
            <input type="number" id="monthlyBudget" value="300" min="0"
              style="background:#21262d;color:#c9d1d9;border:1px solid #30363d;border-radius:6px;padding:6px 10px;width:100%;font-size:13px">
          </td>
        </tr>
        <tr>
          <td>Max Credit Tier</td>
          <td>
            <select id="maxCreditTier">
              <option value="free">Free (0x)</option>
              <option value="cheap">Cheap (0.33x)</option>
              <option value="standard">Standard (1x)</option>
              <option value="premium" selected>Premium (3x)</option>
            </select>
          </td>
        </tr>
      </table>

      <div class="section-title">Feedback & Analytics</div>
      <table>
        <tr>
          <td>Collect Feedback</td>
          <td>
            <select id="collectFeedback">
              <option value="true" selected>Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </td>
        </tr>
        <tr>
          <td>Feedback Endpoint</td>
          <td>
            <input type="text" id="feedbackEndpoint" placeholder="https://api.internal/feedback"
              style="background:#21262d;color:#c9d1d9;border:1px solid #30363d;border-radius:6px;padding:6px 10px;width:100%;font-size:13px">
          </td>
        </tr>
        <tr>
          <td>Team ID</td>
          <td>
            <input type="text" id="teamId" placeholder="engineering"
              style="background:#21262d;color:#c9d1d9;border:1px solid #30363d;border-radius:6px;padding:6px 10px;width:100%;font-size:13px">
          </td>
        </tr>
        <tr>
          <td>Department ID</td>
          <td>
            <input type="text" id="departmentId" placeholder="backend"
              style="background:#21262d;color:#c9d1d9;border:1px solid #30363d;border-radius:6px;padding:6px 10px;width:100%;font-size:13px">
          </td>
        </tr>
      </table>
      <button class="btn" id="saveSettings">Save Settings</button>
    </div>
  </div>

<script>
  const vscode = acquireVsCodeApi();

  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });

  // Save routing
  document.getElementById('saveRouting')?.addEventListener('click', () => {
    const routing = {};
    document.querySelectorAll('.routing-select').forEach(sel => {
      if (sel.value) routing[sel.dataset.task] = sel.value;
    });
    vscode.postMessage({ type: 'saveRouting', routing });
  });

  // Save settings
  document.getElementById('saveSettings')?.addEventListener('click', () => {
    vscode.postMessage({
      type: 'saveSettings',
      settings: {
        classifierModel: document.getElementById('classifierModel').value,
        monthlyBudget: parseInt(document.getElementById('monthlyBudget').value) || 300,
        maxCreditTier: document.getElementById('maxCreditTier').value,
        collectFeedback: document.getElementById('collectFeedback').value === 'true',
        feedbackEndpoint: document.getElementById('feedbackEndpoint').value,
        teamId: document.getElementById('teamId').value,
        departmentId: document.getElementById('departmentId').value
      }
    });
  });
</script>
</body>
</html>`;
}
