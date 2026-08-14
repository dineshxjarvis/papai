import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { PageBreak } from "./PageBreakExtension";
import { ClaimMark } from "../claim-detection/ClaimMark";

export const editorExtensions = [
  StarterKit,
  Underline,
  TextStyle,
  FontFamily,
  Color,
  Highlight.configure({
    multicolor: true,
  }),
  Subscript,
  Superscript,
  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableHeader,
  TableCell,
  Image.configure({
    inline: true,
    allowBase64: true,
  }),
  Link.configure({
    openOnClick: false,
  }),
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
  PageBreak,
  ClaimMark,
];
