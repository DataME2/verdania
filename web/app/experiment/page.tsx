import { ComingSoon, comingSoonMetadata } from "@/components/coming-soon";

export const metadata = comingSoonMetadata("/experiment");

export default function Page() {
  return <ComingSoon href="/experiment" />;
}
