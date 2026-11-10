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
    },
  },
});
