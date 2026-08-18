<img width="1920" height="860" alt="Screenshot (2725)" src="https://github.com/user-attachments/assets/472963b6-be07-4dfa-868d-bba75b37ce18" />
<img width="1920" height="870" alt="Screenshot (2724)" src="https://github.com/user-attachments/assets/de8bdeb4-4def-4308-9cdf-68958246c72a" />
<img width="1920" height="869" alt="Screenshot (2723)" src="https://github.com/user-attachments/assets/fbfdd24d-933b-430b-a1ac-d6013a80f2ee" />
<img width="1920" height="875" alt="test" src="https://github.com/user-attachments/assets/8ffb0612-35f0-4b5a-a7c0-e8908b6a0cd0" />
<img width="1920" height="878" alt="deploy" src="https://github.com/user-attachments/assets/e1334068-1fca-4023-a8de-4edf3c736929" />

# ClaimJudge – AI-Powered Decentralized Claim & Dispute Resolver

**An advanced Intelligent Contract on GenLayer that uses AI consensus to fairly judge real-world claims and disputes.**
## contract address : 0x80106fce8631cA0A8D98b1666810F605888Bf73a
https://explorer-studio.genlayer.com/tx/0xe7134348faa415bc0ea6872e8424f35b8ab359d0d6dd8f921889e866dc61d75e 
https://explorer-studio.genlayer.com/address/0x80106fce8631cA0A8D98b1666810F605888Bf73a 
https://explorer-studio.genlayer.com/tx/0x8c9fb75b1121fee7aab9a79c5a5506d667d157f00496265ca6bd0aa99e20cc8f 
https://explorer-studio.genlayer.com/tx/0x227352d9d3b25d915eaf936a8640e41d47dbf72cdde79e2d60025511b3054cd9 
https://explorer-studio.genlayer.com/tx/0x6e377ce8a3d000e9c1ef06471e998fa779d3225dd80c6f466cac59033b7f464d 
https://explorer-studio.genlayer.com/tx/0xff2417a203cf6e88e6ba86792d6639b5ffb2330fc28e21cf9763bc51ce20305b


## live demo :
https://claimjudge-genlayer.netlify.app/

Built for the GenLayer Builders Program – August 2026.

## Overview

ClaimJudge demonstrates the core power of GenLayer as the **adjudication layer** for the agentic economy.  
Anyone can submit a claim (freelance work, bounty completion, delivery disputes, etc.). The network reaches consensus using LLMs via the Equivalence Principle (`prompt_non_comparative`) and stores a transparent, on-chain judgment.

### Key Features
- Create claims with title, description and optional evidence
- Add extra evidence after creation
- AI resolution using GenLayer’s non-deterministic LLM consensus
- Challenge existing resolutions
- Full on-chain history + statistics
- Clean, production-ready Python code with proper storage patterns

## Contract Address
0x80106fce8631cA0A8D98b1666810F605888Bf73a

## How to run the frontend
```bash
cd frontend
npm install
npm run dev

## How to Use (GenLayer Studio)

1. **create_claim(title, description, evidence_urls)**  
   Creates a new claim and returns the claim_id.

2. **add_evidence(claim_id, extra_urls)** (optional)  
   Adds more evidence to an open claim.

3. **resolve_claim(claim_id)**  
   Triggers AI judgment. Uses `prompt_non_comparative` for reliable consensus.

4. **challenge_resolution(claim_id, reason)**  
   Allows anyone to formally challenge a decision.

### View Methods
- `get_claim(claim_id)`
- `get_resolution(claim_id)`
- `get_challenge(claim_id)`
- `get_claim_count()`
- `get_resolved_count()`
- `get_stats()`

## Example Flow
```text
create_claim(
  "Freelance website redesign completed",
  "I fully completed the website redesign as agreed...",
  ""
)
→ claim_id = 0

resolve_claim(0)
→ AI returns VALID / PARTIALLY_VALID / INVALID with reasoning

Technical HighlightsUses gl.eq_principle.prompt_non_comparative for stable LLM consensus
TreeMap storage with JSON serialization (best practice)
Deterministic timestamps via transaction context
Proper error handling and status management
Fully typed and ready for production use

Future MilestonesFrontend dApp
Payable escrow integration
Multi-party disputes
Reputation system based on past judgments

Project Structure/contracts → Intelligent Contract source
/frontend → Full dApp

Built with  for GenLayer
This project showcases real adjudication use-cases that were previously impossible on traditional blockchains.
