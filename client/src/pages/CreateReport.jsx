import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/common/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Camera, Image as ImageIcon, File, X, Upload, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

const CATEGORIES = [
  'Water Supply',
  'Architectural Barriers',
  'Sewer System',
  'Public Lighting',
  'Waste',
  'Road Signs',
  'Roads',
  'Public Green Areas',
  'Other'
];

export default function CreateReport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [showAnonymousDialog, setShowAnonymousDialog] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchEnd, setTouchEnd] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [initialPinchDistance, setInitialPinchDistance] = useState(0);
  const [lastScale, setLastScale] = useState(1);
  const [formData, setFormData] = useState({
    location: '',
    category: '',
    title: '',
    description: '',
    anonymous: false,
    photos: [],
    email: '',
  });
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState([]);

  // Detect if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      // Initialize email from user data
      setFormData((prev) => ({
        ...prev,
        email: user.email || '',
      }));
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCategoryChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      category: value,
    }));
  };

  const handleAnonymousToggle = (checked) => {
    setFormData((prev) => ({
      ...prev,
      anonymous: checked,
    }));
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    const remainingSlots = 3 - formData.photos.length;
    const filesToAdd = files.slice(0, remainingSlots);

    if (filesToAdd.length > 0) {
      const newPhotos = [...formData.photos, ...filesToAdd];
      setFormData((prev) => ({
        ...prev,
        photos: newPhotos,
      }));

      // Create preview URLs
      const newPreviewUrls = filesToAdd.map((file) => URL.createObjectURL(file));
      setPhotoPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
    }
  };

  const handleRemovePhoto = (index) => {
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(photoPreviewUrls[index]);

    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
    setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePhotoClick = (index) => {
    setCurrentPhotoIndex(index);
    setShowPhotoViewer(true);
    setImageScale(1);
  };

  const handlePreviousPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev === 0 ? photoPreviewUrls.length - 1 : prev - 1));
    setImageScale(1);
    setImagePan({ x: 0, y: 0 });
  };

  const handleNextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev === photoPreviewUrls.length - 1 ? 0 : prev + 1));
    setImageScale(1);
    setImagePan({ x: 0, y: 0 });
  };

  const handlePhotoViewerKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      handlePreviousPhoto();
    } else if (e.key === 'ArrowRight') {
      handleNextPhoto();
    }
  };

  // Helper function to calculate distance between two touch points
  const getTouchDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Touch handlers for swipe, pan, and pinch-to-zoom
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      // Single touch - prepare for pan or swipe
      const touch = e.touches[0];
      setTouchStart({ x: touch.clientX, y: touch.clientY });
      setTouchEnd({ x: touch.clientX, y: touch.clientY });
      
      // If zoomed, enable panning
      if (imageScale > 1) {
        setIsPanning(true);
      }
    } else if (e.touches.length === 2) {
      // Two touches - prepare for pinch-to-zoom
      e.preventDefault();
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      setInitialPinchDistance(distance);
      setLastScale(imageScale);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1) {
      // Single touch - handle pan or swipe detection
      const touch = e.touches[0];
      setTouchEnd({ x: touch.clientX, y: touch.clientY });
      
      // If zoomed and panning, update pan position
      if (imageScale > 1 && isPanning) {
        const deltaX = touch.clientX - touchStart.x;
        const deltaY = touch.clientY - touchStart.y;
        setImagePan({ x: deltaX, y: deltaY });
        e.preventDefault(); // Prevent scrolling while panning
      }
    } else if (e.touches.length === 2) {
      // Two touches - handle pinch-to-zoom
      e.preventDefault();
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      
      if (initialPinchDistance > 0) {
        const scale = (distance / initialPinchDistance) * lastScale;
        // Limit scale between 1x and 4x
        const newScale = Math.min(Math.max(scale, 1), 4);
        setImageScale(newScale);
        
        // Reset pan if zoomed out to 1x
        if (newScale === 1) {
          setImagePan({ x: 0, y: 0 });
        }
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length === 0) {
      // All touches released
      if (!touchStart.x || !touchEnd.x) {
        setIsPanning(false);
        setInitialPinchDistance(0);
        return;
      }
      
      // Only swipe if not zoomed
      if (imageScale === 1) {
        const distance = touchStart.x - touchEnd.x;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;
        
        if (isLeftSwipe && photoPreviewUrls.length > 1) {
          handleNextPhoto();
        }
        if (isRightSwipe && photoPreviewUrls.length > 1) {
          handlePreviousPhoto();
        }
      }
      
      setIsPanning(false);
      setTouchStart({ x: 0, y: 0 });
      setTouchEnd({ x: 0, y: 0 });
      setInitialPinchDistance(0);
    }
  };

  const handleClosePhotoViewer = () => {
    setShowPhotoViewer(false);
    setImageScale(1);
    setImagePan({ x: 0, y: 0 });
    setLastScale(1);
  };

  // Double click/tap fallback for zoom (useful for desktop and simulators)
  const handleImageDoubleClick = () => {
    if (imageScale === 1) {
      setImageScale(2);
      setLastScale(2);
    } else {
      setImageScale(1);
      setImagePan({ x: 0, y: 0 });
      setLastScale(1);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // If anonymous, show confirmation dialog
    if (formData.anonymous) {
      setShowAnonymousDialog(true);
    } else {
      submitReport();
    }
  };

  const submitReport = () => {
    // TODO: Implement API call to submit report
    console.log('Submitting report:', formData);
    // For now, just log and show alert
    alert('Report submission not yet implemented');
    setShowAnonymousDialog(false);
  };

  const handleAnonymousConfirm = () => {
    submitReport();
  };

  const handleAnonymousCancel = () => {
    setShowAnonymousDialog(false);
  };

  // Component for photo upload button (mobile)
  const MobilePhotoUpload = () => {
    const hasPhotos = formData.photos.length > 0;
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {hasPhotos ? (
            <Button 
              type="button" 
              size="icon" 
              className="rounded-full h-12 w-12"
            >
              <Camera className="h-5 w-5" />
            </Button>
          ) : (
            <Button type="button" variant="outline" size="lg" className="gap-2">
              <Camera className="h-5 w-5" />
              Add Photo
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => document.getElementById('photo-camera')?.click()}>
            <Camera className="mr-2 h-4 w-4" />
            Camera
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => document.getElementById('photo-library')?.click()}>
            <ImageIcon className="mr-2 h-4 w-4" />
            Photo Library
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => document.getElementById('photo-file')?.click()}>
            <File className="mr-2 h-4 w-4" />
            File
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Component for photo upload button (desktop)
  const DesktopPhotoUpload = () => (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="gap-2"
      onClick={() => document.getElementById('photo-upload')?.click()}
    >
      <Upload className="h-5 w-5" />
      Add Photo
    </Button>
  );

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">New Report</h1>
            <p className="text-sm text-muted-foreground">
              <strong>ATTENTION:</strong> Participium is a system to report urban maintenance issues and not emergencies that require immediate intervention.
              In case of fires it is essential to contact the competent authorities such as Firefighters, Police, etc.
              If necessary therefore in case of temporary intervention, we advise you not to proceed with this report but to contact the relevant services.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Map Button - Mobile Only */}
            {isMobile && (
              <button
                type="button"
                onClick={() => setShowMapDialog(true)}
                className="w-full bg-card border rounded-lg p-4 flex items-center gap-3 hover:bg-accent transition-colors text-left"
              >
                <div className="flex-shrink-0 bg-primary/10 p-2 rounded-full">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    Report location point
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Click to select location on map
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </button>
            )}

            {/* Map Section - Desktop Only */}
            {!isMobile && (
              <div className="bg-card border rounded-lg overflow-hidden">
                {/* Map Placeholder */}
                <div className="relative" style={{ height: '500px' }}>
                  <div className="absolute inset-0 bg-muted flex items-center justify-center">
                    <div className="text-center space-y-4 p-8">
                      <MapPin className="h-16 w-16 mx-auto text-muted-foreground" />
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold">Interactive Map</h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                          Map will be integrated here. Click on the map to select the exact location of your report.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Map Info Bar */}
                <div className="p-4 bg-background border-t flex items-center gap-3">
                  <div className="flex-shrink-0 bg-primary/10 p-2 rounded-full">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      Selected address will appear here
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Click on the map to select a location
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Information Section */}
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h2 className="text-xl font-semibold">Information</h2>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="e.g., TORINO - CENTRO - CENTRO (CENTRO STORICO)"
                  value={formData.location}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={handleCategoryChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title of the report *</Label>
                <Input
                  id="title"
                  name="title"
                  type="text"
                  placeholder="Brief description (max 200 characters)"
                  maxLength={200}
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Detailed description of the report (max 2000 characters)"
                  maxLength={2000}
                  rows={6}
                  value={formData.description}
                  onChange={handleChange}
                  className="resize-none"
                />
              </div>
            </div>

            {/* Photos Section */}
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h2 className="text-xl font-semibold">Photos</h2>

              {/* Photo previews */}
              {formData.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {photoPreviewUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => handlePhotoClick(index)}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              <div className={`flex ${formData.photos.length > 0 ? 'justify-end' : 'justify-center'}`}>
                {formData.photos.length < 3 && (
                  <>
                    {isMobile ? <MobilePhotoUpload /> : <DesktopPhotoUpload />}
                    
                    {/* Hidden file inputs */}
                    {isMobile ? (
                      <>
                        <input
                          id="photo-camera"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          multiple
                        />
                        <input
                          id="photo-library"
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          multiple
                        />
                        <input
                          id="photo-file"
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          multiple
                        />
                      </>
                    ) : (
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        multiple
                      />
                    )}
                  </>
                )}
              </div>

              {formData.photos.length === 0 && (
                <p className="text-sm text-muted-foreground text-center mt-2">
                  No photos added yet
                </p>
              )}
              {formData.photos.length > 0 && (
                <p className="text-sm text-muted-foreground text-right">
                  {formData.photos.length} of 3 photos uploaded
                </p>
              )}
            </div>

            {/* User Section */}
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h2 className="text-xl font-semibold">User</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={user.firstName || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={user.lastName || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Anonymous Toggle */}
              <div className="flex items-center justify-between border-t pt-4">
                <div className="space-y-0.5">
                  <Label htmlFor="anonymous" className="text-base">
                    Do you want to send this report anonymously?
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Your personal information will not be visible to other users
                  </p>
                </div>
                <Switch
                  id="anonymous"
                  checked={formData.anonymous}
                  onCheckedChange={handleAnonymousToggle}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <Button type="submit" size="lg" className="px-12">
                Submit Report
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              * Required field
            </p>
          </form>
        </div>
      </div>

      {/* Anonymous Confirmation Dialog */}
      <Dialog open={showAnonymousDialog} onOpenChange={setShowAnonymousDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anonymous Report</DialogTitle>
            <DialogDescription>
              You are submitting this report anonymously, are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleAnonymousCancel}>
              No
            </Button>
            <Button onClick={handleAnonymousConfirm}>
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Viewer Dialog */}
      <Dialog open={showPhotoViewer} onOpenChange={handleClosePhotoViewer}>
        <DialogContent 
          className="max-w-4xl w-full p-0 bg-black/99 border-0"
          onKeyDown={handlePhotoViewerKeyDown}
        >
          <DialogTitle className="sr-only">Photo Viewer</DialogTitle>
          <DialogDescription className="sr-only">
            View and navigate through uploaded photos. Use arrow keys or swipe to navigate.
          </DialogDescription>
          <div 
            className="relative"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Close button */}
            <button
              onClick={handleClosePhotoViewer}
              className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Image counter */}
            {photoPreviewUrls.length > 1 && (
              <div className="absolute top-4 left-4 z-10 bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                {currentPhotoIndex + 1} / {photoPreviewUrls.length}
              </div>
            )}

            {/* Main image */}
            <div className="flex items-center justify-center min-h-[400px] max-h-[80vh] overflow-hidden">
              <img
                src={photoPreviewUrls[currentPhotoIndex]}
                alt={`Photo ${currentPhotoIndex + 1}`}
                className="max-w-full max-h-[80vh] object-contain transition-transform duration-200"
                style={{ 
                  transform: `scale(${imageScale}) translate(${imagePan.x / imageScale}px, ${imagePan.y / imageScale}px)`,
                  cursor: imageScale > 1 ? 'move' : 'default',
                  touchAction: 'none' // Prevent default touch actions
                }}
                onDoubleClick={handleImageDoubleClick}
              />
            </div>

            {/* Navigation buttons */}
            {photoPreviewUrls.length > 1 && (
              <>
                <button
                  onClick={handlePreviousPhoto}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={handleNextPhoto}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Thumbnails */}
            {photoPreviewUrls.length > 1 && (
              <div className="flex gap-2 p-4 justify-center bg-black/20">
                {photoPreviewUrls.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentPhotoIndex(index);
                      setImageScale(1);
                      setImagePan({ x: 0, y: 0 });
                    }}
                    className={`relative w-16 h-16 rounded overflow-hidden border-2 transition-all ${
                      index === currentPhotoIndex
                        ? 'border-white scale-110'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Zoom hint */}
            {imageScale === 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/20 text-white text-xs px-3 py-1.5 rounded-full">
                {isMobile ? 'Pinch to zoom' : 'Double click to zoom'}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Map Dialog - Mobile Only */}
      <Dialog open={showMapDialog} onOpenChange={setShowMapDialog}>
        <DialogContent className="max-w-full w-full h-full p-0 m-0">
          <DialogTitle className="sr-only">Select Report Location</DialogTitle>
          <DialogDescription className="sr-only">
            Choose the location of your report on the map
          </DialogDescription>
          
          <div className="relative h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-center p-4 border-b bg-background">
              <h2 className="text-lg font-semibold">Report location point</h2>
            </div>

            {/* Map Placeholder */}
            <div className="flex-1 bg-muted flex items-center justify-center">
              <div className="text-center space-y-4 p-8">
                <MapPin className="h-16 w-16 mx-auto text-muted-foreground" />
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Map Coming Soon</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Interactive map will be integrated here to select the exact location of your report
                  </p>
                </div>
              </div>
            </div>

            {/* Confirm Button */}
            <div className="p-4 border-t bg-background">
              <Button 
                onClick={() => setShowMapDialog(false)} 
                className="w-full"
                size="lg"
              >
                Confirm Location
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    );
  }
