import GoalInput from '@/components/GoalInput'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
          DailyOrganiser
        </h1>
        <p className="text-lg text-gray-600">
          AI-Powered Daily Planner
        </p>
      </div>

      {/* Goal Input Component */}
      <GoalInput />

      {/* Footer */}
      <footer className="max-w-4xl mx-auto mt-12 text-center text-sm text-gray-500">
        <p>Built with Next.js + Tailwind CSS + Supabase</p>
        <p className="mt-1">Zero-Dollar Tech Stack</p>
      </footer>
    </main>
  )
}
