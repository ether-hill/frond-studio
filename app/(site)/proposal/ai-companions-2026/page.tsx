import type { Metadata } from "next";
import ProposalGate from "@/components/proposal/ProposalGate";
import RevealRoot from "@/components/RevealRoot";
import sealed from "@/content/proposals/ai-companions.enc.json";

// A private proposal. The content is encrypted in the repo and only decrypted
// in the browser with the password, so nothing readable ships without it.
export const metadata: Metadata = {
  title: "Proposal · Frond Studio",
  robots: { index: false, follow: false, nocache: true },
};

export default function Page() {
  // RevealRoot runs the site motion, which also reveals the shared footer.
  return (
    <RevealRoot>
      <ProposalGate sealed={sealed} storageKey="proposal:ai-companions" />
    </RevealRoot>
  );
}
