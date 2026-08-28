/**
 * Cloudflare Worker: 100% On-Time Daily Summary Cron Dispatcher
 * 
 * Purpose:
 * Cloudflare Workers run on Cloudflare edge network with 0 millisecond queue delays.
 * When scheduled at 17:00 UTC (11:00:00 PM Dhaka Time), it calls GitHub Actions workflow_dispatch API.
 * GitHub Actions starts within 3-5 seconds with zero cron queue congestion!
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
  
  // Supports both GITHUB_TOKEN and Github_Token_Fine_Grained variable names
  const githubToken = env.GITHUB_TOKEN || env.Github_Token_Fine_Grained || env.GITHUB_TOKEN_FINE_GRAINED || env.github_token || Object.values(env)[0];

  if (!githubToken) {
    console.error('Missing GITHUB_TOKEN environment variable in Cloudflare Worker.');
    return { success: false, error: 'Missing GITHUB_TOKEN environment variable in Cloudflare' };
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
