import EnhancedChatStream from '@/components/EnhancedChatStream'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Zara AI - Your Knowledge Navigator Assistant',
  description: 'Chat with Zara AI to find anything you need to know from your documents'
}

export default function ZaraAIPage() {
  return (
    <div className="h-screen">
      <EnhancedChatStream />
    </div>
  )
}