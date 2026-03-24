import GoalInput from '@/components/GoalInput'
import TaskDashboard from '@/components/TaskDashboard'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
          DailyOrganiser
        </h1>
        <p className="text-lg text-gray-600">
          AI-Powered Daily Planner
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Goal Input */}
        <div>
          <GoalInput />
        </div>
        
        {/* Right Column: Task Dashboard */}
        <div>
          <TaskDashboard />
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto mt-12 text-center text-sm text-gray-500">
        <p>Built with Next.js + Tailwind CSS + Supabase</p>
        <p className="mt-1">Zero-Dollar Tech Stack</p>
      </footer>
    </main>
  )
}
