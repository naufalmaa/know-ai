import React, { useState } from 'react'

// Feature component with glassmorphism
const FeatureCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
  <div className="group relative p-8 bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:bg-white/80">
    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    <div className="relative z-10">
      <div className="flex-shrink-0 w-16 h-16 mb-6 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-500">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-700 transition-colors">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{children}</p>
    </div>
  </div>
);

// Workflow step component
const WorkflowStep = ({ number, title, description, icon }: { number: string, title: string, description: string, icon: React.ReactNode }) => (
  <div className="relative flex flex-col items-center text-center group">
    <div className="relative z-10 flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl shadow-lg mb-6 group-hover:scale-110 transition-all duration-300">
      <span className="absolute -top-2 -right-2 w-8 h-8 bg-orange-500 text-white text-sm font-bold rounded-full flex items-center justify-center shadow-md">
        {number}
      </span>
      {icon}
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
    <p className="text-gray-600 max-w-sm leading-relaxed">{description}</p>
  </div>
);

// FAQ Item component
const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white/80 backdrop-blur-sm">
      <button
        className="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-blue-50/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-semibold text-gray-900">{question}</span>
        <svg
          className={`w-5 h-5 text-blue-600 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <p className="text-gray-700">{answer}</p>
        </div>
      )}
    </div>
  );
};

export default function KnowAILanding() {
  const handleLogin = () => {
    window.location.href = '/login';
  };

  const handleContactUs = () => {
    // Replace with your contact method (email, calendar booking, etc.)
    window.location.href = 'mailto:contact@knowai.com?subject=Enterprise Demo Request';
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-32 w-96 h-96 bg-gradient-to-br from-indigo-200/30 to-purple-200/30 rounded-full blur-3xl"></div>
      </div>



      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-20 pb-24 text-center lg:pt-28">
          <div className="mx-auto max-w-4xl">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100/80 backdrop-blur-sm text-blue-800 text-sm font-medium rounded-full mb-8 border border-blue-200/50">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
              Enterprise Knowledge Management Platform
            </div>
            <h1 className="font-display text-5xl font-bold tracking-tight text-slate-900 sm:text-7xl mb-6">
              Transform Documents into
              <span className="relative whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 block mt-2 pb-2">
                Intelligent Knowledge
              </span>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-xl text-slate-700 leading-relaxed">
              Build your enterprise knowledge library with AI. Upload documents, ask questions, 
              and get precise answers with source citations. Your documents become your smartest asset.
            </p>
            <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={handleContactUs}
                className="group inline-flex items-center justify-center rounded-2xl py-4 px-8 text-lg font-semibold focus:outline-none bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                Get Enterprise Demo
                <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="group inline-flex items-center justify-center rounded-2xl py-4 px-8 text-lg font-semibold focus:outline-none bg-white/80 backdrop-blur-sm text-slate-700 hover:bg-white border-2 border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300"
              >
                See How It Works
              </button>
            </div>
            
            {/* Login link - subtle but accessible */}
            <div className="mt-8">
              <button
                onClick={handleLogin}
                className="text-slate-600 hover:text-blue-600 font-medium transition-colors duration-300"
              >
                Already have an account? <span className="underline">Sign In</span>
              </button>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div id="how-it-works" className="py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Three Steps to Knowledge Mastery
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our streamlined workflow transforms your document chaos into organized, searchable intelligence
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
            <WorkflowStep
              number="1"
              title="Upload & Organize"
              description="Centralize all your enterprise documents, files, and data sources into one secure, organized knowledge repository"
              icon={
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              }
            />
            <WorkflowStep
              number="2"
              title="Query Your AI Assistant"
              description="Ask natural language questions about your documents. Our AI understands context and finds relevant information across your entire knowledge base"
              icon={
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              }
            />
            <WorkflowStep
              number="3"
              title="Get Verified Insights"
              description="Receive accurate answers with direct citations to source documents. Every response is traceable and verifiable for enterprise reliability"
              icon={
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          {/* Workflow Connection Lines */}
          <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 -mt-32">
            <svg width="600" height="100" className="text-blue-200">
              <defs>
                <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.3"/>
                  <stop offset="50%" stopColor="currentColor" stopOpacity="0.8"/>
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.3"/>
                </linearGradient>
              </defs>
              <path d="M50 50 Q300 20 550 50" stroke="url(#line-gradient)" strokeWidth="2" fill="none" strokeDasharray="5,5">
                <animate attributeName="stroke-dashoffset" values="0;-10" dur="2s" repeatCount="indefinite"/>
              </path>
            </svg>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="py-24">
          <div className="text-center mb-16">
            <h2 className="text-base font-semibold leading-7 text-blue-600 uppercase tracking-wide">Enterprise Features</h2>
            <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900">
              Built for Enterprise Knowledge Management
            </p>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Every feature designed to meet enterprise standards for security, scalability, and reliability
            </p>
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            <FeatureCard 
              title="AI-Powered Knowledge Search"
              icon={
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            >
              Advanced semantic search that understands context, intent, and relationships within your documents. Find answers, not just keywords.
            </FeatureCard>
            <FeatureCard 
              title="Enterprise Collaboration"
              icon={
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            >
              Seamless team collaboration with role-based access, real-time sharing, and comprehensive audit trails for enterprise compliance.
            </FeatureCard>
            <FeatureCard 
              title="Enterprise-Grade Security"
              icon={
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.917L12 22l9-1.083c-1.181-5.872-4.12-11.23-8.618-14.016z" />
                </svg>
              }
            >
              Bank-level encryption, SOC 2 compliance, SSO integration, and granular permission controls to protect your most sensitive knowledge.
            </FeatureCard>
            <FeatureCard 
              title="Source Attribution"
              icon={
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            >
              Every AI response includes precise citations and links back to source documents, ensuring transparency and enabling verification.
            </FeatureCard>
            <FeatureCard 
              title="Scalable Architecture"
              icon={
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            >
              Cloud-native infrastructure that scales with your organization, handling millions of documents with consistent performance.
            </FeatureCard>
            <FeatureCard 
              title="Integration Ready"
              icon={
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a1 1 0 01-1-1V9a1 1 0 011-1h1a2 2 0 100-4H4a1 1 0 01-1-1V4a1 1 0 011-1h3a1 1 0 001-1z" />
                </svg>
              }
            >
              RESTful APIs and pre-built connectors for popular enterprise tools like SharePoint, Confluence, and Google Workspace.
            </FeatureCard>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to know about Know AI for enterprise deployment
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            <FAQItem
              question="How secure is our data with Know AI?"
              answer="Your data security is our top priority. We use enterprise-grade encryption, SOC 2 Type II compliance, and can deploy on-premises or in your private cloud. All data processing happens in isolated environments with comprehensive audit logging."
            />
            <FAQItem
              question="What types of documents can Know AI process?"
              answer="Know AI supports all major document formats including PDFs, Word documents, PowerPoint presentations, Excel files, plain text, and many more. We also support integration with document management systems and cloud storage platforms."
            />
            <FAQItem
              question="How accurate are the AI responses?"
              answer="Our AI provides highly accurate responses by grounding all answers in your actual documents. Every response includes source citations so you can verify the information. The system is designed to say 'I don't know' rather than guess when information isn't available."
            />
            <FAQItem
              question="Can Know AI integrate with our existing systems?"
              answer="Yes, Know AI offers comprehensive APIs and pre-built integrations with popular enterprise tools like SharePoint, Confluence, Google Workspace, Slack, and Microsoft Teams. We also support custom integrations for your specific workflow needs."
            />
            <FAQItem
              question="What's the implementation timeline for enterprise deployment?"
              answer="Most enterprise implementations are completed within 2-4 weeks, including data migration, user training, and system configuration. We provide dedicated implementation support and can work with your IT team to ensure smooth deployment."
            />
            <FAQItem
              question="How does pricing work for enterprise clients?"
              answer="Enterprise pricing is customized based on your specific needs including user count, document volume, storage requirements, and integration complexity. Contact us for a personalized quote and demo tailored to your organization."
            />
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-24">
          <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-12 text-center overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <h2 className="text-4xl font-bold text-white mb-6">
                Ready to Transform Your Enterprise Knowledge?
              </h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                Join forward-thinking enterprises who have already made their documents work smarter. 
                Schedule a personalized demo today.
              </p>
              <button
                onClick={handleContactUs}
                className="inline-flex items-center justify-center rounded-2xl py-4 px-8 text-lg font-semibold bg-white text-blue-700 hover:bg-blue-50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                Schedule Your Enterprise Demo
                <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            {/* Background decoration */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full"></div>
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-white/10 rounded-full"></div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">K</span>
              </div>
              <span className="text-2xl font-bold">Know AI</span>
            </div>
            <div className="text-center md:text-right">
              <p className="text-slate-400 mb-2">Enterprise Knowledge Management Platform</p>
              <p className="text-slate-500 text-sm">© 2025Kwaviv Know LdegeI.  All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}