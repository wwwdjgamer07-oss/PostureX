import dynamic from "next/dynamic";

const PXPlayClient = dynamic(
  () => import("@/components/pxplay/PXPlayClient").then((module) => module.PXPlayClient),
  { ssr: false }
);

export default function PXPlayPage() {
  return <PXPlayClient />;
}
