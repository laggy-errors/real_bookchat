import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Charter - BookChat',
  description: 'The sacred covenant between BookChat scribes and the library concerning the collection and protection of user records.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f5efe6] text-[#2c2620] font-serif py-12 px-6 sm:px-8 relative overflow-hidden">
      {/* Subtle paper texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="max-w-2xl mx-auto bg-[#faf6f0] border border-[#e6dec9] rounded shadow-[0_4px_25px_rgba(44,38,32,0.08)] p-8 md:p-12 relative">
        {/* Book Corner Accents */}
        <div className="absolute top-4 left-4 text-xs text-[#c5a059] opacity-40 select-none">⚜</div>
        <div className="absolute top-4 right-4 text-xs text-[#c5a059] opacity-40 select-none">⚜</div>
        <div className="absolute bottom-4 left-4 text-xs text-[#c5a059] opacity-40 select-none">⚜</div>
        <div className="absolute bottom-4 right-4 text-xs text-[#c5a059] opacity-40 select-none">⚜</div>

        <div className="text-center mb-8 border-b border-[#e6dec9] pb-6">
          <span className="text-xs uppercase tracking-widest text-[#8c7b6c] font-sans font-semibold">Archival Archives</span>
          <h1 className="text-3xl md:text-4xl font-playfair font-bold text-[#1a1a15] mt-1 tracking-tight">
            The Privacy Charter
          </h1>
          <p className="text-xs text-[#8c7b6c] italic mt-2">Inscribed: July 18, 2026</p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-[#4a4035]">
          <section>
            <h2 className="text-lg font-bold text-[#1a1a15] mb-2 border-l-2 border-[#8c2d19] pl-3">
              I. The Keeper of Records
            </h2>
            <p>
              Welcome to the digital margins of <strong>BookChat</strong>. Here, we believe your thoughts, conversations, and scrolls are sacred. This Charter defines our stewardship over the cryptographic metadata and text identities you produce when reading with others.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1a1a15] mb-2 border-l-2 border-[#8c2d19] pl-3">
              II. Inscribed Information We Collect
            </h2>
            <p>
              When crossing the library gates and scribing into our shared books, we record only what is essential for synchronizing pages in real time:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1.5 pl-2">
              <li>
                <strong>Scribe Identity:</strong> Your email address and a self-declared password (hashed securely with cryptographic salt) or username.
              </li>
              <li>
                <strong>Marginalia and Scrolls:</strong> The text chat messages and annotations you leave inside specific pages and books, including associated timestamps.
              </li>
              <li>
                <strong>Google Federated Identity:</strong> If you use Google Authenticator/OAuth to access the library, we collect your verified email, display name, and avatar picture.
              </li>
              <li>
                <strong>Dynamic Metadata:</strong> Basic telemetry to preserve websocket connectivity (IP address, web browser signatures).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1a1a15] mb-2 border-l-2 border-[#8c2d19] pl-3">
              III. Usage of Your Marginalia
            </h2>
            <p>
              Your personal data is handled strictly to preserve the cohesive social reading experience:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1.5 pl-2">
              <li>To present real-time messages to authorized fellow readers on the exact same pages.</li>
              <li>To allow book creators to manage access privileges, visibilities, and list of participants.</li>
              <li>To log security audits preventing hostile disruption of books or unauthenticated page access.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1a1a15] mb-2 border-l-2 border-[#8c2d19] pl-3">
              IV. Guardianship & Security
            </h2>
            <p>
              Our database uses secure SSL transport layers, tight database connection pooling, and strict role validation. Real-time websocket broadcasts are authenticated. We never sell, trade, or distribute your marginal notes to advertising agencies, automated crawlers, or third-party marketplaces. Your thoughts belong in the margins of BookChat.
            </p>
          </section>

          <section className="bg-[#fcf9f2] border border-[#e6dec9] p-4 rounded text-xs italic text-[#8c7b6c]">
            <p className="font-bold uppercase tracking-wider text-[10px] mb-1 text-[#1a1a15] not-italic">
              Disclaimer of Legal Scribing:
            </p>
            This document is a human-readable AI-drafted template designed to outline the actual data practices of BookChat. This is not an official legal document and does not constitute formal legal counsel. Before inviting external public audiences or commercial operations, please ensure this policy is reviewed by standard legal counsel.
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-[#e6dec9] flex justify-between items-center text-xs font-sans">
          <Link href="/" className="text-[#8c2d19] hover:text-[#6e2213] font-semibold transition-colors flex items-center gap-1.5">
            ← Return to Library Gates
          </Link>
          <span className="text-[#8c7b6c]">Volume VII Scribes</span>
        </div>
      </div>
    </div>
  );
}
