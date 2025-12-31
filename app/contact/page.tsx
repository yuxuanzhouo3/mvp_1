import { ContactForm } from '@/components/contact-form';
import { ContactCard } from '@/components/contact-card';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Have questions about PersonaLink? We're here to help! Reach out to our team and we'll get back to you as soon as possible.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Contact Form */}
        <div>
          <h2 className="text-2xl font-semibold mb-6">Send us a Message</h2>
          <ContactForm />
        </div>

        {/* Contact Information */}
        <div>
          <h2 className="text-2xl font-semibold mb-6">Get in Touch</h2>
          <div className="space-y-6">
            <ContactCard 
              icon={Mail} 
              title="Email Support" 
              details="support@personalink.ai"
              description="We typically respond within 24 hours"
            />
            <ContactCard 
              icon={Phone} 
              title="Phone Support" 
              details="+1 (555) 123-4567"
              description="Available Monday-Friday, 9AM-6PM PST"
            />
            <ContactCard 
              icon={MapPin} 
              title="Headquarters" 
              details="San Francisco, CA"
              description="PersonaLink Inc., 123 Innovation Drive"
            />
            <ContactCard 
              icon={Clock} 
              title="Business Hours" 
              details="Monday - Friday"
              description="9:00 AM - 6:00 PM Pacific Time"
            />
          </div>

          {/* FAQ Section */}
          <div className="mt-12">
            <h3 className="text-xl font-semibold mb-4">Frequently Asked Questions</h3>
            <div className="space-y-4">
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-medium">How does the matching algorithm work?</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Our AI analyzes your interests, communication style, and personality traits to find compatible matches.
                </p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-medium">Is my data secure?</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Yes, we use industry-standard encryption and security measures to protect your personal information.
                </p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-medium">Can I delete my account?</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Yes, you can delete your account and all associated data at any time from your settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 