import { ComingSoon, comingSoonMetadata } from "@/components/coming-soon";

export const metadata = comingSoonMetadata("/community");

export default function Page() {
  return <ComingSoon href="/community" />;
}
