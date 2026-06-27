/**
 * Seed script: Populate ticket #338 with 20 alternating AGENT/CUSTOMER replies
 * Each reply is at least 10 lines to simulate a realistic long conversation.
 *
 * Usage: bun run seed-ticket-338.ts
 */

import { prisma } from "./lib/db";
import { SenderType } from "./generated/prisma/enums";

const TICKET_ID = 338;

// 20 alternating messages: even index = AGENT, odd index = CUSTOMER
const conversationScript: { senderType: SenderType; body: string }[] = [
  {
    senderType: SenderType.AGENT,
    body: `Hello,

Thank you for reaching out to our support team. We have received your ticket and I am looking into the issue right away.

Before I dig deeper into the logs, could you confirm which version of the application you are currently using?
This information will help us narrow down the root cause much faster.

In the meantime, I have escalated this ticket to our technical team so they are aware.
Rest assured that we treat this as a high-priority issue and will keep you updated throughout the process.

If you experience any further symptoms or errors, please do not hesitate to reply to this thread with screenshots or error messages.

We appreciate your patience and will get back to you as soon as possible.

Best regards,
Support Team`,
  },
  {
    senderType: SenderType.CUSTOMER,
    body: `Hi,

Thank you for getting back to me so quickly. I really appreciate the prompt response.

I am currently running version 3.2.1 of the application, which I updated just last week.
The issue started appearing almost immediately after the update was applied.

Here is a brief summary of what I am experiencing:
- The dashboard fails to load on initial login.
- An error appears in the browser console saying "NetworkError: Failed to fetch."
- Refreshing the page sometimes resolves it, but not consistently.
- The issue only seems to affect users on our Mumbai office network.

I have already cleared the browser cache and tried multiple browsers including Chrome and Firefox.
None of these steps resolved the problem.

Please let me know if you need any additional details or logs from our end.

Looking forward to your reply.

Best regards,
Rajesh Verma`,
  },
  {
    senderType: SenderType.AGENT,
    body: `Hello Rajesh,

Thank you for the detailed description — this is very helpful and narrows things down considerably.

Based on your description, it sounds like this could be a network-level issue specific to the Mumbai office network.
The "NetworkError: Failed to fetch" error typically indicates that API requests from the client are being blocked or rejected.

Here are a few things I would like you to try:
1. Test accessing the dashboard while connected to a VPN or mobile hotspot.
2. Check if your office firewall or proxy is blocking requests to our API domain (api.example.com).
3. Run a traceroute to api.example.com from the affected machine and share the output with us.
4. Check the "Network" tab in browser DevTools and look for any 403 or 502 HTTP responses.

If the dashboard loads fine over a hotspot, it is almost certainly a firewall or proxy configuration in your office.
I will also check our server logs on our side to see if any requests from your IP range are being rejected.

Please share what you find at your earliest convenience.

Best,
Agent`,
  },
  {
    senderType: SenderType.CUSTOMER,
    body: `Hi,

I followed your instructions and here are the results:

1. VPN Test: The dashboard loaded perfectly when connected to our company VPN.
2. Hotspot Test: I connected to my mobile hotspot and the dashboard also loaded without any issues.
3. Traceroute: I ran the traceroute and there are a few hops that seem to time out around hop 12-14.
4. DevTools: I can see several requests returning 502 Bad Gateway.

So it does seem like the issue is isolated to our office network when not on VPN.
I have forwarded this information to our network admin, Priya Sharma, who oversees our office firewall.

She believes there may be a new firewall rule that was added last Tuesday — the same day the issues began.
She is reviewing the firewall logs now.

Is there anything from your side that changed on that date that might have triggered this?
For example, a new API endpoint, a change in the server's IP address, or SSL certificate renewal?

Any additional context from your team would help Priya identify the rule causing the block.

Best regards,
Rajesh`,
  },
  {
    senderType: SenderType.AGENT,
    body: `Hello Rajesh,

Excellent detective work! You and Priya have identified the likely culprit very efficiently.

I have looked into our deployment history and I can confirm the following changes occurred on Tuesday:
- We migrated our API servers to a new IP range: 203.0.113.0/24 (previously 198.51.100.0/24).
- We also updated our SSL certificate as part of routine maintenance.
- We deployed a new CDN configuration for static assets.

The most likely cause of the 502 errors is that your firewall is blocking the new IP range.
Please ask Priya to whitelist the following IP addresses on your firewall:
  - 203.0.113.10 (Primary API server)
  - 203.0.113.11 (Secondary/failover API server)
  - 203.0.113.50 (CDN edge node)

Additionally, please ensure that HTTPS traffic on port 443 is allowed to *.example.com.
If Priya needs an official letter or IP allowlist documentation for compliance purposes, please let me know.

I will remain available to assist your network team through this process.

Best regards,
Support Team`,
  },
  {
    senderType: SenderType.CUSTOMER,
    body: `Hi,

This is very useful, thank you for digging into the history.

I have shared the new IP ranges with Priya and she has updated the firewall allowlist accordingly.
She has whitelisted all three IP addresses you mentioned: 203.0.113.10, 203.0.113.11, and 203.0.113.50.

However, we are still seeing intermittent failures even after the firewall change.
Approximately 30% of page loads still fail on first attempt, though a page refresh usually resolves it.

Here are some additional observations:
- The failures tend to occur during morning hours between 9 AM and 11 AM IST.
- During off-peak hours, the dashboard loads consistently without any issues.
- Multiple users across different floors are affected, so it does not seem to be a single machine problem.

Could there be a load balancer issue on your end, or perhaps a CDN caching problem?
I am wondering if the CDN is serving stale content that references the old IP addresses.

Please advise on the next steps.

Thank you,
Rajesh`,
  },
  {
    senderType: SenderType.AGENT,
    body: `Hello Rajesh,

Thank you for the continued follow-up — this level of detail is exactly what we need.

The intermittent failures during 9–11 AM IST are a very interesting pattern.
This time window corresponds to approximately 03:30–05:30 AM UTC, which is when our automated maintenance jobs run.

I have identified two possible causes:
1. CDN Cache Purge Jobs: Our CDN runs cache purge operations in that window which can cause brief latency spikes.
2. Database Replica Sync: We sync read replicas during low-traffic windows globally, which can cause momentary timeouts.

Here is what I am doing on our end:
- I have flagged this issue to our infrastructure team to review the CDN purge schedule.
- I am requesting that our read replica sync be moved to a different time window.
- I am enabling enhanced logging on your account to capture any API timeouts during those hours.

In the meantime, please try the following on your client side:
- Enable retry logic in your browser or API client (we recommend 3 retries with a 2-second backoff).
- Temporarily disable aggressive browser caching for our domain during testing.

I will update you once the infrastructure team has reviewed and made any changes.

Best regards,
Support Team`,
  },
  {
    senderType: SenderType.CUSTOMER,
    body: `Hi,

Thank you for the thorough investigation. It is reassuring to know that this is being escalated to the infrastructure team.

Regarding the retry logic — we are using a React frontend that fetches data on page load.
I have asked our developer, Amit, to add a retry mechanism using Axios retry interceptors.
He has set up 3 retries with exponential backoff starting at 1 second.

Since enabling the retries, the user experience has improved noticeably.
Users are no longer seeing hard failures; instead they see a brief loading spinner before the page loads.
This is acceptable for now, but we would still prefer a permanent fix on your end.

A few additional questions:
1. Can we get a status page URL where we can monitor your infrastructure health?
2. Is there a webhook we can subscribe to for maintenance notifications?
3. Can you provide a dedicated SLA contact for future critical issues given we are an enterprise client?

We look forward to a long-term resolution and appreciate the proactive communication so far.

Best,
Rajesh & Team`,
  },
  {
    senderType: SenderType.AGENT,
    body: `Hello Rajesh,

I am glad the retry logic has helped — Amit did exactly the right thing there.

To answer your three questions:

1. Status Page: Our real-time status page is available at https://status.example.com.
   You can subscribe to email or Slack notifications for any service degradation events.

2. Maintenance Webhooks: Yes, we offer webhook notifications for scheduled maintenance.
   Please contact your account manager to get this configured for your workspace.
   Alternatively, I can set this up directly if you provide a webhook endpoint URL.

3. Enterprise SLA Contact: Based on your contract tier, you are eligible for a dedicated Technical Account Manager (TAM).
   I have raised a request with our account management team.
   Someone from that team will reach out to you within 2 business days to set up an SLA call.

On the infrastructure side, I have great news:
Our team has identified the CDN purge window as the primary culprit and has rescheduled it to 1:00 AM UTC.
This change went live this morning and should eliminate the morning-hour failures you were experiencing.

Please monitor the application over the next 48 hours and let us know if the issue persists.

Best regards,
Support Team`,
  },
  {
    senderType: SenderType.CUSTOMER,
    body: `Hi,

Fantastic news regarding the CDN purge schedule change! We monitored the application closely over the past two days.

Here is our observation report:
- Day 1 (post-change): Zero failures during 9–11 AM IST window. Perfect uptime.
- Day 2 (post-change): One minor hiccup at 9:47 AM that resolved on its own within seconds. No user-visible impact.
- Overall error rate: Dropped from approximately 30% to under 0.5%.

The improvement is dramatic and we are very pleased with the resolution.

I have also subscribed to the status page and will be setting up the webhook once our developer Amit returns from leave next week.
Regarding the TAM contact, we have not heard back yet — could you please follow up with the account management team?

Also, one unrelated question: We are planning to integrate your API with our internal ERP system.
Could you point us to documentation on OAuth2 authentication for server-to-server API calls?
If there is a sandbox environment available, that would be ideal for testing.

Thank you again for everything.

Best,
Rajesh`,
  },
  {
    senderType: SenderType.AGENT,
    body: `Hello Rajesh,

This is wonderful news! A drop from 30% to under 0.5% error rate is a massive improvement.
Thank you for the detailed monitoring report — it is incredibly helpful for our postmortem documentation.

I have followed up with the account management team regarding your TAM request.
I received confirmation that your dedicated TAM, Anjali Singh, will be reaching out to you by end of day tomorrow.
She will also be setting up your first quarterly business review call.

Regarding OAuth2 for server-to-server API integration:
- Documentation: https://docs.example.com/api/authentication/oauth2
- Specifically the "Client Credentials Flow" section applies to server-to-server use cases.
- Sandbox environment: Available at https://sandbox.example.com — request access through your account settings.
- Rate limits in sandbox are set to 100 requests/minute, which should be sufficient for ERP integration testing.

For the ERP integration specifically, I would recommend:
1. Start with the OAuth2 client credentials flow to obtain a bearer token.
2. Use the token for all subsequent API calls with Authorization: Bearer <token> header.
3. Implement token refresh logic since tokens expire every 3600 seconds.

Please let me know if you need a code sample in any specific language (Python, Node.js, Java, etc.).

Best regards,
Support Team`,
  },
  {
    senderType: SenderType.CUSTOMER,
    body: `Hi,

Thank you for connecting us with Anjali — we look forward to speaking with her tomorrow.

Regarding the OAuth2 documentation, I have passed it along to Amit who will handle the integration.
He has one specific question: Does your API support the PKCE extension for added security on the client credentials flow?
He also wants to know if you support refresh token rotation.

In the meantime, I have another issue to report that is somewhat separate from the original ticket.
Our users are experiencing intermittent 401 Unauthorized errors when accessing the reports module.
The errors happen randomly, approximately once every 2–3 hours per session.

Steps to reproduce:
1. Log in to the application normally.
2. Navigate to the Reports module.
3. Leave the browser tab open for 2–3 hours without any interaction.
4. Return to the tab and attempt to generate a report.
5. Observe 401 error in the console.

This suggests a session timeout issue. Our session tokens may be expiring silently.
Could this be related to the token expiry you mentioned (3600 seconds)?

Please advise.

Best,
Rajesh`,
  },
  {
    senderType: SenderType.AGENT,
    body: `Hello Rajesh,

To answer Amit's questions on OAuth2:
1. PKCE: We support PKCE for public clients (browser-based apps) but it is not required for server-to-server client credentials flow since the client secret is kept server-side.
2. Refresh Token Rotation: Yes, we implement refresh token rotation with a 30-day sliding window. Each time a refresh token is used, a new one is issued and the old one is immediately invalidated.

Regarding the 401 Unauthorized errors in the Reports module — this is a known issue we are actively working on.
Root cause: Our access tokens expire after 3600 seconds (1 hour), and the frontend does not currently trigger an automatic refresh when a token expires silently in an inactive tab.

This is a bug in our session management middleware and is tracked internally as BUG-4821.
Expected fix: We have a patch scheduled for release in version 3.2.3, which is targeting next Wednesday.

Immediate workaround options:
1. Set the session idle timeout in your browser to refresh the page after 50 minutes.
2. We can increase your account's token TTL to 12 hours as a temporary measure — please confirm if you would like this.
3. Implement periodic heartbeat requests every 30 minutes to keep the session alive.

I apologize for the inconvenience this is causing your team.

Best regards,
Support Team`,
  },
  {
    senderType: SenderType.CUSTOMER,
    body: `Hi,

Thank you for the transparent explanation about BUG-4821. It is reassuring to know there is a fix on the way.

Yes, please go ahead and increase our account's token TTL to 12 hours as the temporary measure.
This will significantly reduce disruption for our users who frequently leave reports open for extended periods.

Regarding version 3.2.3 — we will wait for the release notes before upgrading this time, given our past experience.
Could you notify us directly when 3.2.3 is released and provide a changelog specific to authentication and session management?

On a separate note, I wanted to share some positive feedback:
Our team has been impressed by the quality and speed of support throughout this ticket.
In particular, the proactive communication and the level of technical detail provided has been exceptional.

We plan to mention this in our upcoming vendor review meeting scheduled for next month.
It would be great if you could share the name of the support engineer handling this ticket so we can credit them specifically.

Also, our TAM call with Anjali went very well! We have scheduled monthly check-ins going forward.

Best,
Rajesh`,
  },
  {
    senderType: SenderType.AGENT,
    body: `Hello Rajesh,

I have updated your account's session token TTL to 12 hours. The change is live immediately — no logout/login required for new sessions, though existing sessions will still use the old TTL.

You will be among the first notified when version 3.2.3 is released. I have added you to our release notification list.
I will also personally compile a changelog summary focusing on authentication and session management changes and send it to you directly.

Thank you so much for the kind words — it truly means a lot to the team.
The engineer who has been handling your ticket is myself, Arjun Mehta.
I am a Senior Support Engineer here with a focus on enterprise accounts and API integrations.

I am genuinely glad we were able to resolve the initial network issue and several additional problems along the way.
This is exactly the kind of productive partnership we aim to have with our enterprise clients.

A few housekeeping items:
1. I am going to formally mark the original network issue in this ticket as RESOLVED.
2. The session token issue (BUG-4821) will be tracked separately and linked to this ticket for reference.
3. Your TAM Anjali will take over as the primary contact for ongoing items once she is fully briefed.

Please feel free to reply to this ticket anytime if you have further questions.

Best regards,
Arjun Mehta
Senior Support Engineer`,
  },
  {
    senderType: SenderType.CUSTOMER,
    body: `Hi Arjun,

Thank you for the personal introduction — it is wonderful to put a name to the support we have received.
We will absolutely mention you by name in the vendor review.

Just to confirm, we tested the extended 12-hour token TTL today and it is working perfectly.
No more 401 errors appeared during a 4-hour test session in the Reports module.
This has already made a noticeable difference for our finance team who run long reports.

One last item from this ticket before we consider the primary issue closed:
Our developer Amit successfully set up the OAuth2 client credentials flow in our sandbox environment.
He was able to authenticate and pull data from our ERP to your API seamlessly.

The integration is working well in sandbox. We plan to promote it to production next sprint (in approximately 2 weeks).
Could you confirm if there are any rate limits in production that differ from sandbox?
Specifically, we expect around 200 API calls per minute during our daily batch sync window.

Once Amit confirms the production integration, we will be ready to fully close this ticket.

Thank you again for everything, Arjun.

Best,
Rajesh`,
  },
  {
    senderType: SenderType.AGENT,
    body: `Hello Rajesh,

Wonderful to hear the OAuth2 sandbox integration is working — Amit has done excellent work there.

Regarding production rate limits:
- Sandbox rate limit: 100 requests/minute.
- Production rate limit (Standard Enterprise tier): 500 requests/minute.
- Your specific account tier: Premium Enterprise — this gives you 1,000 requests/minute.
- Burst allowance: Up to 2,000 requests/minute for up to 30 seconds.

So 200 requests/minute for your daily batch sync is well within your allocated quota.
There should be no issues promoting the integration to production.

Best practices for the batch sync:
1. Implement request queuing so you do not spike all 200 requests simultaneously.
2. Use the X-RateLimit-Remaining and X-RateLimit-Reset headers in our API responses to self-throttle.
3. Consider running the batch sync during off-peak hours (e.g., 2 AM IST) to avoid any competing traffic.
4. Set up alerting if the rate limit header drops below 100 remaining requests.

I am also sending you our API best practices guide separately by email.
Once the production integration is confirmed by Amit, please do reply here so I can formally mark the full ticket as CLOSED.

Very exciting to see this all come together!

Best,
Arjun`,
  },
  {
    senderType: SenderType.CUSTOMER,
    body: `Hi Arjun,

This is excellent news — the premium rate limits are more than sufficient for our needs.

I have forwarded your best practices guide to Amit. He has already implemented request queuing using a BullMQ queue.
The batch sync is now scheduled for 2:00 AM IST as you suggested, and it runs in batches of 50 with a 200ms delay between each batch.

We performed a full dry run in staging yesterday and here are the results:
- Total API calls: 1,847 over a 12-minute window.
- Average response time: 142ms.
- Error rate: 0.02% (mostly transient network timeouts that retried successfully).
- Peak rate: 178 requests/minute (well within limits).

We are very confident in proceeding to production.
The go-live is scheduled for this coming Saturday at 2 AM IST.
I will have Amit monitor the integration closely for the first week.

Is there anything you recommend we do on the support side before go-live?
For example, should we notify your infrastructure team so they are aware of the expected load spike?

Once the production go-live is confirmed successful, we will formally close this ticket.

Best,
Rajesh`,
  },
  {
    senderType: SenderType.AGENT,
    body: `Hello Rajesh,

Those staging results are outstanding — 142ms average response time and 0.02% error rate is excellent.
Amit's queue implementation sounds very well thought out.

For the production go-live on Saturday, here is what I recommend:

Pre-Go-Live Checklist:
1. Notify our infrastructure team (I will do this on your behalf — no action needed from your side).
2. Ensure your monitoring and alerting are set up in production (Datadog, CloudWatch, etc.).
3. Test your rollback plan — if the integration fails, how quickly can you disable it without impacting users?
4. Ensure the OAuth2 client credentials in production are different from sandbox (do not reuse sandbox tokens).
5. Double-check that the production API base URL is https://api.example.com (not sandbox.example.com).

Post-Go-Live Monitoring (first 24 hours):
- Monitor X-RateLimit-Remaining headers closely.
- Watch for any spike in 5xx errors in your API client logs.
- Set up a Slack or PagerDuty alert if the error rate exceeds 1%.

I have formally notified our infrastructure team about your go-live window.
They will have an engineer on standby during the Saturday maintenance window just in case.

Best of luck on Saturday! I have every confidence it will go smoothly.

Warm regards,
Arjun`,
  },
  {
    senderType: SenderType.CUSTOMER,
    body: `Hi Arjun,

I am happy to report that the production go-live on Saturday was a complete success!

Here is our production go-live report:
- Integration started at: 2:00:03 AM IST.
- First successful API call at: 2:00:04 AM IST (1-second startup).
- Total API calls during first sync: 2,104.
- Average response time in production: 128ms (even better than staging!).
- Error rate: 0.009% — effectively zero.
- Completion time: 11 minutes and 47 seconds for full sync.
- All ERP data successfully reflected in your system within 15 minutes.

Our finance and operations teams are thrilled.
This integration will save approximately 4 hours of manual data entry work per day.

On behalf of our entire team, I want to express our deepest gratitude for the exceptional support throughout this entire journey.
What started as a frustrating network issue became an opportunity to dramatically improve our integration and infrastructure.

Arjun, you have been a stellar support engineer. We hope to work with you again.

This ticket can now be formally marked as CLOSED. Thank you for everything.

With appreciation,
Rajesh Verma
Head of Technology, Mumbai Office`,
  },
];

