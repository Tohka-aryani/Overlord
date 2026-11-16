import { describe, expect, it } from "vitest";
import {
  buildTelegramRssUrl,
  htmlToPlainText,
  normalizeTelegramRssItem,
} from "@/lib/ingest/telegram-normalize";

describe("telegram-normalize", () => {
  it("builds RSS URL with limit", () => {
    expect(buildTelegramRssUrl("breachdetect", 50, "https://tg.i-c-a.su/rss")).toBe(
      "https://tg.i-c-a.su/rss/breachdetect?limit=50",
    );
  });

  it("strips HTML and decodes entities", () => {
    const plain = htmlToPlainText(
      '<br/>{<br>  "Source": "<a href="https://x.test/">https://x.test/</a>"<br>}',
    );
    expect(plain).toContain('"Source"');
    expect(plain).toContain("https://x.test/");
    expect(plain).not.toContain("<a");
  });

  it("normalizes RSS item with message id from link", () => {
    const n = normalizeTelegramRssItem(
      {
        link: "https://t.me/breachdetect/1338922",
        pubDate: "Thu, 12 Nov 2026 11:04:26 +0300",
        description:
          '<br/>{<br>  "Content": "test leak"<br>}<br><b>t.me/breachdetect</b>',
      },
      "breachdetect",
    );
    expect(n).not.toBeNull();
    expect(n!.messageId).toBe("1338922");
    expect(n!.channel).toBe("breachdetect");
    expect(n!.postUrl).toBe("https://t.me/breachdetect/1338922");
    expect(n!.text).toContain("test leak");
    expect(n!.postedAt).toBeInstanceOf(Date);
  });

  it("returns null without message id", () => {
    expect(
      normalizeTelegramRssItem(
        { link: "https://t.me/breachdetect", description: "hello" },
        "breachdetect",
      ),
    ).toBeNull();
  });
});
