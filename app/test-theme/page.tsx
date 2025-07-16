'use client';

import { useTheme } from '@/context/ThemeProvider';
import { ThemeControls } from '@/components/ui/theme-controls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestThemePage() {
  const { theme, language, colorMode, cycleTheme, cycleLanguage, toggleColorMode } = useTheme();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Theme System Test Page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <h3 className="font-semibold mb-2">Current Theme</h3>
                <p className="text-2xl font-bold text-primary">{theme}</p>
                <Button onClick={cycleTheme} className="mt-2">
                  Cycle Theme
                </Button>
              </div>
              
              <div className="text-center p-4 bg-secondary/10 rounded-lg">
                <h3 className="font-semibold mb-2">Current Language</h3>
                <p className="text-2xl font-bold">{language}</p>
                <Button onClick={cycleLanguage} className="mt-2">
                  Cycle Language
                </Button>
              </div>
              
              <div className="text-center p-4 bg-accent/10 rounded-lg">
                <h3 className="font-semibold mb-2">Color Mode</h3>
                <p className="text-2xl font-bold">{colorMode}</p>
                <Button onClick={toggleColorMode} className="mt-2">
                  Toggle Mode
                </Button>
              </div>
            </div>
            
            <div className="text-center p-4 bg-gradient-theme rounded-lg">
              <h3 className="font-semibold mb-2">Theme Gradient Test</h3>
              <p>This section should change color based on the current theme</p>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <Button className="btn-primary">Primary Button</Button>
              <Button variant="outline" className="btn-secondary">Secondary Button</Button>
              <Button className="text-gradient-theme">Gradient Text</Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center text-sm text-muted-foreground">
          <p>Theme Controls should be visible in the bottom-right corner</p>
          <p>Monitoring components should be on the left side</p>
        </div>
      </div>
      
      {/* Theme Controls */}
      <ThemeControls />
    </div>
  );
} 