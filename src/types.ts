import { SupabaseClient, User } from "@supabase/supabase-js";
import OpenAI from "openai";
import { Assistant } from "openai/resources/beta/assistants";
import { Thread } from "openai/resources/beta/threads/threads";

// --------------- Note types ----------------
export enum NoteType {
  AUDIO = 0,
  TEXT = 1,
  YOUTUBE = 2,
  PDF = 3,
}

export enum NoteStatus {
  DONE = 0,
  LOADING = 1,
  ERROR = 2,
}

export type IBaseLoadingNote = Omit<INote, "created_at"> & {
  status: NoteStatus.LOADING;
};

interface INoteBase {
  created_at: string;
  iconEmoji: string;
  noteSections: string[]; //markdown
  summary: string;
  noteId: string;
  title: string;
  userId: string;
  transcript: string;
  status: NoteStatus;
  assistantId?: string;
  threadId?: string;
}
interface IYoutubeNote extends INoteBase {
  noteType: NoteType.YOUTUBE;
  youtubeUrl: string;
}

interface ITextNote extends INoteBase {
  noteType: NoteType.TEXT;
}

interface IAudioNote extends INoteBase {
  audioDurationMsStr: string;
  noteType: NoteType.AUDIO;
}

interface IPdfNote extends INoteBase {
  noteType: NoteType.PDF;
}

export type INote = IYoutubeNote | ITextNote | IAudioNote | IPdfNote;
// --------------- Chat server types ----------------

export enum ChatRequestType {
  LOGIN = 0,
  MESSAGE = 1,
}

export type IChatServerLoginReq = {
  type: ChatRequestType.LOGIN;
  token: string;
  noteId: string;
};

export type IChatServerMessageReq = {
  type: ChatRequestType.MESSAGE;
  message: string;
};

export type IChatServerRequest = IChatServerLoginReq | IChatServerMessageReq;

export enum ChatResponseType {
  LOGIN = 0,
  MESSAGE_UPDATE = 1,
  ERROR = 2,
}

export type IChatServerLoginRes = {
  type: ChatResponseType.LOGIN;
  success: boolean;
  messages?: IChatMessage[];
};

export type IChatMessage = {
  role: "user" | "assistant";
  text: string;
  date: number;
};

export type IChatServerMessageRes = {
  type: ChatResponseType.MESSAGE_UPDATE;
  messages: IChatMessage[];
};

export type IChatServerErrorRes = {
  type: ChatResponseType.ERROR;
  error: string;
};

export type IChatServerResponse =
  | IChatServerLoginRes
  | IChatServerMessageRes
  | IChatServerErrorRes;

// Chat funcs

export type IGetSupabaseData = (props: {
  supabase: SupabaseClient;
  message: IChatServerLoginReq;
}) => Promise<{ note: INote; user: User }>;

export type IGetOrCreateAssistant = (props: {
  supabase: SupabaseClient;
  note: INote;
  openAiClient: OpenAI;
}) => Promise<{ assistant: Assistant }>;

export type IGetOrCreateThread = (props: {
  supabase: SupabaseClient;
  note: INote;
  openAiClient: OpenAI;
}) => Promise<{ thread: Thread }>;
