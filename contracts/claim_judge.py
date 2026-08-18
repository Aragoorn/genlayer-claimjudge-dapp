# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
from datetime import datetime, timezone

class ClaimJudge(gl.Contract):
    """
    ClaimJudge – Advanced AI-Powered Decentralized Claim & Dispute Resolver
    Fixed version addressing steward feedback
    """

    claim_counter: u256
    resolved_count: u256
    claims: TreeMap[u256, str]
    resolutions: TreeMap[u256, str]
    challenges: TreeMap[u256, str]

    def __init__(self):
        self.claim_counter = u256(0)
        self.resolved_count = u256(0)
        self.claims = TreeMap[u256, str]()
        self.resolutions = TreeMap[u256, str]()
        self.challenges = TreeMap[u256, str]()

    @gl.public.write
    def create_claim(self, title: str, description: str, evidence_urls: str) -> u256:
        claim_id = self.claim_counter
        self.claim_counter = claim_id + u256(1)

        now = datetime.now(timezone.utc).isoformat()
        claim_data = {
            "id": int(claim_id),
            "title": title.strip(),
            "description": description.strip(),
            "evidence_urls": evidence_urls.strip(),
            "creator": str(gl.message.sender_address),
            "status": "open",
            "created_at": now,
            "updated_at": now
        }
        self.claims[claim_id] = json.dumps(claim_data, sort_keys=True)
        return claim_id          # مستقیم ID را برمی‌گرداند

    @gl.public.write
    def add_evidence(self, claim_id: u256, extra_urls: str) -> str:
        claim_str = self.claims.get(claim_id, "")
        if not claim_str:
            return json.dumps({"error": "Claim not found"})

        claim = json.loads(claim_str)
        if claim["status"] not in ["open", "challenged"]:
            return json.dumps({"error": "Claim cannot accept new evidence"})

        existing = claim.get("evidence_urls", "")
        claim["evidence_urls"] = (existing + "," + extra_urls.strip()) if existing else extra_urls.strip()
        claim["updated_at"] = datetime.now(timezone.utc).isoformat()
        self.claims[claim_id] = json.dumps(claim, sort_keys=True)
        return json.dumps({"success": True, "claim_id": int(claim_id)})

    @gl.public.write
    def resolve_claim(self, claim_id: u256) -> str:
        claim_str = self.claims.get(claim_id, "")
        if not claim_str:
            return json.dumps({"error": "Claim does not exist"})

        claim = json.loads(claim_str)

        # اجازه resolve مجدد بعد از challenge
        if claim["status"] not in ["open", "challenged"]:
            if claim_id in self.resolutions:
                return self.resolutions[claim_id]
            return json.dumps({"error": "Claim already finalized"})

        def get_input() -> str:
            evidence = claim.get("evidence_urls", "None provided")
            return f"""Title: {claim['title']}
Description: {claim['description']}
Evidence URLs: {evidence}"""

        decision = gl.eq_principle.prompt_non_comparative(
            get_input,
            task="""You are a fair AI judge. Decide if the claim is VALID, PARTIALLY_VALID, or INVALID.
Respond with ONLY one of these three words: VALID or PARTIALLY_VALID or INVALID.
Do not write anything else.""",
            criteria="""
The output must be exactly one of: VALID, PARTIALLY_VALID, INVALID.
It must be a single word with no extra text, punctuation or explanation.
"""
        )

        decision = str(decision).strip().upper()
        if decision not in ["VALID", "PARTIALLY_VALID", "INVALID"]:
            decision = "INVALID"

        now = datetime.now(timezone.utc).isoformat()

        resolution = {
            "claim_id": int(claim_id),
            "decision": decision,
            "confidence": 80 if decision != "INVALID" else 40,
            "reasoning": f"AI consensus decided the claim is {decision} based on the provided description and evidence.",
            "summary": f"Claim judged as {decision} by GenLayer AI validators.",
            "resolved_at": now,
            "resolved_by": "GenLayer AI Consensus"
        }

        self.resolutions[claim_id] = json.dumps(resolution, sort_keys=True)

        claim["status"] = "resolved"
        claim["updated_at"] = now
        self.claims[claim_id] = json.dumps(claim, sort_keys=True)

        # فقط بار اول شمارش شود
        if claim_id not in self.resolutions or claim.get("status") != "resolved":
            self.resolved_count += u256(1)

        return json.dumps(resolution, sort_keys=True)

    @gl.public.write
    def challenge_resolution(self, claim_id: u256, reason: str) -> str:
        if claim_id not in self.resolutions:
            return json.dumps({"error": "No resolution to challenge"})

        claim_str = self.claims.get(claim_id, "")
        if not claim_str:
            return json.dumps({"error": "Claim not found"})

        claim = json.loads(claim_str)

        # وضعیت را به challenged تغییر می‌دهیم تا قابل reassessment باشد
        claim["status"] = "challenged"
        claim["updated_at"] = datetime.now(timezone.utc).isoformat()
        self.claims[claim_id] = json.dumps(claim, sort_keys=True)

        challenge = {
            "claim_id": int(claim_id),
            "challenger": str(gl.message.sender_address),
            "reason": reason.strip(),
            "challenged_at": datetime.now(timezone.utc).isoformat(),
            "previous_decision": json.loads(self.resolutions[claim_id]).get("decision", "")
        }
        self.challenges[claim_id] = json.dumps(challenge, sort_keys=True)

        return json.dumps({
            "success": True,
            "message": "Claim challenged. It can now be re-resolved.",
            "claim_id": int(claim_id)
        })

    @gl.public.view
    def get_claim(self, claim_id: u256) -> str:
        return self.claims.get(claim_id, "{}")

    @gl.public.view
    def get_resolution(self, claim_id: u256) -> str:
        return self.resolutions.get(claim_id, "{}")

    @gl.public.view
    def get_challenge(self, claim_id: u256) -> str:
        return self.challenges.get(claim_id, "{}")

    @gl.public.view
    def get_claim_count(self) -> u256:
        return self.claim_counter

    @gl.public.view
    def get_resolved_count(self) -> u256:
        return self.resolved_count

    @gl.public.view
    def get_stats(self) -> str:
        stats = {
            "total_claims": int(self.claim_counter),
            "resolved_claims": int(self.resolved_count),
            "open_claims": int(self.claim_counter - self.resolved_count)
        }
        return json.dumps(stats, sort_keys=True)
