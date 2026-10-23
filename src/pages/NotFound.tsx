import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-slate-600">There is nothing at this address.</p>
      <Link to="/" className="mt-4 inline-block text-indigo-700 hover:underline">
        Back to the start
      </Link>
    </section>
  )
}
