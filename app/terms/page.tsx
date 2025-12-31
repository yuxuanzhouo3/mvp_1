import { LegalLayout } from '@/components/legal-layout';

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <section className="prose prose-lg max-w-none">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using PersonaLink ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          PersonaLink is an AI-driven personality-based social matching platform that connects users based on compatibility, interests, and communication styles. The Service includes profile creation, matching algorithms, chat functionality, and related features.
        </p>

        <h2>3. User Accounts</h2>
        <p>
          To use certain features of the Service, you must create an account. You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.
        </p>

        <h2>4. User Conduct</h2>
        <p>
          You agree not to use the Service to:
        </p>
        <ul>
          <li>Violate any applicable laws or regulations</li>
          <li>Harass, abuse, or harm other users</li>
          <li>Impersonate another person or entity</li>
          <li>Upload or transmit malicious code or content</li>
          <li>Attempt to gain unauthorized access to the Service</li>
        </ul>

        <h2>5. Privacy and Data Protection</h2>
        <p>
          Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices regarding the collection and use of your personal information.
        </p>

        <h2>6. Intellectual Property</h2>
        <p>
          The Service and its original content, features, and functionality are and will remain the exclusive property of PersonaLink and its licensors. The Service is protected by copyright, trademark, and other laws.
        </p>

        <h2>7. Payment Terms</h2>
        <p>
          Some features of the Service may require payment. All payments are processed securely through our payment partners. Refunds are subject to our refund policy.
        </p>

        <h2>8. Termination</h2>
        <p>
          We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation.
        </p>

        <h2>9. Limitation of Liability</h2>
        <p>
          In no event shall PersonaLink, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages.
        </p>

        <h2>10. Changes to Terms</h2>
        <p>
          We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
        </p>

        <h2>11. Contact Information</h2>
        <p>
          If you have any questions about these Terms of Service, please contact us at legal@personalink.ai.
        </p>
      </section>
    </LegalLayout>
  );
} 