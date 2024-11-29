import OpenAI from "openai";
import { IChatMessage } from "./types";

export function getMessagesFromThreadData(
  data: OpenAI.Beta.Threads.Messages.MessagesPage
): IChatMessage[] {
  return data.data.map((v) => {
    return {
      role: v.role,
      //   TODO handle this better
      text: v.content[0].type === "text" ? v.content[0].text.value : "",
    };
  });
}
