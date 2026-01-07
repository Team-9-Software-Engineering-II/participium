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

export default function ChatSheet({ open, onOpenChange, reportId, technicalOfficer, externalMaintainer, citizen }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [shouldFocus, setShouldFocus] = useState(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [unreadNewMessages, setUnreadNewMessages] = useState(0);
  const [userIsAtBottom, setUserIsAtBottom] = useState(true);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const previousMessageCountRef = useRef(0);
  const previousOpenRef = useRef(open);

  // Determina chi è l'altro utente nella chat
  // Se c'è externalMaintainer: chat Tech-ExtMaint (internal=true)
  // Altrimenti: chat Cittadino-Tech (internal=false)
  const isInternalChat = !!externalMaintainer;
  const otherUser = externalMaintainer 
    ? (user?.id === technicalOfficer?.id ? externalMaintainer : technicalOfficer)
    : (user?.id === technicalOfficer?.id ? citizen : technicalOfficer);

  useEffect(() => {
    if (open && reportId && user) {
      loadMessages();
      // Auto-focus sull'input quando la chat si apre
      setShouldFocus(true);
      // Scroll to bottom quando si apre la chat
      setShouldScrollToBottom(true);
      
      // Listener per tracciare lo scroll dell'utente
      const scrollElement = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      const handleScroll = () => {
        setUserIsAtBottom(isUserAtBottom());
      };
      
      if (scrollElement) {
        scrollElement.addEventListener('scroll', handleScroll);
      }
      
      // Auto-refresh ogni 1 secondo quando la chat è aperta
      const interval = setInterval(loadMessages, 1000);
      
      return () => {
        clearInterval(interval);
        if (scrollElement) {
          scrollElement.removeEventListener('scroll', handleScroll);
        }
      };
    }
  }, [open, reportId, user]);

  // Separato: emetti evento quando la chat si chiude
  useEffect(() => {
    // Emetti evento SOLO quando open passa da true a false
    const wasOpen = previousOpenRef.current;
    previousOpenRef.current = open;
    
    if (wasOpen && !open) {
      console.log('[ChatSheet] Chat closed - emitting event');
      // Emetti evento per aggiornare i badge nelle liste
      globalThis.dispatchEvent(new Event('chatMessageRead'));
    }
  }, [open]);

  // Effetto separato per gestire il focus
  useEffect(() => {
    if (shouldFocus && inputRef.current && open && !sending) {
      inputRef.current.focus();
      setShouldFocus(false);
    }
  }, [shouldFocus, open, sending]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
        
        // Salva in localStorage DOPO aver scrollato
        // Usa setTimeout per assicurarsi che lo scroll sia completato
        setTimeout(() => {
          if (open && messages.length > 0 && reportId && user?.id) {
            const latestMessage = messages.at(-1);
            const storageKey = `lastReadMessage_${reportId}_${user.id}_${isInternalChat ? 'internal' : 'external'}`;
            localStorage.setItem(storageKey, latestMessage.id.toString());
            console.log('[ChatSheet] Updated localStorage after scroll:', latestMessage.id);
          }
        }, 50);
      }
    }
  };

  const isUserAtBottom = () => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        const scrolledFromBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight;
        // Considera l'utente "in fondo" se è entro 100px dal fondo
        // Il badge appare SOLO se ha scrollato più di 100px verso l'alto
        return scrolledFromBottom <= 100;
      }
    }
    return true;
  };

  useEffect(() => {
    const userAtBottom = isUserAtBottom();
    
    // Se ci sono nuovi messaggi e l'utente NON è in fondo
    if (messages.length > previousMessageCountRef.current && !userAtBottom && !shouldScrollToBottom) {
      const newMessagesCount = messages.length - previousMessageCountRef.current;
      setUnreadNewMessages(prev => prev + newMessagesCount);
    }
    
    // Scroll to bottom solo se l'utente è già in fondo o dopo invio
    if (shouldScrollToBottom || userAtBottom) {
      scrollToBottom();
      setUnreadNewMessages(0); // Reset quando scrolla in fondo
      setUserIsAtBottom(true); // Aggiorna stato
    } else {
      setUserIsAtBottom(userAtBottom); // Aggiorna stato
    }
    
    // Aggiorna il conteggio precedente
    previousMessageCountRef.current = messages.length;
    
    // Reset flag dopo primo scroll
    if (shouldScrollToBottom) {
      setShouldScrollToBottom(false);
    }
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await messageAPI.getMessages(reportId, isInternalChat);
      const newMessages = response.data || [];
      setMessages(newMessages);
      
      // Se la chat è aperta E ci sono messaggi E l'utente è in fondo
      // Salva IMMEDIATAMENTE l'ultimo messaggio letto
      if (open && newMessages.length > 0 && isUserAtBottom()) {
        const latestMessage = newMessages.at(-1);
        const storageKey = `lastReadMessage_${reportId}_${user?.id}_${isInternalChat ? 'internal' : 'external'}`;
        localStorage.setItem(storageKey, latestMessage.id.toString());
        console.log('[ChatSheet] Saved in loadMessages:', latestMessage.id);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageToSend = newMessage.trim();
    setNewMessage(''); // Pulisci subito l'input
    
    try {
      setSending(true);
      await messageAPI.sendMessage(reportId, messageToSend, isInternalChat);
      // Forza scroll dopo invio
      setShouldScrollToBottom(true);
      await loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      // Ripristina il messaggio in caso di errore
      setNewMessage(messageToSend);
    } finally {
      setSending(false);
      // Riattiva il focus dopo l'invio
      setShouldFocus(true);
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const handleScrollToBottomClick = () => {
    setShouldScrollToBottom(true);
    setUnreadNewMessages(0);
    scrollToBottom();
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
        className="w-[400px] sm:w-[540px] flex flex-col p-0 top-16 h-[calc(100vh-4rem)] border-t [&>[data-radix-scroll-area-viewport]]:overscroll-contain"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        style={{ overscrollBehavior: 'contain' }}
      >
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Chat</SheetTitle>
          <SheetDescription>
            Conversation with {otherUser?.firstName} {otherUser?.lastName}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea ref={scrollRef} className="flex-1 px-6 py-4 [&>[data-radix-scroll-area-viewport]]:overscroll-contain">
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

        {/* Notifica nuovo messaggio - mostra solo se ci sono nuovi messaggi E l'utente NON è in fondo */}
        {unreadNewMessages > 0 && !userIsAtBottom && (
          <div className="px-6 py-2 flex items-center justify-center">
            <Button
              onClick={handleScrollToBottomClick}
              size="sm"
              variant="default"
              className="shadow-lg animate-in slide-in-from-bottom-2"
            >
              <span className="mr-2">↓</span>
              {unreadNewMessages} {unreadNewMessages === 1 ? 'new message' : 'new messages'}
            </Button>
          </div>
        )}

        <div className="px-6 py-4 border-t">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sending}
              className="flex-1"
              autoComplete="off"
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
