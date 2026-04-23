import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Login() {
  const { signIn, signUp } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password, name, handle);
      }
      navigate('/chats');
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col items-center justify-center px-6 py-10">
      <div className="glass-strong w-full max-w-md animate-scale-in rounded-[2rem] p-7">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-gradient-primary shadow-float">
            <Lock className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            <span className="gradient-text">Cipher</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Encrypted by default. Personal by design.</p>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'signin' | 'signup')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <TabsContent value="signin" className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <div>
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Avery Chen"
                  required
                />
              </div>
              <div>
                <Label htmlFor="handle">Handle</Label>
                <Input
                  id="handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@avery"
                  required
                />
              </div>
            </TabsContent>

            <Button
              type="submit"
              disabled={submitting}
              className="h-12 w-full rounded-2xl bg-gradient-primary text-base font-semibold shadow-float"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
        </Tabs>

        <ul className="mt-6 space-y-2 text-xs text-muted-foreground">
          <li className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Per‑conversation AES‑GCM 256 keys</li>
          <li className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-primary" /> Messages and images encrypted in your browser</li>
        </ul>
      </div>
    </div>
  );
}