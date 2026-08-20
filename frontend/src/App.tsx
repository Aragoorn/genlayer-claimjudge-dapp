import { useState, useEffect } from 'react'
import { createClient, createAccount } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'

// آدرس قرارداد نهایی خودت را اینجا بگذار
const CONTRACT = '0x8A8B387C84552863c077C3085dF719E6DA42d673'

const account = createAccount()
const client = createClient({
  chain: studionet,
  account,
})

export default function App() {
  // Form states
  const [title, setTitle] = useState('Insurance Claim for Car Accident')
  const [description, setDescription] = useState(
    'The policyholder was involved in a car accident on 2026-08-15. The other driver was at fault. All documents have been submitted.'
  )
  const [evidence, setEvidence] = useState(
    'https://example.com/police-report.pdf, https://example.com/photos.zip'
  )
  const [extraEvidence, setExtraEvidence] = useState('https://example.com/medical-report.pdf')
  const [challengeReason, setChallengeReason] = useState(
    'The AI decision did not properly consider the police report that clearly shows the other driver was at fault. Please reassess with more weight on the official documents.'
  )

  // Data states
  const [claimId, setClaimId] = useState<number | null>(null)
  const [claimData, setClaimData] = useState<any>(null)
  const [resolution, setResolution] = useState<any>(null)
  const [challenge, setChallenge] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)

  // UI states
  const [status, setStatus] = useState('Initializing...')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 12))
  }

  useEffect(() => {
    const init = async () => {
      try {
        await client.initializeConsensusSmartContract()
        setReady(true)
        setStatus('Ready – Start with Step 1')
        addLog('Client initialized')
        await loadStats()
      } catch (err: any) {
        setStatus('Init failed: ' + (err?.message || String(err)))
        addLog('Init error: ' + (err?.message || String(err)))
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
      setStats(JSON.parse(String(res)))
    } catch (e) {
      console.error(e)
    }
  }

  // ===== Robust claim ID extraction =====
  const extractClaimId = async (receipt: any): Promise<number> => {
    const candidates = [
      receipt?.executionResult,
      receipt?.result,
      receipt?.returnValue,
      receipt?.data,
      receipt?.output,
    ]
    for (const c of candidates) {
      if (c !== undefined && c !== null && c !== '') {
        const n = Number(c)
        if (!Number.isNaN(n) && n >= 0) return n
      }
    }
    // Fallback
    const count = await client.readContract({
      address: CONTRACT,
      functionName: 'get_claim_count',
      args: [],
    })
    return Math.max(0, Number(count) - 1)
  }

  // ===== Refresh all data for a claim =====
  const refreshAll = async (id: number) => {
    try {
      const [c, r, ch, h] = await Promise.all([
        client.readContract({ address: CONTRACT, functionName: 'get_claim', args: [id] }),
        client.readContract({ address: CONTRACT, functionName: 'get_resolution', args: [id] }),
        client.readContract({ address: CONTRACT, functionName: 'get_challenge', args: [id] }),
        client.readContract({ address: CONTRACT, functionName: 'get_history', args: [id] }),
      ])

      const claim = JSON.parse(String(c) || '{}')
      const reso = JSON.parse(String(r) || '{}')
      const chal = JSON.parse(String(ch) || '{}')
      const hist = JSON.parse(String(h) || '[]')

      setClaimData(Object.keys(claim).length ? claim : null)
      setResolution(Object.keys(reso).length ? reso : null)
      setChallenge(Object.keys(chal).length ? chal : null)
      setHistory(Array.isArray(hist) ? hist : [])
    } catch (e) {
      console.error('refreshAll error', e)
      addLog('Failed to refresh claim data')
    }
  }

  // ====================== STEP 1 ======================
  const createClaim = async () => {
    if (!title.trim() || !description.trim()) {
      alert('Title and Description are required')
      return
    }
    setLoading(true)
    setStatus('Step 1: Creating claim...')
    addLog('Sending create_claim...')
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

      const newId = await extractClaimId(receipt)
      setClaimId(newId)
      setStatus(`Step 1 done → Claim ID = ${newId}`)
      addLog(`Claim created with ID: ${newId}`)
      await refreshAll(newId)
      await loadStats()
    } catch (err: any) {
      const msg = err?.message || err?.shortMessage || JSON.stringify(err)
      setStatus('Error: ' + msg)
      addLog('create_claim error: ' + msg)
    } finally {
      setLoading(false)
    }
  }

  // ====================== STEP 2 ======================
  const addEvidence = async () => {
    if (claimId === null) return alert('Create a claim first')
    if (!extraEvidence.trim()) return alert('Enter extra evidence URLs')
    setLoading(true)
    setStatus('Step 2: Adding evidence...')
    addLog('Sending add_evidence...')
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
      setStatus('Step 2 done – Evidence added')
      addLog('Evidence added')
      await refreshAll(claimId)
    } catch (err: any) {
      setStatus('Error: ' + (err?.message || String(err)))
      addLog('add_evidence error')
    } finally {
      setLoading(false)
    }
  }

  // ====================== STEP 3 & 5 ======================
  const resolveClaim = async () => {
    if (claimId === null) return alert('Create a claim first')
    setLoading(true)
    setStatus('AI is judging the claim... (30–90 seconds)')
    addLog('Sending resolve_claim...')
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

      await refreshAll(claimId)
      setStatus('Resolve finished – check results below')
      addLog('resolve_claim finalized')
      await loadStats()
    } catch (err: any) {
      setStatus('Error: ' + (err?.message || String(err)))
      addLog('resolve_claim error')
    } finally {
      setLoading(false)
    }
  }

  // ====================== STEP 4 ======================
  const challengeClaim = async () => {
    if (claimId === null) return alert('Create a claim first')
    if (challengeReason.trim().length < 10) return alert('Challenge reason too short')
    setLoading(true)
    setStatus('Step 4: Submitting challenge...')
    addLog('Sending challenge_resolution...')
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

      await refreshAll(claimId)
      setStatus('Step 4 done – Challenge submitted. Now run Resolve again (Step 5)')
      addLog('Challenge submitted')
    } catch (err: any) {
      setStatus('Error: ' + (err?.message || String(err)))
      addLog('challenge error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          ClaimJudge
        </h1>
        <p className="text-gray-300 mt-1">Full Lifecycle Test (Steps 1–7)</p>
        <p className="text-xs text-gray-500 mt-1 break-all">{CONTRACT}</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
            <div className="text-xl font-bold">{stats.total_claims}</div>
            <div className="text-xs text-gray-400">Total</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
            <div className="text-xl font-bold text-green-400">{stats.resolved_claims}</div>
            <div className="text-xs text-gray-400">Resolved</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
            <div className="text-xl font-bold text-yellow-400">{stats.open_claims}</div>
            <div className="text-xs text-gray-400">Open</div>
          </div>
        </div>
      )}

      {/* Current Claim ID */}
      {claimId !== null && (
        <div className="bg-indigo-500/20 border border-indigo-500/40 rounded-xl p-3 mb-6 text-center">
          <span className="text-sm text-gray-300">Current Claim ID:</span>{' '}
          <span className="text-2xl font-bold text-indigo-300">{claimId}</span>
        </div>
      )}

      {/* STEP 1 */}
      <div className="bg-white/5 rounded-2xl p-5 border border-white/10 mb-5">
        <h2 className="font-semibold text-indigo-300 mb-3">Step 1 – Create Claim</h2>
        <input
          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 mb-2 text-sm"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title"
        />
        <textarea
          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 mb-2 text-sm"
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Description"
        />
        <input
          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 mb-3 text-sm"
          value={evidence}
          onChange={e => setEvidence(e.target.value)}
          placeholder="Evidence URLs"
        />
        <button
          onClick={createClaim}
          disabled={loading || !ready}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 py-2.5 rounded-xl font-medium disabled:opacity-50"
        >
          {loading ? 'Processing...' : '1. Create Claim'}
        </button>
      </div>

      {/* STEP 2 */}
      <div className="bg-white/5 rounded-2xl p-5 border border-white/10 mb-5">
        <h2 className="font-semibold text-blue-300 mb-3">Step 2 – Add Evidence</h2>
        <input
          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 mb-3 text-sm"
          value={extraEvidence}
          onChange={e => setExtraEvidence(e.target.value)}
          placeholder="Extra evidence URLs"
        />
        <button
          onClick={addEvidence}
          disabled={loading || claimId === null}
          className="w-full bg-blue-600 hover:bg-blue-700 py-2.5 rounded-xl font-medium disabled:opacity-50"
        >
          2. Add Evidence
        </button>
      </div>

      {/* STEP 3 & 5 */}
      <div className="bg-white/5 rounded-2xl p-5 border border-white/10 mb-5">
        <h2 className="font-semibold text-green-300 mb-3">Step 3 & 5 – Resolve / Reassess</h2>
        <button
          onClick={resolveClaim}
          disabled={loading || claimId === null}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 py-2.5 rounded-xl font-medium disabled:opacity-50"
        >
          {loading ? 'AI Judging...' : '3 / 5. Resolve Claim (or Reassess)'}
        </button>
      </div>

      {/* STEP 4 */}
      <div className="bg-white/5 rounded-2xl p-5 border border-white/10 mb-5">
        <h2 className="font-semibold text-orange-300 mb-3">Step 4 – Challenge Resolution</h2>
        <textarea
          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 mb-3 text-sm"
          rows={3}
          value={challengeReason}
          onChange={e => setChallengeReason(e.target.value)}
          placeholder="Challenge reason"
        />
        <button
          onClick={challengeClaim}
          disabled={loading || claimId === null}
          className="w-full bg-orange-600 hover:bg-orange-700 py-2.5 rounded-xl font-medium disabled:opacity-50"
        >
          4. Challenge & Request Reassessment
        </button>
      </div>

      {/* ================= RESULTS ================= */}
      {claimData && (
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10 mb-5">
          <h2 className="font-semibold text-slate-300 mb-2">Claim Data</h2>
          <p className="text-sm"><span className="text-gray-400">Status:</span> {claimData.status}</p>
          <p className="text-sm mt-1"><span className="text-gray-400">Evidence:</span> {claimData.evidence_urls || '—'}</p>
        </div>
      )}

      {resolution && (
        <div className="bg-white/5 rounded-2xl p-5 border border-green-500/40 mb-5">
          <h2 className="font-semibold text-green-400 mb-2">Latest Resolution</h2>
          <p><span className="text-gray-400">Decision:</span> <strong className="text-lg">{resolution.decision || '—'}</strong></p>
          <p className="mt-1 text-sm"><span className="text-gray-400">Summary:</span> {resolution.summary || '—'}</p>
          {resolution.is_reassessment && (
            <div className="mt-2 text-sm text-yellow-300">
              <p>Reassessment: true</p>
              <p>Previous Decision: {resolution.previous_decision || '—'}</p>
              <p>Challenge Reason: {resolution.challenge_reason || '—'}</p>
            </div>
          )}
        </div>
      )}

      {challenge && (
        <div className="bg-white/5 rounded-2xl p-5 border border-orange-500/40 mb-5">
          <h2 className="font-semibold text-orange-400 mb-2">Challenge</h2>
          <p className="text-sm"><span className="text-gray-400">Reason:</span> {challenge.reason || '—'}</p>
          <p className="text-sm mt-1"><span className="text-gray-400">Previous Decision:</span> {challenge.previous_decision || '—'}</p>
        </div>
      )}

      {history.length > 0 && (
        <div className="bg-white/5 rounded-2xl p-5 border border-blue-500/40 mb-5">
          <h2 className="font-semibold text-blue-400 mb-2">Decision History (Step 6)</h2>
          {history.map((h, i) => (
            <div key={i} className="text-sm mb-1">
              #{i + 1}: <strong>{h.decision}</strong>
              {h.is_reassessment ? ' (Reassessment)' : ''} – {h.resolved_at}
            </div>
          ))}
        </div>
      )}

      {/* Status + Logs */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-300 mb-3">{status}</p>
        {logs.length > 0 && (
          <div className="bg-black/40 rounded-xl p-3 text-left text-xs text-gray-400 max-h-40 overflow-y-auto">
            {logs.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
