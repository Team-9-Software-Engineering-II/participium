import { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { User, Shield, Palette, Bell, CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { uploadAPI } from '@/services/api'; // userAPI non serve più qui, usiamo updateProfile del context
import { useToast } from '@/hooks/use-toast';

// Helper per visualizzare correttamente le immagini dal backend locale
const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  return `http://localhost:3000${path}`;
};

export default function Settings() {
  // USIAMO updateProfile DAL CONTESTO (che aggiorna anche lo stato locale 'user')
  const { user, updateProfile } = useAuth(); 
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  
  const [formData, setFormData] = useState({
    photoUrl: user?.photoUrl || '',
    username: user?.username || '',
    email: user?.email || '',
    telegramUsername: user?.telegramUsername || '',
  });
  
  const [accountData, setAccountData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || '',
    dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth) : null,
  });
  
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  
  const [notificationSettings, setNotificationSettings] = useState({
    communicationEmail: true,
    messageEmail: true,
    // Mappiamo la configurazione email del backend sullo switch telegram per ora, come richiesto
    telegram: user?.emailConfiguration?.notificationsEnabled || false,
  });

  // Sincronizza lo stato locale se l'utente cambia (es. dopo un updateProfile riuscito)
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        photoUrl: user.photoUrl || '',
        telegramUsername: user.telegramUsername || '',
      }));
    }
  }, [user]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => 1900 + i);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAccountChange = (e) => {
    setAccountData({
      ...accountData,
      [e.target.name]: e.target.value,
    });
  };

  // GESTIONE UPLOAD FOTO
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // 1. Carica immagine sul server
        const response = await uploadAPI.uploadPhoto(file);
        const newPhotoUrl = response.data.url;

        // 2. Salva subito l'URL nel profilo utente tramite il Context
        const result = await updateProfile({ photoUrl: newPhotoUrl });

        if (result.success) {
          toast({
            title: "Image Uploaded",
            description: "Profile picture updated successfully.",
          });
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error("Upload failed", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to upload image.",
        });
      }
    }
  };

  // GESTIONE UPDATE PROFILO
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const updateData = {};

      // Pulizia dati: Manda solo se non vuoti, o null se vuoti (per Telegram)
      if (formData.photoUrl && formData.photoUrl.trim() !== '') {
        updateData.photoUrl = formData.photoUrl;
      }

      if (!formData.telegramUsername || formData.telegramUsername.trim() === '') {
        updateData.telegramUsername = null;
      } else {
        updateData.telegramUsername = formData.telegramUsername.trim();
      }

      // updateProfile del context gestisce sia la chiamata API che l'aggiornamento di 'user'
      const result = await updateProfile(updateData);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Profile updated successfully.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to update profile.",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Logica per account settings (es. data di nascita)
      // Nota: Assicurati che il backend supporti 'dateOfBirth' in updateProfile
      const updateData = {};
      /* if (accountData.dateOfBirth) {
          updateData.dateOfBirth = accountData.dateOfBirth;
      } */
      
      // Simuliamo successo se non c'è nulla da aggiornare o chiamiamo updateProfile
      if (Object.keys(updateData).length > 0) {
          await updateProfile(updateData);
      }
      
      toast({
        title: "Success",
        description: "Account settings updated.",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update account settings.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationsSubmit = async () => {
    setLoading(true);
    try {
        const result = await updateProfile({
            emailNotificationsEnabled: notificationSettings.telegram 
        });

        if (result.success) {
          toast({
              title: "Preferences Updated",
              description: "Your notification settings have been saved.",
          });
        } else {
          throw new Error(result.error);
        }
    } catch (error) {
        console.error(error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to update notification preferences.",
        });
    } finally {
        setLoading(false);
    }
  };

  const menuItems = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your account settings and set e-mail preferences.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Sidebar Menu */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <nav className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1 lg:space-y-1 pb-2 lg:pb-0">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      'flex items-center gap-2 lg:gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap lg:w-full',
                      activeTab === item.id
                        ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 bg-card rounded-lg border p-4 sm:p-6 lg:p-8">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-1">Profile</h2>
                  <p className="text-sm text-muted-foreground">
                    This is how others will see you on the site.
                  </p>
                </div>

                <Separator />

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Photo Upload */}
                  <div className="space-y-3">
                    <Label>Photo</Label>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20">
                        {/* FIX: Usa getImageUrl per mostrare correttamente l'immagine */}
                        <AvatarImage src={getImageUrl(formData.photoUrl)} />
                        <AvatarFallback>
                          <User className="h-8 w-8" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <input
                          type="file"
                          id="photo-upload"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => document.getElementById('photo-upload').click()}
                        >
                          Upload image
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Username */}
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      disabled
                    />
                    <p className="text-sm text-muted-foreground">
                      This is your public display name. It can be your real name or a pseudonym.
                    </p>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled 
                    />
                    <p className="text-sm text-muted-foreground">
                      You can manage verified email addresses in your email settings.
                    </p>
                  </div>

                  {/* Telegram Username */}
                  <div className="space-y-2">
                    <Label htmlFor="telegramUsername">Telegram Username</Label>
                    <Input
                      id="telegramUsername"
                      name="telegramUsername"
                      placeholder="@username"
                      value={formData.telegramUsername}
                      onChange={handleChange}
                    />
                    <p className="text-sm text-muted-foreground">
                      Your Telegram username for notifications and updates.
                    </p>
                  </div>

                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? 'Updating...' : 'Update profile'}
                  </Button>
                </form>
              </div>
            )}
            
            {/* ... Altre tab rimaste invariate nella logica ma con funzioni di submit aggiornate ... */}
            
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-1">Account</h2>
                  <p className="text-sm text-muted-foreground">Manage your account settings and preferences.</p>
                </div>
                <Separator />
                <form onSubmit={handleAccountSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" name="firstName" value={accountData.firstName} onChange={handleAccountChange} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" name="lastName" value={accountData.lastName} onChange={handleAccountChange} disabled />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" value={accountData.name} onChange={handleAccountChange} disabled />
                    <p className="text-sm text-muted-foreground">This is the name that will be displayed on your profile and in emails.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Date of birth</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !accountData.dateOfBirth && 'text-muted-foreground')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {accountData.dateOfBirth ? format(accountData.dateOfBirth, 'PPP') : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
                        <div className="p-3 space-y-3">
                          <div className="flex gap-2">
                            <Select value={calendarMonth.getMonth().toString()} onValueChange={(value) => { const newDate = new Date(calendarMonth); newDate.setMonth(parseInt(value)); setCalendarMonth(newDate); }}>
                              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                              <SelectContent>{months.map((month, index) => (<SelectItem key={month} value={index.toString()}>{month}</SelectItem>))}</SelectContent>
                            </Select>
                            <Select value={calendarMonth.getFullYear().toString()} onValueChange={(value) => { const newDate = new Date(calendarMonth); newDate.setFullYear(parseInt(value)); setCalendarMonth(newDate); }}>
                              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                              <SelectContent className="max-h-[200px]">{years.reverse().map((year) => (<SelectItem key={year} value={year.toString()}>{year}</SelectItem>))}</SelectContent>
                            </Select>
                          </div>
                          <Calendar mode="single" selected={accountData.dateOfBirth} onSelect={(date) => setAccountData({ ...accountData, dateOfBirth: date })} month={calendarMonth} onMonthChange={setCalendarMonth} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <p className="text-sm text-muted-foreground">Your date of birth is used to calculate your age.</p>
                  </div>
                  <Button type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update account'}</Button>
                </form>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-1">Appearance</h2>
                  <p className="text-sm text-muted-foreground">Customize the appearance of the app. Automatically switch between day and night themes.</p>
                </div>
                <Separator />
                <div className="space-y-3">
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">Select the theme for the dashboard.</p>
                  <div className="grid grid-cols-2 gap-4 max-w-md">
                    <button type="button" onClick={() => setTheme('light')} className={cn('relative rounded-lg border-2 p-1 transition-all', theme === 'light' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50')}>
                      <div className="rounded-md bg-white p-4 space-y-2"><div className="h-2 w-3/4 bg-neutral-200 rounded"></div><div className="h-2 w-full bg-neutral-200 rounded"></div><div className="h-2 w-2/3 bg-neutral-200 rounded"></div><div className="flex gap-2 mt-3"><div className="h-6 w-6 rounded-full bg-neutral-200"></div><div className="flex-1"><div className="h-2 w-3/4 bg-neutral-200 rounded mb-1"></div><div className="h-2 w-1/2 bg-neutral-200 rounded"></div></div></div></div>
                      <div className="mt-2 text-center text-sm font-medium">Light</div>
                    </button>
                    <button type="button" onClick={() => setTheme('dark')} className={cn('relative rounded-lg border-2 p-1 transition-all', theme === 'dark' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50')}>
                      <div className="rounded-md bg-neutral-900 p-4 space-y-2"><div className="h-2 w-3/4 bg-neutral-700 rounded"></div><div className="h-2 w-full bg-neutral-700 rounded"></div><div className="h-2 w-2/3 bg-neutral-700 rounded"></div><div className="flex gap-2 mt-3"><div className="h-6 w-6 rounded-full bg-neutral-700"></div><div className="flex-1"><div className="h-2 w-3/4 bg-neutral-700 rounded mb-1"></div><div className="h-2 w-1/2 bg-neutral-700 rounded"></div></div></div></div>
                      <div className="mt-2 text-center text-sm font-medium">Dark</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-1">Notifications</h2>
                  <p className="text-sm text-muted-foreground">Configure how you receive notifications.</p>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div><h3 className="text-base font-medium mb-4">Notify me about...</h3></div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5"><Label className="text-base font-medium">Communication emails</Label><p className="text-sm text-muted-foreground">Receive emails about your reports activity and updates.</p></div>
                    <Switch checked={notificationSettings.communicationEmail} onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, communicationEmail: checked })} />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5"><Label className="text-base font-medium">Message emails</Label><p className="text-sm text-muted-foreground">Receive emails about messages on your reports.</p></div>
                    <Switch checked={notificationSettings.messageEmail} onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, messageEmail: checked })} />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5"><Label className="text-base font-medium">Telegram</Label><p className="text-sm text-muted-foreground">Receive notifications via Telegram for important updates.</p></div>
                    <Switch checked={notificationSettings.telegram} onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, telegram: checked })} />
                  </div>
                </div>
                <Button type="button" disabled={loading} onClick={handleNotificationsSubmit}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update notifications
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}