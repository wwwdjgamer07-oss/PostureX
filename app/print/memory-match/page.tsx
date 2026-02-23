import type { Metadata } from "next";
import MemoryMatchPrintClient from "./MemoryMatchPrintClient";

export const metadata: Metadata = {
  title: "Memory Match Print Sheet",
  description: "Printable premium Memory Match card game."
};

export default function MemoryMatchPrintPage() {
  return <MemoryMatchPrintClient />;
}
