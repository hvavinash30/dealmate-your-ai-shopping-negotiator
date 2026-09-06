import { motion } from "motion/react";
import { useEffect, useRef } from "react";

import { messageIn } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { AGENT_META, type ChatMessage } from "@/types";

interface MessageStreamProps {
  messages: ChatMessage[];
  thinking: boolean;
}

export function MessageStream({ messages, thinking }: MessageStreamProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, thinking]);

  return (
    <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-6">
      {messages.map((message) => {
        const meta = message.agent ? AGENT_META[message.agent] : null;
        const isUser = message.role === "user";

        return (
          <motion.div
            key={message.id}
            variants={messageIn}
            initial="hidden"
            animate="show"
            className={cn("max-w-2xl", isUser && "ml-auto text-right")}
          >
            <p className={cn("label-mono", isUser ? "text-muted-foreground" : meta?.token)}>
              {isUser ? "YOU" : (meta?.label ?? "DEALMATE")}
            </p>
            <p
              className={cn(
                "mt-1.5 text-[15px] leading-relaxed",
                isUser ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {message.content}
            </p>
          </motion.div>
        );
      })}

      {thinking ? (
        <div className="flex items-center gap-1.5" aria-live="polite">
          <span className="label-mono text-muted-foreground">THINKING</span>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-1.5 rounded-full bg-primary"
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
            />
          ))}
        </div>
      ) : null}

      <div ref={endRef} />
    </div>
  );
}
