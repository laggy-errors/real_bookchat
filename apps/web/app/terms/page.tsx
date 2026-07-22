import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Scribing - BookChat',
  description: 'The standard rules of conduct, ownership of thoughts, and protocol rules inside collaborative digital volumes.',
};

export default function TermsPage() {
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
          <span className="text-xs uppercase tracking-widest text-[#8c7b6c] font-sans font-semibold">Library Code</span>
          <h1 className="text-3xl md:text-4xl font-playfair font-bold text-[#1a1a15] mt-1 tracking-tight">
            Terms of Scribing
          </h1>
          <p className="text-xs text-[#8c7b6c] italic mt-2">Inscribed: July 18, 2026</p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-[#4a4035]">
          <section>
            <h2 className="text-lg font-bold text-[#1a1a15] mb-2 border-l-2 border-[#8c2d19] pl-3">
              I. Entering the Scribing Hall
            </h2>
            <p>
              By crossing the thresholds of BookChat, creating books, or commenting in active margins, you agree to abide by this library code. If you cannot subscribe to these parameters, you must lay down your quill and exit the volume.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1a1a15] mb-2 border-l-2 border-[#8c2d19] pl-3">
              II. Integrity of the Ink
            </h2>
            <p>
              When leaving reviews, messages, or creating custom digital books:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1.5 pl-2">
              <li>
                <strong>Veracity of Credentials:</strong> You must not impersonate other historical scholars, authors, or library admins.
              </li>
              <li>
                <strong>Scribbling Conduct:</strong> Hateful, obscene, harassing, or destructive text is strictly forbidden. Spreading automated "flooding" text or malicious spam script into websocket feeds is grounds for immediate banishment.
              </li>
              <li>
                <strong>Vandalism:</strong> Attempting to bypass member permissions, view hidden notes, or breach secure database channels constitutes library vandalism.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1a1a15] mb-2 border-l-2 border-[#8c2d19] pl-3">
              III. Title and Content Ownership
            </h2>
            <p>
              You maintain full moral ownership of your typed thoughts, insights, and marginal notes. However, to operate our live synchronizations, you grant BookChat a non-exclusive, global, royalty-free license to host, transmit, cache, and display your messages solely to other authorized users reading the same pages.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1a1a15] mb-2 border-l-2 border-[#8c2d19] pl-3">
              IV. Disclaimer of Liability & Closure
            </h2>
            <p>
              We provide BookChat on an "AS IS" and "AS AVAILABLE" basis. We do not guarantee that the digital bindings of our book will never tear, or that your notes will remain preserved for centuries in the archives. We reserve the right to temporarily suspend database access, close active books, or clean inactive chat records as needed to maintain high library performance.
            </p>
          </section>

          <section className="bg-[#fcf9f2] border border-[#e6dec9] p-4 rounded text-xs italic text-[#8c7b6c]">
            <p className="font-bold uppercase tracking-wider text-[10px] mb-1 text-[#1a1a15] not-italic">
              Disclaimer of Legal Scribing:
            </p>
            This document is a human-readable AI-drafted template designed to outline the actual operating rules of BookChat. This is not an official legal document and does not constitute formal legal counsel. Before inviting external public audiences or commercial operations, please ensure these terms are reviewed by standard legal counsel.
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
