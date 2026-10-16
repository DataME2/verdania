import { ComingSoon, comingSoonMetadata } from "@/components/coming-soon";

export const metadata = comingSoonMetadata("/methodology");

export default function Page() {
  return <ComingSoon href="/methodology" />;
}
