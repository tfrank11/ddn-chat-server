import { User } from "@supabase/supabase-js";
import { IGetOrCreateAssistant, IGetSupabaseData, INote } from "./types";

export const getSupabaseData: IGetSupabaseData = async ({
  supabase,
  message,
}) => {
  let user: User | null = null;

  // GET USER FROM TOKEN
  const userResponse = await supabase.auth.getUser(message.token);
  if (!userResponse.data.user) {
    throw new Error("could not authenticate");
  }
  user = userResponse.data.user;

  // GET NOTE
  const { data, error } = await supabase
    .from("notes")
    .select()
    .eq("noteId", message.noteId);
  if (error) {
    throw error;
  }
  const note = data[0] as INote;
  if (!note) {
    throw new Error("could not find note");
  }

  return { user, note };
};

export const getOrCreateAssistant: IGetOrCreateAssistant = async ({
  supabase,
  openAiClient,
  note,
}) => {
  if (note.assistantId) {
    const assistant = await openAiClient.beta.assistants.retrieve(
      note.assistantId
    );
    return { assistant };
  }

  // per docs, max instructions length is 256k chars
  const transcript =
    note.transcript.length > 250000
      ? note.transcript.slice(0, 250000)
      : note.transcript;

  const instructions = `
    Please answer questions about the document.
    Only use knowledge in this document. 
    If you cannot find an answer in the text, say you dont know. Do not make any inferences. 
    Only answer what you are 100% sure is true based on the text. 
    If you cite something that isnt directly from the document, i will get fired and a small puppy will die! 
 
    Here is the document: ${transcript}

  `;

  const assistant = await openAiClient.beta.assistants.create({
    name: "Note Assistant",
    instructions,
    model: "gpt-4o-mini",
  });

  const { error } = await supabase
    .from("notes")
    .update({ assistantId: assistant.id })
    .eq("noteId", note.noteId);

  if (error) {
    throw error;
  }

  return { assistant };
};
