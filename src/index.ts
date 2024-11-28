import express, { Express, Request, Response } from "express";
import { createClient, User } from "@supabase/supabase-js";
import OpenAI from "openai";
import dotenv from "dotenv";
import WebSocket from "ws";
import {
  ChatRequestType,
  ChatResponseType,
  IChatServerErrorRes,
  IChatServerLoginRes,
  IChatServerMessageRes,
  IChatServerRequest,
  INote,
} from "./types";
import { getOrCreateAssistant, getSupabaseData } from "./chat";
import { Assistant } from "openai/resources/beta/assistants";
import { Thread } from "openai/resources/beta/threads/threads";

dotenv.config();

const supabase = createClient(
  process.env["SUPABASE_URL"] ?? "",
  process.env["SUPABASE_KEY"] ?? ""
);

const openAiClient = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

const app: Express = express();
const port = Number(process.env.PORT) || 3001;

const wss = new WebSocket.Server({ port });

wss.on("connection", (ws: WebSocket) => {
  console.log("New connection");
  let user: User | null = null;
  let assistant: Assistant | null = null;
  let thread: Thread | null = null;

  ws.on("message", async (msg: MessageEvent) => {
    try {
      const message = JSON.parse(String(msg)) as IChatServerRequest;
      if (message.type === ChatRequestType.LOGIN) {
        if (user) {
          throw new Error("already logged in");
        }
        const supabaseData = await getSupabaseData({ supabase, message });
        const openAiData = await getOrCreateAssistant({
          supabase,
          openAiClient,
          note: supabaseData.note,
        });

        user = supabaseData.user;
        console.log("Authed", user.id, user.email);
        assistant = openAiData.assistant;
        thread = await openAiClient.beta.threads.create();

        const ackMsg: IChatServerLoginRes = {
          type: ChatResponseType.LOGIN,
          success: true,
        };
        ws.send(JSON.stringify(ackMsg));
      } else if (message.type === ChatRequestType.MESSAGE) {
        if (!user) {
          throw new Error("not yet logged in");
        }
        if (!assistant) {
          throw new Error("assistant not set up");
        }
        if (!thread) {
          throw new Error("thread not set up");
        }
        await openAiClient.beta.threads.messages.create(thread.id, {
          role: "user",
          content: message.message,
        });
        await openAiClient.beta.threads.runs.createAndPoll(thread.id, {
          assistant_id: assistant.id,
        });
        const messagesResponse = await openAiClient.beta.threads.messages.list(
          thread.id
        );
        const msgResp: IChatServerMessageRes = {
          type: ChatResponseType.MESSAGE_UPDATE,
          messages: messagesResponse.data.map((v) => {
            return {
              role: v.role,
              //   TODO handle this better
              text: v.content[0].type === "text" ? v.content[0].text.value : "",
            };
          }),
        };
        ws.send(JSON.stringify(msgResp));
      } else {
        throw new Error("unrecognized message type");
      }
    } catch (err) {
      const errorMsg: IChatServerErrorRes = {
        type: ChatResponseType.ERROR,
        error: String(err),
      };
      ws.send(JSON.stringify(errorMsg));
    }
  });

  ws.on("close", () => {
    console.log("Connection closed", user?.id, user?.email);
  });
});
