import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import HomePage from './home/page'

export default async function RootPage() {
  try {
    // Check if user is authenticated
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    
    // If authenticated, redirect to dashboard
    if (session?.user) {
      redirect('/')
    }
  } catch (error) {
    // If session check fails, user is not authenticated
  }
  
  // Show the homepage for unauthenticated users
  return <HomePage />
}
