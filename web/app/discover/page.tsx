import { ComingSoon, comingSoonMetadata } from "@/components/coming-soon";

export const metadata = comingSoonMetadata("/discover");

export default function Page() {
  return <ComingSoon href="/discover" />;
}
