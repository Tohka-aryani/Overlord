import { Suspense } from "react";
import { connection } from "next/server";
import { TelegramClient } from "@/components/telegram/TelegramClient";
import { queryTelegram } from "@/lib/telegram-query";

async function TelegramBody() {
  await connection();
  const initial = await queryTelegram({ channel: "breachdetect", limit: 300 });
  return <TelegramClient initial={initial} />;
}

export default function TelegramPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Suspense
        fallback={
          <p className="px-4 py-8 text-sm text-[var(--muted)]">
            Loading Telegram archive…
          </p>
        }
      >
        <TelegramBody />
      </Suspense>
    </div>
  );
}
