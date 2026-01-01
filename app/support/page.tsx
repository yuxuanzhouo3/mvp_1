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
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';

export default function SupportPage() {
  const { language } = useLanguage();
  const t = useTranslations(language);

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">{t.support.title}</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {t.support.subtitle}
        </p>
      </div>

      <Tabs defaultValue="faq" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="faq">{t.support.faq}</TabsTrigger>
          <TabsTrigger value="contact">{t.support.contact}</TabsTrigger>
          <TabsTrigger value="guides">{t.support.guides}</TabsTrigger>
          <TabsTrigger value="status">{t.support.status}</TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  {t.support.faq1}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t.support.faq1Desc}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.support.faq2}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t.support.faq2Desc}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.support.faq3}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t.support.faq3Desc}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.support.faq4}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t.support.faq4Desc}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.support.faq5}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t.support.faq5Desc}
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
                  {t.support.emailSupport}
                </CardTitle>
                <CardDescription>
                  {t.support.emailSupportDesc}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium mb-2">support@personalink.ai</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {t.support.emailSupportDetail}
                </p>
                <Button asChild>
                  <Link href="mailto:support@personalink.ai">
                    {t.support.sendEmail}
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  {t.support.phoneSupport}
                </CardTitle>
                <CardDescription>
                  {t.support.phoneSupportDesc}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium mb-2">+1 (555) 123-4567</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {t.support.phoneHours}
                </p>
                <Button asChild>
                  <Link href="tel:+15551234567">
                    {t.support.callNow}
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  {t.support.liveChat}
                </CardTitle>
                <CardDescription>
                  {t.support.liveChatDesc}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {t.support.liveChatDetail}
                </p>
                <Button asChild>
                  <Link href="/contact">
                    {t.support.startChat}
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {t.support.responseTimes}
                </CardTitle>
                <CardDescription>
                  {t.support.responseTimesDesc}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t.support.email}:</span>
                    <span className="font-medium">{t.support.emailResponseTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.support.phone}:</span>
                    <span className="font-medium">{t.support.phoneResponseTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.support.liveChat2}:</span>
                    <span className="font-medium">{t.support.liveChatResponseTime}</span>
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
                  {t.support.gettingStarted}
                </CardTitle>
                <CardDescription>
                  {t.support.gettingStartedDesc}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• {t.support.guideStep1}</li>
                  <li>• {t.support.guideStep2}</li>
                  <li>• {t.support.guideStep3}</li>
                  <li>• {t.support.guideStep4}</li>
                </ul>
                <Button variant="outline" className="mt-4">
                  {t.support.readGuide}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t.support.profileOptimization}
                </CardTitle>
                <CardDescription>
                  {t.support.profileOptimizationDesc}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• {t.support.optStep1}</li>
                  <li>• {t.support.optStep2}</li>
                  <li>• {t.support.optStep3}</li>
                  <li>• {t.support.optStep4}</li>
                </ul>
                <Button variant="outline" className="mt-4">
                  {t.support.readGuide}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t.support.safetyTips}
                </CardTitle>
                <CardDescription>
                  {t.support.safetyTipsDesc}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• {t.support.safetyStep1}</li>
                  <li>• {t.support.safetyStep2}</li>
                  <li>• {t.support.safetyStep3}</li>
                  <li>• {t.support.safetyStep4}</li>
                </ul>
                <Button variant="outline" className="mt-4">
                  {t.support.readGuide}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  {t.support.premiumFeatures}
                </CardTitle>
                <CardDescription>
                  {t.support.premiumFeaturesDesc}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• {t.support.premiumFeature1}</li>
                  <li>• {t.support.premiumFeature2}</li>
                  <li>• {t.support.premiumFeature3}</li>
                  <li>• {t.support.premiumFeature4}</li>
                </ul>
                <Button variant="outline" className="mt-4">
                  {t.support.learnMore}
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
                {t.support.systemStatus}
              </CardTitle>
              <CardDescription>
                {t.support.systemStatusDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">{t.support.website}</span>
                  </div>
                  <span className="text-sm text-green-600">{t.support.operational}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">{t.support.matchingEngine}</span>
                  </div>
                  <span className="text-sm text-green-600">{t.support.operational}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">{t.support.chatSystem}</span>
                  </div>
                  <span className="text-sm text-green-600">{t.support.operational}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">{t.support.paymentProcessing}</span>
                  </div>
                  <span className="text-sm text-green-600">{t.support.operational}</span>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>{t.support.lastUpdated}:</strong> {new Date().toLocaleString()}
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  {t.support.allSystemsNormal}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-12 text-center">
        <p className="text-muted-foreground mb-4">
          {t.support.cantFind}
        </p>
        <Button asChild size="lg">
          <Link href="/contact">
            {t.support.contactTeam}
          </Link>
        </Button>
      </div>
    </div>
  );
} 