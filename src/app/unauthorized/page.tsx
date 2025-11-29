export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">403</h1>
        <p className="text-xl text-gray-600 mb-4">Unauthorized Access</p>
        <p className="text-gray-500 mb-8">
          You don&apos;t have permission to access this page.
        </p>
        <a
          href="/login"
          className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Go to Login
        </a>
      </div>
    </div>
  )
}
