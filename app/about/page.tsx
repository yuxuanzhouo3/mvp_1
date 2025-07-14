import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Heart, 
  Users, 
  Shield, 
  Zap, 
  Globe, 
  Award,
  Target,
  Lightbulb,
  ArrowRight
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          About PersonaLink
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
          We're revolutionizing how people connect by using AI to create meaningful, 
          personality-based friendships that last.
        </p>
        <div className="flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/auth/register">
              Get Started
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/contact">
              Contact Us
            </Link>
          </Button>
        </div>
      </div>

      {/* Mission Section */}
      <div className="mb-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
            <p className="text-lg text-muted-foreground mb-6">
              In today's digital world, finding genuine connections can be challenging. 
              PersonaLink bridges this gap by using advanced AI to match people based on 
              personality compatibility, shared interests, and communication styles.
            </p>
            <p className="text-lg text-muted-foreground mb-6">
              We believe everyone deserves meaningful friendships that enrich their lives. 
              Our platform goes beyond surface-level matching to create deep, lasting connections 
              that help people grow together.
            </p>
            <div className="flex items-center gap-2 text-blue-600 font-medium">
              <Target className="h-5 w-5" />
              <span>Building meaningful connections through AI</span>
            </div>
          </div>
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 text-center">
                  <Heart className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="font-semibold">10K+</p>
                  <p className="text-sm text-muted-foreground">Happy Users</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="font-semibold">50K+</p>
                  <p className="text-sm text-muted-foreground">Connections Made</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <Globe className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="font-semibold">25+</p>
                  <p className="text-sm text-muted-foreground">Countries</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <Award className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <p className="font-semibold">95%</p>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose PersonaLink?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>AI-Powered Matching</CardTitle>
              <CardDescription>
                Our advanced algorithms analyze personality traits, interests, and communication styles 
                to find your perfect match.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Safe & Secure</CardTitle>
              <CardDescription>
                Your privacy and security are our top priorities. All data is encrypted and 
                we never share your personal information.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Heart className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Meaningful Connections</CardTitle>
              <CardDescription>
                Focus on building genuine friendships with people who truly understand and 
                appreciate you for who you are.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* How It Works */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">1</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Create Profile</h3>
            <p className="text-muted-foreground">
              Tell us about yourself, your interests, and what you're looking for in a friend.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-green-600">2</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Get Matched</h3>
            <p className="text-muted-foreground">
              Our AI analyzes your profile and finds compatible people who share your interests.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-purple-600">3</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Start Chatting</h3>
            <p className="text-muted-foreground">
              Connect with your matches through our secure chat system and get to know each other.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-orange-600">4</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Build Friendship</h3>
            <p className="text-muted-foreground">
              Nurture your connections and build lasting friendships that enrich your life.
            </p>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-12">Meet Our Team</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center">
            <CardHeader>
              <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">JD</span>
              </div>
              <CardTitle>John Doe</CardTitle>
              <CardDescription>CEO & Founder</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Former AI researcher with 10+ years experience in machine learning and social platforms.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">JS</span>
              </div>
              <CardTitle>Jane Smith</CardTitle>
              <CardDescription>CTO</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Expert in scalable architecture and AI systems with a passion for connecting people.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">MJ</span>
              </div>
              <CardTitle>Mike Johnson</CardTitle>
              <CardDescription>Head of Product</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Product visionary focused on creating exceptional user experiences and meaningful connections.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Values Section */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Lightbulb className="h-6 w-6 text-yellow-500" />
                <CardTitle>Innovation</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We constantly push the boundaries of AI technology to create better, more accurate 
                matching algorithms that help people find genuine connections.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-green-500" />
                <CardTitle>Privacy</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Your privacy and security are non-negotiable. We use industry-leading encryption 
                and never compromise on protecting your personal information.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Heart className="h-6 w-6 text-red-500" />
                <CardTitle>Authenticity</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We believe in fostering genuine, authentic connections. Our platform encourages 
                users to be their true selves and build meaningful relationships.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-blue-500" />
                <CardTitle>Community</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We're building more than a platform - we're creating a community of people 
                who value meaningful connections and personal growth.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-12">
        <h2 className="text-3xl font-bold mb-4">Ready to Find Your Perfect Match?</h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Join thousands of people who have already discovered meaningful friendships through PersonaLink.
        </p>
        <div className="flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/auth/register">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/contact">
              Learn More
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
} 