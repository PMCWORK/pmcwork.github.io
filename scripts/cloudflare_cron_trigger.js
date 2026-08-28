/**
 * Cloudflare Worker: 100% On-Time Daily Summary Cron Dispatcher
 * 
 * Purpose:
 * Cloudflare Workers run on Cloudflare edge network with 0 millisecond queue delays.
 * When scheduled at 17:00 UTC (11:00:00 PM Dhaka Time), it calls GitHub Actions workflow_dispatch API.
 * GitHub Actions starts within 3-5 seconds with zero cron queue congestion!
 * 
 * Setup in Cloudflare Dashboard (Takes 2 minutes):
 * 1. Go to https://dash.cloudflare.com/ -> Workers & Pages -> Create Application -> Create Worker.
 * 2. Name: pmc-daily-cron-trigger -> Deploy.
 * 3. Click Edit code, paste this entire file, and click Deploy.
 * 4. Under Worker Settings -> Variables -> Environment Variables, add:
 *    - GITHUB_TOKEN : <Your GitHub Fine-Grained or Personal Access Token with actions:write scope>
 * 5. Under Worker Settings -> Triggers -> Cron Triggers -> Add Cron Trigger:
 *    - Cron: 0 17 * * * (Every day at 17:00 UTC = 11:00 PM Dhaka Time)
 */

export default {
  async scheduled(event, env, ctx) {
    console.log('[Cloudflare Cron] Firing precision trigger for PMC Daily Summary...');
    return await triggerGitHubWorkflow(env);
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/trigger' || url.pathname === '/') {
      const result = await triggerGitHubWorkflow(env);
      return new Response(JSON.stringify(result, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response('PMC Cloudflare Cron Dispatcher Active', { status: 200 });
  }
};

async function triggerGitHubWorkflow(env) {
  const repoOwner = 'PMCWORK';
  const repoName = 'pmcwork.github.io';
  const workflowFileName = 'daily_report.yml';
  const githubToken = env.GITHUB_TOKEN;

  if (!githubToken) {
    console.error('Missing GITHUB_TOKEN environment variable in Cloudflare Worker.');
    return { success: false, error: 'Missing GITHUB_TOKEN' };
  }

  const endpoint = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/${workflowFileName}/dispatches`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${githubToken}`,
        'User-Agent': 'PMC-Cloudflare-Precision-Trigger',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ref: 'main' })
    });

    if (response.status === 204 || response.ok) {
      console.log('? Successfully dispatched GitHub Actions daily report workflow!');
      return { success: true, timestamp: new Date().toISOString(), status: response.status };
    } else {
      const errText = await response.text();
      console.error(`? GitHub API dispatch failed (${response.status}):`, errText);
      return { success: false, status: response.status, error: errText };
    }
  } catch (err) {
    console.error('? Network error calling GitHub API:', err);
    return { success: false, error: err.message };
  }
}
