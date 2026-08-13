import { useState } from "react";

export default function useAIPanel() {
  const [isOpen, setIsOpen] = useState(false);

  const [activeTab, setActiveTab] = useState(
    "analysis"
  );

  const [selectedText, setSelectedText] = useState("");

  const openPanel = () => {
    setIsOpen(true);
  };

  const closePanel = () => {
    setIsOpen(false);
  };

  const togglePanel = () => {
    setIsOpen((previous) => !previous);
  };

  const changeTab = (tab) => {
    setActiveTab(tab);
  };

  const analyzeText = (text) => {
    setSelectedText(text);
    setIsOpen(true);
    setActiveTab("analysis");
  };

  return {
    isOpen,
    activeTab,
    selectedText,

    openPanel,
    closePanel,
    togglePanel,

    changeTab,
    analyzeText,
  };
}
