import { useState } from 'react'

const CONTRACT = '0x8A8B387C84552863c077C3085dF719E6DA42d673'
const STUDIO_URL = 'https://studio.genlayer.com'

export default function App() {
  const [claimId, setClaimId] = useState('0')

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied! Paste it in GenLayer Studio.')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-white">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          ClaimJudge
        </h1>
        <p className="text-gray-300 mt-2">AI-Powered Decentralized Claim & Dispute Resolver</p>
        <p className="text-xs text-gray-500 mt-2 break-all">{CONTRACT}</p>
        <p className="text-sm text-yellow-400 mt-4">
          All write & read tests must be performed in{' '}
          <a href={STUDIO_URL} target="_blank" rel="noreferrer" className="underline font-medium">
            GenLayer Studio
          </a>
        </p>
      </div>

      {/* Notice */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5 mb-8 text-sm">
        <p className="font-medium text-yellow-300 mb-2">Important for Reviewers</p>
        <p className="text-gray-300 leading-relaxed">
          Due to current browser ↔ Studio RPC limitations, this page is a guided test checklist.  
          Execute every step in GenLayer Studio and verify the results there using the view methods.
        </p>
      </div>

      {/* Claim ID */}
      <div className="bg-white/5 rounded-2xl p-5 border border-white/10 mb-6">
        <label className="text-sm text-gray-400">Claim ID you are testing</label>
        <input
          className="w-full mt-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3"
          value={claimId}
          onChange={e => setClaimId(e.target.value)}
          placeholder="0"
        />
      </div>

      <div className="space-y-5">

        {/* Step 1 */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <h2 className="font-semibold text-indigo-300 mb-3">Step 1 – create_claim</h2>
          <div className="bg-black/40 p-4 rounded-xl text-xs space-y-1 mb-3 overflow-hidden">
            <p><span className="text-gray-400">title:</span> Insurance Claim for Car Accident</p>
            <p><span className="text-gray-400">description:</span> The policyholder was involved in a car accident on 2026-08-15. The other driver was at fault. All documents have been submitted.</p>
            <p><span className="text-gray-400">evidence_urls:</span> https://example.com/police-report.pdf, https://example.com/photos.zip</p>
          </div>
          <button
            onClick={() => copy(`Insurance Claim for Car Accident\nThe policyholder was involved in a car accident on 2026-08-15. The other driver was at fault. All documents have been submitted.\nhttps://example.com/police-report.pdf, https://example.com/photos.zip`)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 py-2.5 rounded-xl text-sm font-medium"
          >
            Copy Parameters
          </button>
          <p className="text-xs text-gray-500 mt-2">→ Note the returned claim_id</p>
        </div>

        {/* Step 2 */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <h2 className="font-semibold text-blue-300 mb-3">Step 2 – add_evidence</h2>
          <div className="bg-black/40 p-4 rounded-xl text-xs space-y-1 mb-3">
            <p><span className="text-gray-400">claim_id:</span> {claimId}</p>
            <p><span className="text-gray-400">extra_urls:</span> https://example.com/medical-report.pdf</p>
          </div>
          <button
            onClick={() => copy(`${claimId}\nhttps://example.com/medical-report.pdf`)}
            className="w-full bg-blue-600 hover:bg-blue-700 py-2.5 rounded-xl text-sm font-medium"
          >
            Copy Parameters
          </button>
        </div>

        {/* Step 3 */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <h2 className="font-semibold text-green-300 mb-3">Step 3 – resolve_claim (first judgment)</h2>
          <div className="bg-black/40 p-4 rounded-xl text-xs mb-3">
            <p><span className="text-gray-400">claim_id:</span> {claimId}</p>
          </div>
          <button
            onClick={() => copy(claimId)}
            className="w-full bg-green-600 hover:bg-green-700 py-2.5 rounded-xl text-sm font-medium"
          >
            Copy claim_id
          </button>
          <p className="text-xs text-gray-500 mt-2">After FINALIZED → call get_resolution</p>
        </div>

        {/* Step 4 */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <h2 className="font-semibold text-orange-300 mb-3">Step 4 – challenge_resolution</h2>
          <div className="bg-black/40 p-4 rounded-xl text-xs space-y-1 mb-3 overflow-hidden">
            <p><span className="text-gray-400">claim_id:</span> {claimId}</p>
            <p className="leading-relaxed">
              <span className="text-gray-400">reason:</span> The AI decision did not properly consider the police report that clearly shows the other driver was at fault. Please reassess with more weight on the official documents.
            </p>
          </div>
          <button
            onClick={() => copy(`${claimId}\nThe AI decision did not properly consider the police report that clearly shows the other driver was at fault. Please reassess with more weight on the official documents.`)}
            className="w-full bg-orange-600 hover:bg-orange-700 py-2.5 rounded-xl text-sm font-medium"
          >
            Copy Parameters
          </button>
        </div>

        {/* Step 5 */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <h2 className="font-semibold text-yellow-300 mb-3">Step 5 – resolve_claim again (Reassessment)</h2>
          <div className="bg-black/40 p-4 rounded-xl text-xs mb-3">
            <p><span className="text-gray-400">claim_id:</span> {claimId}</p>
          </div>
          <button
            onClick={() => copy(claimId)}
            className="w-full bg-yellow-600 hover:bg-yellow-700 py-2.5 rounded-xl text-sm font-medium"
          >
            Copy claim_id
          </button>
          <p className="text-xs text-gray-500 mt-2">AI must receive previous decision + challenge reason</p>
        </div>

        {/* Step 6 & 7 */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <h2 className="font-semibold text-purple-300 mb-3">Step 6 & 7 – Verify Results in Studio</h2>
          <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside leading-relaxed">
            <li><code>get_resolution</code> → must show <strong>is_reassessment: true</strong></li>
            <li><code>get_challenge</code> → must show the challenge reason</li>
            <li><code>get_history</code> → must contain at least 2 decisions</li>
            <li><code>get_claim</code> → status = resolved</li>
            <li><code>get_stats</code> → overall statistics</li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-sm text-gray-500">
        <a href={STUDIO_URL} target="_blank" rel="noreferrer" className="text-indigo-400 underline">
          Open GenLayer Studio
        </a>
        {' • '}
        <a href="https://github.com/Aragoorn/genlayer-claimjudge-dapp" target="_blank" rel="noreferrer" className="text-indigo-400 underline">
          GitHub Repository
        </a>
      </div>
    </div>
  )
}
