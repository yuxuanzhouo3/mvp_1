import { redirect } from 'next/navigation';

export default async function LegacyChatDetailPage({
  params,
}: {
  params: { chatId: string };
}) {
  const chatId = params?.chatId;

  if (chatId) {
    redirect(`/dashboard/messages/${chatId}`);
  }

  redirect('/dashboard/messages');
}

