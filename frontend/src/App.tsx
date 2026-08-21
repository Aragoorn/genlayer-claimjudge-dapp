import { useState, useEffect } from 'react'
import { createClient, createAccount } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'          // ← تغییر اصلی
import { TransactionStatus } from 'genlayer-js/types'

const CONTRACT_ADDRESS = '0x8A8B387C84552863c077C3085dF719E6DA42d673' as `0x${string}`
const STUDIO_URL = 'https://studio.genlayer.com'

export default function App() {
  const [client, setClient] = useState<any>(null)
  const [claimId, setClaimId] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('Initializing...')
  const [lastReceipt, setLastReceipt] = useState<any>(null)

  const [title, setTitle] = useState('Insurance Claim for Car Accident')
  const [description, setDescription] = useState(
    'The policyholder was involved in a car accident on 2026-08-15. The other driver was at fault. All documents have been submitted.'
  )
  const [evidenceUrls, setEvidenceUrls] = useState(
    'https://example.com/police-report.pdf, https://example.com/photos.zip'
  )
  const [extraEvidence, setExtraEvidence] = useState('https://example.com/medical-report.pdf')
  const [challengeReason, setChallengeReason] = useState(
    'The AI decision did not properly consider the police report that clearly shows the other driver was at fault. Please reassess with more weight on the official documents.'
  )

  const [claimData, setClaimData] = useState<any>(null)
  const [resolution, setResolution] = useState<any>(null)
  const [challenge, setChallenge] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    try {
      const account = createAccount()
      const c = createClient({
        chain: studionet,          // ← اینجا studionet
        account,
      })
      setClient(c)
      setStatus('Client ready (studionet)')
    } catch (err: any) {
      setStatus(`Init error: ${err?.message || String(err)}`)
    }
  }, [])

  const write = async (functionName: string, args: any[]) => {
    if (!client) {
      setStatus('Client not ready')
      return null
    }
    setLoading(true)
    setStatus(`Calling ${functionName}...`)
    try {
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName,
        args,
        value: 0n,
      })

      const receipt = await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.FINALIZED,
        interval: 3000,
        retries: 80,
      })

      setLastReceipt(receipt)
      setStatus(`${functionName} → FINALIZED`)
      return receipt
    } catch (err: any) {
      setStatus(`Error (${functionName}): ${err?.message || String(err)}`)
      console.error(err)
      return null
    } finally {
      setLoading(false)
    }
  }

  const read = async (functionName: string, args: any[] = []) => {
    if (!client) return null
    try {
      return await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName,
        args,
      })
    } catch (err: any) {
      setStatus(`Read error (${functionName}): ${err?.message || String(err)}`)
      return null
    }
  }

  const handleCreateClaim = async () => {
    const receipt = await write('create_claim', [title, description, evidenceUrls])
    if (!receipt) return

    const count = await read('get_claim_count')
    if (count !== null && count !== undefined) {
      const id = String(Number(count) - 1)
      setClaimId(id)
      setStatus(`Claim created successfully. Claim ID: ${id}`)
    } else {
      setStatus('Claim created, but could not read claim_id. Please set it manually.')
    }
  }

  const handleAddEvidence = async () => {
    if (!claimId) return setStatus('Set a Claim ID first')
    await write('add_evidence', [BigInt(claimId), extraEvidence])
  }

  const handleResolve = async () => {
    if (!claimId) return setStatus('Set a Claim ID first')
    const receipt = await write('resolve_claim', [BigInt(claimId)])
    if (receipt) await refreshViews()
  }

  const handleChallenge = async () => {
    if (!claimId) return setStatus('Set a Claim ID first')
    await write('challenge_resolution', [BigInt(claimId), challengeReason])
  }

  const refreshViews = async () => {
    if (!claimId) return setStatus('Set a Claim ID first')
    setLoading(true)
    setStatus('Refreshing views...')
    try {
      const [c, r, ch, h, s] = await Promise.all([
        read('get_claim', [BigInt(claimId)]),
        read('get_resolution', [BigInt(claimId)]),
        read('get_challenge', [BigInt(claimId)]),
        read('get_history', [BigInt(claimId)]),
        read('get_stats'),
      ])

      if (c) setClaimData(typeof c === 'string' ? JSON.parse(c) : c)
      if (r) setResolution(typeof r === 'string' ? JSON.parse(r) : r)
      if (ch) setChallenge(typeof ch === 'string' ? JSON.parse(ch) : ch)
      if (h) setHistory(typeof h === 'string' ? JSON.parse(h) : h)
      if (s) setStats(typeof s === 'string' ? JSON.parse(s) : s)

      setStatus('Views refreshed')
    } catch (err: any) {
      setStatus(`Refresh error: ${err?.message || String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-white">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          ClaimJudge
        </h1>
        <p className="text-gray-300 mt-2">AI-Powered Decentralized Claim & Dispute Resolver</p>
        <p className="text-xs text-gray-500 mt-2 break-all">{CONTRACT_ADDRESS}</p>
        <p className="text-sm text-green-400 mt-3">
          Real genlayer-js read/write path • Typed receipt • Full lifecycle (studionet)
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 text-sm">
        <p className="text-gray-400">Status</p>
        <p className="text-yellow-300 mt-1 break-all">{status}</p>
        {lastReceipt && (
          <details className="mt-2 text-xs text-gray-400">
            <summary>Last Typed Receipt</summary>
            <pre className="mt-1 overflow-auto max-h-48">
              {JSON.stringify(lastReceipt, null, 2)}
            </pre>
          </details>
        )}
      </div>

      <div className="bg-white/5 rounded-2xl p-5 border border-white/10 mb-6">
        <label className="text-sm text-gray-400">Current Claim ID</label>
        <input
          className="w-full mt-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3"
          value={claimId}
          onChange={(e) => setClaimId(e.target.value)}
          placeholder="Auto-filled after create_claim"
        />
      </div>

      <div className="space-y-5">
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <h2 className="font-semibold text-indigo-300 mb-3">1. create_claim</h2>
          <div className="space-y-2 mb-3">
            <input
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
            />
            <textarea
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
            />
            <input
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
              value={evidenceUrls}
              onChange={(e) => setEvidenceUrls(e.target.value)}
              placeholder="Evidence URLs"
            />
          </div>
          <button
            onClick={handleCreateClaim}
            disabled={loading || !client}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 py-2.5 rounded-xl text-sm font-medium"
          >
            {loading ? 'Processing...' : 'Create Claim (write + typed receipt + claim_id)'}
          </button>
        </div>

        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <h2 className="font-semibold text-blue-300 mb-3">2. add_evidence</h2>
          <input
            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm mb-3"
            value={extraEvidence}
            onChange={(e) => setExtraEvidence(e.target.value)}
            placeholder="Extra evidence URL"
          />
          <button
            onClick={handleAddEvidence}
            disabled={loading || !claimId}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-2.5 rounded-xl text-sm font-medium"
          >
            Add Evidence
          </button>
        </div>

        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <h2 className="font-semibold text-green-300 mb-3">3. resolve_claim (first judgment)</h2>
          <button
            onClick={handleResolve}
            disabled={loading || !claimId}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 py-2.5 rounded-xl text-sm font-medium"
          >
            Resolve Claim
          </button>
        </div>

        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <h2 className="font-semibold text-orange-300 mb-3">4. challenge_resolution</h2>
          <textarea
            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm mb-3"
            rows={3}
            value={challengeReason}
            onChange={(e) => setChallengeReason(e.target.value)}
          />
          <button
            onClick={handleChallenge}
            disabled={loading || !claimId}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 py-2.5 rounded-xl text-sm font-medium"
          >
            Challenge Resolution
          </button>
        </div>

        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <h2 className="font-semibold text-yellow-300 mb-3">5. resolve_claim again (Reassessment)</h2>
          <button
            onClick={handleResolve}
            disabled={loading || !claimId}
            className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 py-2.5 rounded-xl text-sm font-medium"
          >
            Re-resolve (with challenge reason)
          </button>
        </div>

        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <h2 className="font-semibold text-purple-300 mb-3">6. Verify Results (Views)</h2>
          <button
            onClick={refreshViews}
            disabled={loading || !claimId}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 py-2.5 rounded-xl text-sm font-medium mb-4"
          >
            Refresh All Views
          </button>

          {claimData && (
            <div className="mb-3 text-xs">
              <p className="text-gray-400 mb-1">get_claim</p>
              <pre className="bg-black/40 p-3 rounded-xl overflow-auto max-h-40">
                {JSON.stringify(claimData, null, 2)}
              </pre>
            </div>
          )}
          {resolution && (
            <div className="mb-3 text-xs">
              <p className="text-gray-400 mb-1">get_resolution</p>
              <pre className="bg-black/40 p-3 rounded-xl overflow-auto max-h-40">
                {JSON.stringify(resolution, null, 2)}
              </pre>
            </div>
          )}
          {challenge && (
            <div className="mb-3 text-xs">
              <p className="text-gray-400 mb-1">get_challenge</p>
              <pre className="bg-black/40 p-3 rounded-xl overflow-auto max-h-40">
                {JSON.stringify(challenge, null, 2)}
              </pre>
            </div>
          )}
          {history.length > 0 && (
            <div className="mb-3 text-xs">
              <p className="text-gray-400 mb-1">get_history</p>
              <pre className="bg-black/40 p-3 rounded-xl overflow-auto max-h-40">
                {JSON.stringify(history, null, 2)}
              </pre>
            </div>
          )}
          {stats && (
            <div className="text-xs">
              <p className="text-gray-400 mb-1">get_stats</p>
              <pre className="bg-black/40 p-3 rounded-xl overflow-auto">
                {JSON.stringify(stats, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 text-center text-sm text-gray-500">
        <a href={STUDIO_URL} target="_blank" rel="noreferrer" className="text-indigo-400 underline">
          Open GenLayer Studio
        </a>
        {' • '}
        <a
          href="https://github.com/Aragoorn/genlayer-claimjudge-dapp"
          target="_blank"
          rel="noreferrer"
          className="text-indigo-400 underline"
        >
          GitHub Repository
        </a>
      </div>
    </div>
  )
}
