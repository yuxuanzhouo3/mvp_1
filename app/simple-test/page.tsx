export default function SimpleTestPage() {
  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-4xl font-bold text-black mb-4">
        Simple Test Page
      </h1>
      <p className="text-lg text-gray-600">
        If you can see this, the basic Next.js setup is working.
      </p>
      <div className="mt-8 p-4 bg-blue-100 rounded-lg">
        <h2 className="text-2xl font-semibold text-blue-800 mb-2">
          Test Content
        </h2>
        <p className="text-blue-700">
          This is a simple test to verify that the page rendering is working correctly.
        </p>
      </div>
    </div>
  );
} 