import { ComingSoon, comingSoonMetadata } from "@/components/coming-soon";

export const metadata = comingSoonMetadata("/people");

export default function Page() {
  return <ComingSoon href="/people" />;
}
