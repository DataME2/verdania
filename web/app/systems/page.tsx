import { ComingSoon, comingSoonMetadata } from "@/components/coming-soon";

export const metadata = comingSoonMetadata("/systems");

export default function Page() {
  return <ComingSoon href="/systems" />;
}
