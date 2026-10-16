import { ComingSoon, comingSoonMetadata } from "@/components/coming-soon";

export const metadata = comingSoonMetadata("/justice");

export default function Page() {
  return <ComingSoon href="/justice" />;
}
