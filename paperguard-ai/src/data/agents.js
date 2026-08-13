import {
  Search,
  BookOpen,
  FileSearch,
  Shield,
  ShieldCheck,
} from "lucide-react";

export const agents = [
  {
    id: "claim-detection",
    name: "Claim Detection Agent",
    icon: Search,
    type: "blue",
    status: "ACTIVE",
    description: "Scanning document...",
  },
  {
    id: "research",
    name: "Research Agent",
    icon: BookOpen,
    type: "purple",
    status: "ACTIVE",
    description: "Searching papers...",
  },
  {
    id: "extraction",
    name: "Extraction Agent",
    icon: FileSearch,
    type: "orange",
    status: "ACTIVE",
    description: "Extracting evidence...",
  },
  {
    id: "adversarial",
    name: "Adversarial Agent",
    icon: Shield,
    type: "red",
    status: "ACTIVE",
    description: "Looking for contradictions...",
  },
  {
    id: "verification",
    name: "Verification Agent",
    icon: ShieldCheck,
    type: "green",
    status: "ACTIVE",
    description: "Verifying claims...",
  },
];