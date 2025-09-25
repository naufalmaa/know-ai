'use client'
import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Feature component for cleaner code
const FeatureCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
  <div className="flex flex-col items-center p-6 text-center bg-white rounded-xl shadow-sm border border-gray-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
    <div className="flex-shrink-0 w-16 h-16 mb-4 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full">
      {icon}
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 leading-relaxed">{children}</p>
  </div>
);

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-24 pb-20 text-center lg:pt-32">
          <h1 className="mx-auto max-w-4xl font-display text-5xl font-bold tracking-tight text-slate-900 sm:text-7xl">
            Intelligent Document
            <span className="relative whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              <span className="relative"> Management </span>
            </span>
            Platform
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg tracking-tight text-slate-700">
            Transform your document workflow with AI-powered analysis, seamless collaboration, and intelligent insights. 
            Manage your files like never before.
          </p>
          <div className="mt-10 flex justify-center gap-x-6">
            <button
              onClick={() => router.push('/login')}
              className="group inline-flex items-center justify-center rounded-full py-3 px-6 text-base font-semibold focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus-visible:outline-blue-600 shadow-md hover:shadow-lg transition-shadow"
            >
              Get Started
            </button>
            <Link
              href="#features"
              className="group inline-flex ring-1 items-center justify-center rounded-full py-3 px-6 text-base font-semibold focus:outline-none ring-slate-200 text-slate-700 hover:text-slate-900 hover:ring-slate-300 active:bg-slate-100 active:text-slate-600 focus-visible:outline-blue-600 focus-visible:ring-slate-300"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="py-20">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">Everything you need</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Powerful features for modern teams
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="grid max-w-xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
              <FeatureCard 
                title="AI-Powered Search"
                icon={<svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
              >
                Find any document instantly with intelligent search that understands context and content, not just keywords.
              </FeatureCard>
              <FeatureCard 
                title="Seamless Collaboration"
                icon={<svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
              >
                Keep your team in sync with real-time updates, version history, and secure sharing across all devices.
              </FeatureCard>
              <FeatureCard 
                title="Enterprise Security"
                icon={<svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.917L12 22l9-1.083c-1.181-5.872-4.12-11.23-8.618-14.016z" /></svg>}
              >
                Protect your data with bank-level security, role-based access control, and comprehensive audit trails.
              </FeatureCard>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}