async function main() {
  console.log(`🌱 Starting seed for ticket #${TICKET_ID}...`);

  // 1. Verify ticket exists
  const ticket = await prisma.ticket.findUnique({ where: { id: TICKET_ID } });
  if (!ticket) {
    console.error(`❌ Ticket #${TICKET_ID} does not exist. Please check the ticket ID.`);
    process.exit(1);
  }
  console.log(`✅ Found ticket: "${ticket.title}"`);

  // 2. Get agent user (Admin)
  const agentUser = await prisma.user.findUnique({ where: { email: "admin@example.com" } });
  if (!agentUser) {
    console.error("❌ Agent user (admin@example.com) not found. Run the main seed first.");
    process.exit(1);
  }
  console.log(`✅ Agent user: ${agentUser.name} (${agentUser.email})`);

  // 3. Get or create customer user
  let customerUser = await prisma.user.findUnique({ where: { email: "customer@example.com" } });
  if (!customerUser) {
    customerUser = await prisma.user.create({
      data: {
        email: "customer@example.com",
        emailVerified: true,
        name: "Rajesh Verma",
        role: "AGENT", // role enum only has AGENT/ADMIN, use AGENT for customer
      },
    });
    console.log(`✅ Created customer user: ${customerUser.name}`);
  } else {
    console.log(`✅ Found existing customer user: ${customerUser.name} (${customerUser.email})`);
  }

  // 4. Delete existing replies for this ticket (clean slate)
  const deleted = await prisma.reply.deleteMany({ where: { ticketId: TICKET_ID } });
  console.log(`🗑️  Removed ${deleted.count} existing replies from ticket #${TICKET_ID}.`);

  // 5. Insert the 20 replies with staggered timestamps
  const BASE_TIME = Date.now() - 1000 * 60 * 60 * 48; // start 48 hours ago
  const INTERVAL_MS = 1000 * 60 * 90; // 90-minute gaps between replies

  for (let i = 0; i < conversationScript.length; i++) {
    const { senderType, body } = conversationScript[i];
    const userId = senderType === SenderType.AGENT ? agentUser.id : customerUser.id;
    const createdAt = new Date(BASE_TIME + i * INTERVAL_MS);
    const bodyhtml = body
      .split("\n")
      .map((line) => (line.trim() === "" ? "<br>" : `<p>${line}</p>`))
      .join("\n");

    await prisma.reply.create({
      data: {
        ticketId: TICKET_ID,
        userId,
        body,
        bodyhtml,
        senderType,
        createdAt,
        updatedAt: createdAt,
      },
    });

    console.log(`  [${i + 1}/20] ${senderType} reply created (${createdAt.toISOString()})`);
  }

  console.log(`\n🎉 Successfully seeded 20 replies for ticket #${TICKET_ID}!`);
  console.log(`   Conversation spans from ${new Date(BASE_TIME).toISOString()} to ${new Date(BASE_TIME + 19 * INTERVAL_MS).toISOString()}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
