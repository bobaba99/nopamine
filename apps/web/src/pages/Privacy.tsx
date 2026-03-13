export default function Privacy() {
  return (
    <section className="route-content">
      <div className="section-header">
        <h1>Privacy Policy</h1>
        <p style={{ color: 'var(--ink-600)' }}>Last Updated: March 11, 2026</p>
      </div>

      <h2>Plain-language summary</h2>
      <p>
        We collect only what we need to provide the service. We do not sell your data.
        You can delete your account and data at any time.
      </p>

      <hr style={{ margin: '2rem 0', borderColor: 'var(--glass-border)' }} />

      <h2>Full Privacy Policy</h2>

      <h3>Data types collected</h3>
      <ul>
        <li><strong>Account information</strong> — name, email, credentials, subscription tier</li>
        <li><strong>Billing information</strong> — payment card details (tokenized via Stripe; we never store full card numbers)</li>
        <li><strong>Email and purchase data</strong> — email subject lines, sender info, receipt contents, and transaction amounts (if you connect email via OAuth)</li>
        <li><strong>Self-reported data</strong> — anxiety levels, satisfaction, neuroticism scores, mood tracking, and habit data you choose to provide</li>
        <li><strong>AI-generated insights</strong> — behavioural categorizations, spending pattern analysis, and trend data derived by AI models</li>
        <li><strong>Usage analytics</strong> — in-app actions, feature usage, session data, device info, and IP address</li>
      </ul>

      <h3>Legal basis for processing</h3>
      <ul>
        <li><strong>Contract performance</strong> — account information and core service data required to provide TruePick</li>
        <li><strong>Explicit consent</strong> — self-reported psychological data is collected on an opt-in basis; you may withdraw consent at any time</li>
        <li><strong>Legitimate interest</strong> — usage analytics for service improvement and security</li>
      </ul>

      <h3>Third-party processors</h3>
      <ul>
        <li><strong>Supabase</strong> — authentication and database hosting</li>
        <li><strong>OpenAI</strong> — AI analysis of purchase and behavioural data</li>
        <li><strong>Stripe</strong> — payment processing (PCI DSS compliant)</li>
        <li><strong>Vercel / Render</strong> — application hosting</li>
        <li><strong>Resend</strong> — email communications</li>
        <li><strong>PostHog</strong> — product analytics (consent required)</li>
        <li><strong>Google Analytics</strong> — web analytics (consent required)</li>
      </ul>
      <p>
        All sub-processors are bound by Data Processing Agreements (DPAs). Cross-border
        transfers to US-based providers are covered by Standard Contractual Clauses (SCCs).
      </p>

      <h3>Data retention periods</h3>
      <ul>
        <li><strong>Account and app data</strong> — retained while your account is active; permanently deleted within 30 days of account deletion</li>
        <li><strong>Email-derived purchase data</strong> — deleted within 30 days of disconnecting your email integration</li>
        <li><strong>Self-reported psychological data</strong> — deleted upon withdrawal of consent or account deletion</li>
        <li><strong>Authentication tokens</strong> — current session only</li>
        <li><strong>Analytics cookies (PostHog)</strong> — up to 1 year</li>
        <li><strong>Analytics cookies (Google Analytics)</strong> — up to 2 years</li>
        <li><strong>Cookie consent preference</strong> — 6 months</li>
        <li><strong>Local storage entries</strong> — until manually cleared by you</li>
      </ul>

      <h3>Your rights</h3>
      <ul>
        <li><strong>Access</strong> — request a copy of your data</li>
        <li><strong>Export</strong> — download your data in a portable format</li>
        <li><strong>Deletion</strong> — delete your account and all associated data</li>
        <li><strong>Objection</strong> — object to certain processing activities</li>
        <li><strong>Withdrawal of consent</strong> — withdraw consent for sensitive data processing at any time via account settings or by emailing us</li>
        <li><strong>Rectification</strong> — request correction of inaccurate data</li>
      </ul>
      <p>
        To exercise any of these rights, contact us
        at <a href="mailto:privacy@truepick.app">privacy@truepick.app</a>. We
        will respond within 30 days.
      </p>

      <h3>Cookie policy</h3>
      <p>
        TruePick uses cookies, local storage, and similar technologies. We classify
        these into three categories:
      </p>
      <h4>Strictly necessary (no consent required)</h4>
      <ul>
        <li><strong>Supabase Auth Token (JWT)</strong> — authenticates your identity and maintains your session</li>
        <li><strong>sb-*-auth-token</strong> — persists login state across page reloads (local storage)</li>
        <li><strong>outlook_code_verifier</strong> — temporary PKCE code verifier for Microsoft OAuth (deleted after use)</li>
      </ul>
      <h4>Analytics (consent required)</h4>
      <ul>
        <li><strong>PostHog (ph_phc_*, ph_*_posthog)</strong> — product analytics, session replay, feature flags. Duration: up to 1 year</li>
        <li><strong>Google Analytics (_ga, _ga_*)</strong> — aggregated usage statistics and traffic patterns. Duration: up to 2 years</li>
      </ul>
      <h4>Functional (consent required)</h4>
      <ul>
        <li><strong>tp:onboarding:&lt;userId&gt;</strong> — records onboarding completion (local storage)</li>
        <li><strong>tp:auth-debug</strong> — enables auth debug mode for troubleshooting (local storage)</li>
      </ul>
      <p>
        You can manage cookie preferences via the consent banner shown on first visit,
        or through your account settings at any time. You may also control cookies
        through your browser settings. Blocking strictly necessary cookies may impair
        the ability to log in.
      </p>

      <h3>CCPA disclosures</h3>
      <p>
        If you are a California resident, you have additional rights under the California
        Consumer Privacy Act (CCPA):
      </p>
      <ul>
        <li><strong>Right to know</strong> — you may request the categories and specific pieces of personal information we have collected about you</li>
        <li><strong>Right to delete</strong> — you may request deletion of your personal information</li>
        <li><strong>Right to opt out of sale</strong> — we do <strong>not</strong> sell your personal information to third parties</li>
        <li><strong>Non-discrimination</strong> — we will not discriminate against you for exercising your CCPA rights</li>
      </ul>
      <p>
        Categories of personal information we collect include: identifiers (name, email),
        commercial information (purchase history from connected email), internet activity
        (usage analytics), and sensitive personal information (self-reported psychological
        data, collected only with explicit consent). To exercise your rights,
        contact <a href="mailto:privacy@truepick.app">privacy@truepick.app</a>.
      </p>

      <h3>Children&apos;s privacy</h3>
      <p>
        TruePick is not directed at individuals under the age of 16. We do not
        knowingly collect data from children. If you believe a child under 16 has
        used the Service, please contact us so we may delete the relevant data.
      </p>

      <h3>Contact</h3>
      <p>
        For data protection inquiries: <a href="mailto:privacy@truepick.app">privacy@truepick.app</a>
      </p>
    </section>
  )
}
