import type { Metadata } from "next";
import ProposalGate from "@/components/proposal/ProposalGate";
import sealed from "@/content/proposals/ai-companions-notes.enc.json";

// Internal notes for a proposal. The content is encrypted in the repo and only decrypted
// in the browser with the password, so nothing readable ships without it.
export const metadata: Metadata = {
  title: "Proposal · Frond Studio",
  robots: { index: false, follow: false, nocache: true },
};

export default function Page() {
  return <ProposalGate sealed={sealed} storageKey="proposal:ai-companions-notes" />;
}
