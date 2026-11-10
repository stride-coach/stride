import { createCn } from "cn/config";

export const cn = createCn({
  extend: {
    theme: {
      text: [
        "display",
        "metric",
        "verdict",
        "title",
        "body-lg",
        "body",
        "label",
        "micro",
      ],
      radius: ["mark"],
      spacing: [
        "row",
        "row-touch",
        "control",
        "control-touch",
        "control-auto",
        "topbar",
        "header",
        "sidebar",
        "rail",
        "panel",
      ],
      shadow: ["float"],
    },
  },
});
