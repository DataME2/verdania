import { ComingSoon, comingSoonMetadata } from "@/components/coming-soon";

export const metadata = comingSoonMetadata("/market");

export default function Page() {
  return <ComingSoon href="/market" />;
}
