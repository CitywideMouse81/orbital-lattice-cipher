import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listContacts, searchProfiles, createConversationWithUser, type Contact } from "@/lib/storage";
import { AvatarOrb } from "@/components/AvatarOrb";
import { MessageSquarePlus, Search, UserPlus, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    listContacts().then(setContacts);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchProfiles(searchQuery.trim());
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddContact = async (user: Contact) => {
    setAdding(user.id);
    try {
      const conversationId = await createConversationWithUser(user.id);
      // Refresh contacts list
      const updatedContacts = await listContacts();
      setContacts(updatedContacts);
      // Clear search
      setSearchQuery("");
      setSearchResults([]);
      // Navigate to the new chat
      navigate(`/chat/${conversationId}`);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      alert('Could not start conversation. Please try again.');
    } finally {
      setAdding(null);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <div className="px-4">
      <header className="pt-4">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">People</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Contacts</h1>
        <p className="mt-1 text-sm text-muted-foreground">Each contact has its own AES-GCM key.</p>
      </header>

      {/* Search Bar */}
      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by handle to add new contacts"
          className="glass h-12 rounded-2xl border-0 pl-11 pr-10 text-sm placeholder:text-muted-foreground"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div className="mt-4">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Search Results</h2>
          {searching ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : searchResults.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No users found</p>
          ) : (
            <ul className="space-y-2">
              {searchResults.map((user) => (
                <li key={user.id}>
                  <div className="glass flex items-center gap-3 rounded-3xl p-3">
                    <AvatarOrb hue={user.avatarHue} name={user.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-semibold tracking-tight">{user.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{user.handle}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddContact(user)}
                      disabled={adding === user.id}
                      className="gap-1.5 rounded-full bg-gradient-primary px-4"
                    >
                      {adding === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                      <span>Add</span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Existing Contacts */}
      <div className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          {contacts.length > 0 ? 'Your Conversations' : 'No conversations yet'}
        </h2>
        <ul className="space-y-2">
          {contacts.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => navigate(`/chat/${c.id}`)}
                className="glass flex w-full items-center gap-3 rounded-3xl p-3 text-left transition-all hover:shadow-bubble focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <AvatarOrb hue={c.avatarHue} name={c.name} size="md" online={c.online} />
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold tracking-tight">{c.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{c.handle}</p>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-bubble">
                  <MessageSquarePlus className="h-4 w-4" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}