import { useState, useEffect } from 'react'
import { createClient, createAccount } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'

const CONTRACT = '0x8A8B387C84552863c077C3085dF719E6DA42d673'

const account = createAccount()
const client = createClient({
  chain: studionet,
  account,
})

export default function App() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [evidence, setEvidence] = useState('')
  const [claimId, setClaimId] = useState<number | null>(null)
  const [extraEvidence, setExtraEvidence] = useState('')
  const [challengeReason, setChallengeReason] = useState('')
  const [resolution, setResolution] = useState<any>(null)
  const [challenge, setChallenge] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [status, setStatus] = useState('Initializing...')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        await client.initializeConsensusSmartContract()
        setReady(true)
        setStatus('Ready')
        await loadStats()
      } catch (err: any) {
        setStatus('Init failed: ' + (err.message || err))
      }
    }
    init()
  }, [])

  const loadStats = async () => {
    try {
      const res = await client.readContract({
        address: CONTRACT,
        functionName: 'get_stats',
        args: [],
      })
      setStats(JSON.parse(res as string))
    } catch {}
  }

  // ===== اصلاح اصلی Receipt Handling =====
  const getReturnValue = (receipt: any): number => {
    // پشتیبانی از ساختارهای مختلف genlayer-js
    if (receipt?.executionResult !== undefined && receipt.executionResult !== null) {
      return Number(receipt.executionResult)
    }
    if (receipt?.result !== undefined && receipt.result !== null) {
      return Number(receipt.result)
    }
    if (receipt?.data !== undefined && receipt.data !== null) {
      return Number(receipt.data)
    }
    // fallback: خواندن از قرارداد
    return -1
  }

  const createClaim = async () => {
    if (!title.trim() || !description.trim()) return alert('Title & Description required')
    setLoading(true)
    setStatus('Creating claim...')
    try {
      await client.initializeConsensusSmartContract()
      const hash = await client.writeContract({
        address: CONTRACT,
        functionName: 'create_claim',
        args: [title.trim(), description.trim(), evidence.trim() || ''],
        value: 0n,
      })

      setStatus('Waiting for FINALIZED...')
      const receipt = await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.FINALIZED,
        retries: 120,
        interval: 3000,
      })

      let newId = getReturnValue(receipt)

      // اگر از receipt نتوانستیم بخوانیم، از قرارداد می‌خوانیم
      if (newId < 0) {
        const count = await client.readContract({
          address: CONTRACT,
          functionName: 'get_claim_count',
          args: [],
        })
        newId = Number(count) - 1
      }

      setClaimId(newId)
      setStatus(`Claim #${newId} created successfully`)
      await loadStats()
    } catch (err: any) {
      setStatus('Error: ' + (err?.message || JSON.stringify(err)))
    } finally {
      setLoading(false)
    }
  }

  const addEvidence = async () => {
    if (claimId === null || !extraEvidence.trim()) return
    setLoading(true)
    setStatus('Adding evidence...')
    try {
      await client.initializeConsensusSmartContract()
      const hash = await client.writeContract({
        address: CONTRACT,
        functionName: 'add_evidence',
        args: [claimId, extraEvidence.trim()],
        value: 0n,
      })
      await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.FINALIZED,
        retries: 80,
        interval: 3000,
      })
      setStatus('Evidence added successfully')
    } catch (err: any) {
      setStatus('Error: ' + (err?.message || err))
    } finally {
      setLoading(false)
    }
  }

  const resolveClaim = async () => {
    if (claimId === null) return
    setLoading(true)
    setStatus('AI judging... (this may take 30-90 seconds)')
    try {
      await client.initializeConsensusSmartContract()
      const hash = await client.writeContract({
        address: CONTRACT,
        functionName: 'resolve_claim',
        args: [claimId],
        value: 0n,
      })
      await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.FINALIZED,
        retries: 180,
        interval: 4000,
      })

      const res = await client.readContract({
        address: CONTRACT,
        functionName: 'get_resolution',
        args: [claimId],
      })
      setResolution(JSON.parse(res as string))

      // خواندن تاریخچه
      try {
        const hist = await client.readContract({
          address: CONTRACT,
          functionName: 'get_history',
          args: [claimId],
        })
        setHistory(JSON.parse(hist as string))
      } catch {}

      setStatus('Claim resolved')
      await loadStats()
    } catch (err: any) {
      setStatus('Error: ' + (err?.message || err))
    } finally {
      setLoading(false)
    }
  }

  const challengeClaim = async () => {
    if (claimId === null || !challengeReason.trim()) return
    setLoading(true)
    setStatus('Submitting challenge...')
    try {
      await client.initializeConsensusSmartContract()
      const hash = await client.writeContract({
        address: CONTRACT,
        functionName: 'challenge_resolution',
        args: [claimId, challengeReason.trim()],
        value: 0n,
      })
      await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.FINALIZED,
        retries: 80,
        interval: 3000,
      })

      const res = await client.readContract({
        address: CONTRACT,
        functionName: 'get_challenge',
        args: [claimId],
      })
      setChallenge(JSON.parse(res as string))
      setStatus('Challenged successfully – you can now re-resolve')
    } catch (err: any) {
      setStatus('Error: ' + (err?.message || err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          ClaimJudge
        </h1>
        <p className="text-gray-300 mt-2">AI-Powered Decentralized Claim & Dispute Resolver</p>
        <p className="text-xs text-gray-500 mt-1 break-all">{CONTRACT}</p>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
            <div className="text-2xl font-bold">{stats.total_claims}</div>
            <div className="text-sm text-gray-400">Total</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
            <div className="text-2xl font-bold text-green-400">{stats.resolved_claims}</div>
            <div className="text-sm text-gray-400">Resolved</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
            <div className="text-2xl font-bold text-yellow-400">{stats.open_claims}</div>
            <div className="text-sm text-gray-400">Open</div>
          </div>
        </div>
      )}

      {/* Create */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
        <h2 className="text-xl font-semibold mb-4">1. Create Claim</h2>
        <input
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 mb-3"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <textarea
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 mb-3"
          rows={3}
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <input
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 mb-4"
          placeholder="Evidence URLs (optional)"
          value={evidence}
          onChange={e => setEvidence(e.target.value)}
        />
        <button
          onClick={createClaim}
          disabled={loading || !ready}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 py-3 rounded-xl font-semibold disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Create Claim'}
        </button>
      </div>

      {claimId !== null && (
        <>
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
            <h2 className="text-xl font-semibold mb-4">2. Add Evidence (Claim #{claimId})</h2>
            <input
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 mb-4"
              placeholder="Extra evidence URLs"
              value={extraEvidence}
              onChange={e => setExtraEvidence(e.target.value)}
            />
            <button
              onClick={addEvidence}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              Add Evidence
            </button>
          </div>

          <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
            <h2 className="text-xl font-semibold mb-4">3. Resolve with AI</h2>
            <button
              onClick={resolveClaim}
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              {loading ? 'AI Judging...' : 'Resolve Claim'}
            </button>
          </div>

          <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
            <h2 className="text-xl font-semibold mb-4">4. Challenge Resolution</h2>
            <textarea
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 mb-4"
              rows={2}
              placeholder="Reason for challenge (min 10 characters)"
              value={challengeReason}
              onChange={e => setChallengeReason(e.target.value)}
            />
            <button
              onClick={challengeClaim}
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              Challenge & Request Reassessment
            </button>
          </div>
        </>
      )}

      {resolution && (
        <div className="bg-white/5 rounded-2xl p-6 border border-green-500/40 mb-6">
          <h2 className="text-xl font-semibold text-green-400 mb-3">Latest Resolution</h2>
          <p><span className="text-gray-400">Decision:</span> <strong>{resolution.decision}</strong></p>
          <p className="mt-1"><span className="text-gray-400">Summary:</span> {resolution.summary}</p>
          {resolution.is_reassessment && (
            <p className="mt-2 text-sm text-yellow-400">This is a reassessment</p>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="bg-white/5 rounded-2xl p-6 border border-blue-500/40 mb-6">
          <h2 className="text-xl font-semibold text-blue-400 mb-3">Decision History</h2>
          {history.map((h, i) => (
            <div key={i} className="mb-2 text-sm">
              #{i + 1}: <strong>{h.decision}</strong> {h.is_reassessment ? '(Reassessment)' : ''} – {h.resolved_at}
            </div>
          ))}
        </div>
      )}

      {challenge && (
        <div className="bg-white/5 rounded-2xl p-6 border border-orange-500/40">
          <h2 className="text-xl font-semibold text-orange-400 mb-3">Challenge</h2>
          <p><span className="text-gray-400">Reason:</span> {challenge.reason}</p>
          <p className="mt-1 text-sm text-gray-400">Previous Decision: {challenge.previous_decision}</p>
        </div>
      )}

      <p className="text-center mt-8 text-gray-400 text-sm">{status}</p>
    </div>
  )
}
