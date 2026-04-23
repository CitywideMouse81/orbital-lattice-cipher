import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { upsertContact } from '@/lib/storage';
import type { Session, User } from '@supabase/supabase-js';

export interface SessionUser {
  id: string;
  displayName: string;
  handle: string;
  avatarHue: number;
  createdAt: number;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ? mapUser(session.user) : null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ? mapUser(session.user) : null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const mapUser = (supabaseUser: User): SessionUser => ({
    id: supabaseUser.id,
    displayName: supabaseUser.user_metadata.displayName || 'User',
    handle: supabaseUser.user_metadata.handle || '@user',
    avatarHue: supabaseUser.user_metadata.avatarHue || Math.floor(Math.random() * 360),
    createdAt: new Date(supabaseUser.created_at).getTime(),
  });

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, displayName: string, handle: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          displayName,
          handle: handle.startsWith('@') ? handle : `@${handle}`,
          avatarHue: Math.floor(Math.random() * 360),
        },
      },
    });

    if (error) throw error;

    // If identities array is empty, user already exists
    if (data.user && data.user.identities?.length === 0) {
      throw new Error('A user with this email already exists.');
    }

    // IMPORTANT: Always create the profile record, even if email confirmation is required.
    // This ensures the user appears in search results immediately.
    if (data.user) {
      try {
        await upsertContact({
          id: data.user.id,
          name: displayName,
          handle: handle.startsWith('@') ? handle : `@${handle}`,
          avatarHue: Math.floor(Math.random() * 360),
          online: false,
        });
      } catch (profileError) {
        console.error('Failed to create profile:', profileError);
        // Don't throw – the auth user was created, profile can be fixed later
      }
    }

    // Check if email confirmation is required (no session returned)
    if (data.user && !data.session) {
      throw new Error('Confirmation email sent. Please check your inbox to verify your account.');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, signIn, signUp, signOut };
}