import type { MetaFunction } from "@remix-run/node";
import Experience from "@features/portfolio/components/Experience";

export const meta: MetaFunction = () => [
  { title: "Desert Portfolio" },
  {
    name: "description",
    content: "A scroll-driven 3D portfolio experience",
  },
];

export default function Page() {
  return <Experience />;
}
