/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2 } from 'lucide-react';
import { messageAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export default function ChatSheet({ open, onOpenChange, reportId, technicalOfficer, externalMaintainer }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  // Determina chi è l'altro utente nella chat
  const otherUser = user?.id === technicalOfficer?.id ? externalMaintainer : technicalOfficer;

  useEffect(() => {
    if (open && reportId && user) {
      loadMessages();
      // Auto-refresh ogni 3 secondi quando la chat è aperta
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [open, reportId, user]);

  useEffect(() => {
    // Scroll to bottom quando arrivano nuovi messaggi
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await messageAPI.getMessages(reportId);
      setMessages(response.data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      setSending(true);
      await messageAPI.sendMessage(reportId, newMessage.trim());
      setNewMessage('');
      await loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const isMyMessage = (message) => {
    return message.author?.id === user?.id;
  };

  // Se user non è ancora caricato, non renderizzare nulla
  if (!user) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent 
        side="right" 
        className="w-[400px] sm:w-[540px] flex flex-col p-0 top-16 h-[calc(100vh-4rem)] border-t"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Chat</SheetTitle>
          <SheetDescription>
            Conversation with {otherUser?.firstName} {otherUser?.lastName}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea ref={scrollRef} className="flex-1 px-6 py-4">
          {(() => {
            if (loading && messages.length === 0) {
              return (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              );
            }
            if (messages.length === 0) {
              return (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  No messages yet. Start the conversation!
                </div>
              );
            }
            return (
            <div className="space-y-4">
              {messages.map((message) => {
                const isMine = isMyMessage(message);
                const sender = message.author; // Backend ritorna author
                
                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={isMine ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
                        {getInitials(sender?.firstName, sender?.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className={`flex flex-col gap-1 max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">
                          {isMine ? 'You' : `${sender?.firstName} ${sender?.lastName}`}
                        </span>
                        <span>
                          {format(new Date(message.createdAt), 'HH:mm')}
                        </span>
                      </div>
                      
                      <div
                        className={`rounded-lg px-3 py-2 text-sm ${
                          isMine
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            );
          })()}
        </ScrollArea>

        <div className="px-6 py-4 border-t">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sending}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={sending || !newMessage.trim()}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
