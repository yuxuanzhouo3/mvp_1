import React from 'react';

export function ContactCard({
  icon: Icon,
  title,
  details,
  description
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  details: string;
  description?: string;
}) {
  return (
    <div className="bg-card p-6 rounded-xl border hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <Icon className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{title}</h3>
          <p className="text-muted-foreground font-medium">{details}</p>
          {description && (
            <p className="text-sm text-muted-foreground mt-2">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
} 