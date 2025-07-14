import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  HelpCircle, 
  MessageCircle, 
  Mail, 
  Phone, 
  Clock, 
  BookOpen,
  Users,
  Shield,
  Zap,
  Heart
} from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Support Center</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          We're here to help you get the most out of PersonaLink. Find answers to common questions or get in touch with our support team.
        </p>
      </div>

      <Tabs defaultValue="faq" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="guides">Guides</TabsTrigger>
          <TabsTrigger value="status">System Status</TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  How does PersonaLink work?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  PersonaLink uses advanced AI algorithms to analyze your personality, interests, and communication style. 
                  We then match you with compatible users who share similar traits and preferences, creating meaningful connections.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Is my data secure?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes! We take your privacy seriously. All data is encrypted, and we never share your personal information 
                  with third parties. You can read our detailed privacy policy for more information.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How do I report inappropriate behavior?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  If you encounter inappropriate behavior, you can report it directly in the chat or contact our support team. 
                  We take all reports seriously and will investigate promptly.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Can I delete my account?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes, you can delete your account at any time from your settings. This will permanently remove all your data 
                  from our servers.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How do I get more credits?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  You can purchase credits through our recharge system. We offer various packages to suit your needs. 
                  Credits are used for premium features and advanced matching options.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Support
                </CardTitle>
                <CardDescription>
                  Get help via email within 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium mb-2">support@personalink.ai</p>
                <p className="text-sm text-muted-foreground mb-4">
                  For general inquiries, technical issues, or account problems
                </p>
                <Button asChild>
                  <Link href="mailto:support@personalink.ai">
                    Send Email
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Phone Support
                </CardTitle>
                <CardDescription>
                  Speak with our support team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium mb-2">+1 (555) 123-4567</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Available Monday-Friday, 9AM-6PM PST
                </p>
                <Button asChild>
                  <Link href="tel:+15551234567">
                    Call Now
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Live Chat
                </CardTitle>
                <CardDescription>
                  Get instant help from our team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Available during business hours for immediate assistance
                </p>
                <Button asChild>
                  <Link href="/contact">
                    Start Chat
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Response Times
                </CardTitle>
                <CardDescription>
                  When to expect a response
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Email:</span>
                    <span className="font-medium">24 hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phone:</span>
                    <span className="font-medium">Immediate</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Live Chat:</span>
                    <span className="font-medium">Instant</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="guides" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Getting Started
                </CardTitle>
                <CardDescription>
                  Learn the basics of PersonaLink
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Create your profile</li>
                  <li>• Set your preferences</li>
                  <li>• Start matching</li>
                  <li>• Begin chatting</li>
                </ul>
                <Button variant="outline" className="mt-4">
                  Read Guide
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Profile Optimization
                </CardTitle>
                <CardDescription>
                  Make your profile stand out
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Add quality photos</li>
                  <li>• Write engaging bio</li>
                  <li>• List your interests</li>
                  <li>• Be authentic</li>
                </ul>
                <Button variant="outline" className="mt-4">
                  Read Guide
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Safety Tips
                </CardTitle>
                <CardDescription>
                  Stay safe while connecting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Never share personal info</li>
                  <li>• Meet in public places</li>
                  <li>• Trust your instincts</li>
                  <li>• Report suspicious behavior</li>
                </ul>
                <Button variant="outline" className="mt-4">
                  Read Guide
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Premium Features
                </CardTitle>
                <CardDescription>
                  Unlock advanced features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Unlimited matches</li>
                  <li>• Advanced filters</li>
                  <li>• Priority support</li>
                  <li>• Enhanced AI matching</li>
                </ul>
                <Button variant="outline" className="mt-4">
                  Learn More
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-green-500" />
                System Status
              </CardTitle>
              <CardDescription>
                Current status of all PersonaLink services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">Website</span>
                  </div>
                  <span className="text-sm text-green-600">Operational</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">Matching Engine</span>
                  </div>
                  <span className="text-sm text-green-600">Operational</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">Chat System</span>
                  </div>
                  <span className="text-sm text-green-600">Operational</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">Payment Processing</span>
                  </div>
                  <span className="text-sm text-green-600">Operational</span>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Last updated:</strong> {new Date().toLocaleString()}
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  All systems are running normally. No issues reported.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-12 text-center">
        <p className="text-muted-foreground mb-4">
          Can't find what you're looking for?
        </p>
        <Button asChild size="lg">
          <Link href="/contact">
            Contact Our Team
          </Link>
        </Button>
      </div>
    </div>
  );
} 