import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      redirect('/auth/login');
    }
    
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <DashboardSidebar user={user} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    );
  } catch (error) {
    console.error('Dashboard layout error:', error);
    redirect('/auth/login');
  }
} 