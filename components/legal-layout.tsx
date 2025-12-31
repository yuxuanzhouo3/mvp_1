import React from 'react';

export function LegalLayout({ 
  children,
  title 
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <header className="mb-12">
        <h1 className="text-4xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-2">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </header>
      
      <div className="prose prose-lg max-w-none">
        {children}
      </div>
      
      <footer className="mt-16 pt-8 border-t">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} PersonaLink. All rights reserved.
        </p>
      </footer>
    </div>
  );
} 