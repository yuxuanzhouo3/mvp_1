import { LegalLayout } from '@/components/legal-layout';

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <section className="prose prose-lg max-w-none">
        <h2>Data Collection</h2>
        <p>
          We collect the following types of information to provide and improve our services:
        </p>
        <ul>
          <li><strong>Profile Information:</strong> Name, email, age, location, interests, bio, and communication preferences</li>
          <li><strong>Usage Data:</strong> How you interact with our platform, matching preferences, and chat activity</li>
          <li><strong>Technical Data:</strong> IP address, device information, and browser type</li>
          <li><strong>Payment Information:</strong> Processed securely through our payment partners</li>
        </ul>

        <h2>How We Use Your Information</h2>
        <p>
          We use your information to:
        </p>
        <ul>
          <li>Provide and maintain the PersonaLink service</li>
          <li>Match you with compatible users using our AI algorithms</li>
          <li>Enable real-time chat and communication features</li>
          <li>Process payments and manage your account</li>
          <li>Send important service updates and notifications</li>
          <li>Improve our matching algorithms and user experience</li>
          <li>Ensure platform security and prevent fraud</li>
        </ul>

        <h2>Data Sharing and Disclosure</h2>
        <p>
          We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:
        </p>
        <ul>
          <li><strong>With Other Users:</strong> Your profile information is shared with matched users</li>
          <li><strong>Service Providers:</strong> With trusted partners who help us operate our service</li>
          <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
          <li><strong>Business Transfers:</strong> In connection with a merger or acquisition</li>
        </ul>

        <h2>Data Security</h2>
        <p>
          We implement industry-standard security measures to protect your personal information:
        </p>
        <ul>
          <li>End-to-end encryption for chat messages</li>
          <li>Secure data transmission using HTTPS</li>
          <li>Regular security audits and updates</li>
          <li>Access controls and authentication</li>
        </ul>

        <h2>Data Retention</h2>
        <p>
          We retain your information for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time.
        </p>

        <h2>Your Rights</h2>
        <p>
          You have the right to:
        </p>
        <ul>
          <li>Access and review your personal information</li>
          <li>Update or correct your profile information</li>
          <li>Delete your account and associated data</li>
          <li>Opt out of marketing communications</li>
          <li>Request data portability</li>
        </ul>

        <h2>Cookies and Tracking</h2>
        <p>
          We use cookies and similar technologies to:
        </p>
        <ul>
          <li>Remember your preferences and settings</li>
          <li>Analyze how you use our service</li>
          <li>Provide personalized content and recommendations</li>
          <li>Ensure platform security</li>
        </ul>

        <h2>Third-Party Services</h2>
        <p>
          Our service may integrate with third-party services for:
        </p>
        <ul>
          <li>Payment processing (Stripe, Coinbase Commerce)</li>
          <li>Authentication (Google OAuth)</li>
          <li>Communication (Twilio for SMS)</li>
          <li>Analytics and monitoring</li>
        </ul>

        <h2>International Data Transfers</h2>
        <p>
          Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data during such transfers.
        </p>

        <h2>Children's Privacy</h2>
        <p>
          PersonaLink is not intended for users under 18 years of age. We do not knowingly collect personal information from children under 18.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy or our data practices, please contact us at:
        </p>
        <ul>
          <li>Email: privacy@personalink.ai</li>
          <li>Address: PersonaLink, San Francisco, CA</li>
          <li>Phone: +1 (555) 123-4567</li>
        </ul>
      </section>
    </LegalLayout>
  );
} 