export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-pink-500/10" />
      <div className="relative text-center bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-12 max-w-md mx-4 border border-white/50">
        <div className="mb-6">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            403
          </h1>
          <div className="h-1 w-20 mx-auto bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-full" />
        </div>
        <p className="text-2xl font-semibold text-gray-800 mb-3">Unauthorized Access</p>
        <p className="text-gray-600 mb-8 leading-relaxed">
          You don&apos;t have permission to access this page.
        </p>
        <a
          href="/login"
          className="inline-block px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          Go to Login
        </a>
      </div>
    </div>
  )
}
