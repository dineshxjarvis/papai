import { Node, mergeAttributes } from "@tiptap/core";

export const PageBreak = Node.create({
  name: "pageBreak",

  group: "block",

  selectable: true,
  draggable: true,
  atom: true,

  parseHTML() {
    return [
      {
        tag: "div.page-break-divider",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "page-break-divider" }),
      ["div", { class: "page-break-label" }, "PAGE BREAK"],
    ];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
            })
            .insertContent({
              type: "paragraph",
            })
            .run();
        },
    };
  },
});
