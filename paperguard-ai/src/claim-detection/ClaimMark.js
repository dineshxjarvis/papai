import { Mark, mergeAttributes } from "@tiptap/core";

export const ClaimMark = Mark.create({
  name: "claimMark",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      claimId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-claim-id"),
        renderHTML: (attrs) => {
          if (!attrs.claimId) return {};
          return { "data-claim-id": attrs.claimId };
        },
      },
      claimType: {
        default: "yellow",
        parseHTML: (el) => el.getAttribute("data-claim-type") || "yellow",
        renderHTML: (attrs) => ({
          "data-claim-type": attrs.claimType || "yellow",
        }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: "mark[data-claim-id]" },
      { tag: "mark.claim-yellow" },
      { tag: "mark.claim-green" },
      { tag: "mark.claim-red" },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const type = HTMLAttributes["data-claim-type"] || "yellow";
    return [
      "mark",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: `claim-mark claim-${type}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setClaimMark:
        (attributes) =>
        ({ commands }) =>
          commands.setMark(this.name, attributes),
      toggleClaimMark:
        (attributes) =>
        ({ commands }) =>
          commands.toggleMark(this.name, attributes),
      unsetClaimMark:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});

export default ClaimMark;
