import { supabase } from './supabase';
import type { Ciphertext } from './crypto';
import { generateConversationKey, exportKey } from './crypto';

export interface Contact {
  id: string;
  name: string;
  handle: string;
  avatarHue: number;
  online: boolean;
}

export interface ConversationDetails {
  conversationId: string;
  contact: Contact;
  keyJwk: JsonWebKey;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  sender: 'me' | 'them';
  kind: 'text' | 'image';
  ciphertext: Ciphertext;
  imageMime?: string;
  caption?: Ciphertext;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  createdAt: number;
}

// ---------- Profiles ----------
export async function listContacts(): Promise<Contact[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('participant_ids')
    .contains('participant_ids', [user.id]);

  if (convError) throw convError;

  const otherUserIds = new Set<string>();
  conversations?.forEach(conv => {
    conv.participant_ids.forEach(id => {
      if (id !== user.id) otherUserIds.add(id);
    });
  });

  if (otherUserIds.size === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', Array.from(otherUserIds));

  if (profileError) throw profileError;

  return profiles.map(p => ({
    id: p.id,
    name: p.display_name,
    handle: p.handle,
    avatarHue: p.avatar_hue,
    online: false,
  }));
}

export async function getConversationDetails(conversationId: string): Promise<ConversationDetails | undefined> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return undefined;

  // Fetch the conversation
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (convError || !conv) return undefined;

  // Find the other participant
  const otherUserId = conv.participant_ids.find((id: string) => id !== user.id);
  if (!otherUserId) return undefined;

  // Fetch the other user's profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', otherUserId)
    .single();

  if (profileError || !profile) return undefined;

  return {
    conversationId: conv.id,
    contact: {
      id: profile.id,
      name: profile.display_name,
      handle: profile.handle,
      avatarHue: profile.avatar_hue,
      online: false,
    },
    keyJwk: conv.encrypted_key_jwk as JsonWebKey,
  };
}

export async function upsertContact(contact: Contact): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: contact.id,
      display_name: contact.name,
      handle: contact.handle,
      avatar_hue: contact.avatarHue,
    });
  if (error) throw error;
}

export async function searchProfiles(query: string): Promise<Contact[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('handle', `%${query}%`)
    .neq('id', user.id)
    .limit(10);

  if (error) throw error;

  return data.map(p => ({
    id: p.id,
    name: p.display_name,
    handle: p.handle,
    avatarHue: p.avatar_hue,
    online: false,
  }));
}

// ---------- Conversations ----------
export async function createConversationWithUser(otherUserId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const key = await generateConversationKey();
  const jwk = await exportKey(key);

  const participantIds = [user.id, otherUserId];
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      participant_ids: participantIds,
      encrypted_key_jwk: jwk,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getConversationIdForUsers(userId1: string, userId2: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, participant_ids')
    .contains('participant_ids', [userId1]);

  if (error) return null;

  const conv = data?.find(c => c.participant_ids.includes(userId2));
  return conv?.id || null;
}

// ---------- Messages ----------
export async function listMessages(conversationId: string): Promise<MessageRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return data.map(m => ({
    id: m.id,
    conversationId: m.conversation_id,
    sender: m.sender_id === user?.id ? 'me' : 'them',
    kind: m.kind,
    ciphertext: m.ciphertext as Ciphertext,
    imageMime: m.image_mime,
    caption: m.caption_ciphertext as Ciphertext | undefined,
    status: m.status,
    createdAt: new Date(m.created_at).getTime(),
  }));
}

export async function addMessage(m: MessageRecord): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('messages')
    .insert({
      id: m.id,
      conversation_id: m.conversationId,
      sender_id: m.sender === 'me' ? user?.id : null,
      kind: m.kind,
      ciphertext: m.ciphertext,
      image_mime: m.imageMime,
      caption_ciphertext: m.caption,
      status: m.status,
      created_at: new Date(m.createdAt).toISOString(),
    });

  if (error) throw error;
}

export async function updateMessage(id: string, patch: Partial<MessageRecord>): Promise<void> {
  const updateData: Record<string, any> = {};
  if (patch.status) updateData.status = patch.status;

  const { error } = await supabase
    .from('messages')
    .update(updateData)
    .eq('id', id);

  if (error) throw error;
}

export async function lastMessageOf(conversationId: string): Promise<MessageRecord | undefined> {
  const messages = await listMessages(conversationId);
  return messages[messages.length - 1];
}

// ---------- Meta ----------
export async function getMeta<T>(key: string): Promise<T | undefined> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return undefined;
  return user.user_metadata[key] as T;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: { [key]: value }
  });
  if (error) throw error;
}