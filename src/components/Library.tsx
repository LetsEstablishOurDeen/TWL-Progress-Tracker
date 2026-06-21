import React, { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { driveService, extractFileId } from '../services/driveService';
import { Library as LibraryIcon, FileText, Upload, Link as LinkIcon, Trash2, ExternalLink, Loader2, AlertCircle, X, BookOpen, FileCheck, Award, MessageSquare, Compass, Info, ChevronDown, ChevronUp, Lock, Users } from 'lucide-react';
import { authService } from '../lib/auth';
import { Learner, EditRequest } from '../types';
import { requestService } from '../services/requestService';
import { SUBJECTS } from '../constants';
import { getLearnerBadges } from '../lib/badges';
import { getLearnerStatus } from '../lib/status';
import { toTitleCase } from '../utils';

interface ArchiveItem {
  id: string; 
  name: string; 
  webViewLink: string;
  createdTime: string;
  size?: number | string;
  uploader?: string;
  author?: string;
  overview?: string;
  category: 'books' | 'articles' | 'research_papers' | 'seerah_tafsir_dowra' | 'guided_studies' | 'presentations';
  sourceRequest?: EditRequest;
  materialOwnership?: 'own' | 'someone_else';
  language?: string;
  subject?: string;
}

const SUBJECT_COLORS: Record<string, string> = {
  History: 'bg-orange-50 border-orange-100',
  Economics: 'bg-blue-50 border-blue-100',
  Spirituality: 'bg-purple-50 border-purple-100',
  Seerah: 'bg-emerald-50 border-emerald-100',
  Fiqh: 'bg-amber-50 border-amber-100',
  Hadith: 'bg-red-50 border-red-100',
  Arabic: 'bg-sky-50 border-sky-100',
  'Quranic Studies': 'bg-teal-50 border-teal-100',
  'Personal Development': 'bg-rose-50 border-rose-100',
};

const CATEGORIES = [
  { id: 'books', label: 'Books', icon: '📚', desc: 'Syllabus textbooks, classical manuals, and referential print' },
  { id: 'articles', label: 'Articles', icon: '📄', desc: 'Short academic articles, reflective essays, and blog posts' },
  { id: 'research_papers', label: 'Research Papers', icon: '🎓', desc: 'Scholarly papers, thesis records, and deep researches' },
  { id: 'seerah_tafsir_dowra', label: 'Seerah, Tafsir & Dowra Notes', icon: '📝', desc: 'Study notes, modular outlines, and summary files' },
  { id: 'guided_studies', label: 'Guided Studies Notes', icon: '👥', desc: 'Talaqqi session transcripts, study circle memos, and Ustadh annotations' },
  { id: 'presentations', label: 'Presentation Files', icon: '🎤', desc: 'PowerPoint presentations, slide reels, and speech files' }
] as const;

// --- CONFIGURATION FOR LIBRARY CATEGORY ACCESS TIERS ---
// Define the badge-count and name requirements for each category.
// To change tier requirements, simply update the minimum number of badges (minBadges) required:
// - 0 badges: Lounge Guest (Accessible to all)
// - 1 badge: Seeker of Wisdom
// - 3 badges: Avid Explorer
// - 6 badges: Lounge Scholar
// - 10 badges: Wisdom Adept
// - 15 badges: Lounge Vanguard
// ... and so on (see STATUS_TIERS in src/lib/status.ts)
export const CATEGORY_TIER_REQUIREMENTS: Record<
  'books' | 'articles' | 'research_papers' | 'seerah_tafsir_dowra' | 'guided_studies' | 'presentations',
  { minBadges: number; name: string }
> = {
  books: { minBadges: 0, name: 'Lounge Guest' },                     // Accessible to all
  articles: { minBadges: 6, name: 'Lounge Scholar' },                 // Accessible to Lounge Scholar+
  research_papers: { minBadges: 6, name: 'Lounge Scholar' },          // Accessible to Lounge Scholar+
  seerah_tafsir_dowra: { minBadges: 1, name: 'Seeker of Wisdom' },    // Accessible to Seeker of Wisdom+
  guided_studies: { minBadges: 6, name: 'Lounge Scholar' },           // Accessible to Lounge Scholar+
  presentations: { minBadges: 1, name: 'Seeker of Wisdom' },          // Accessible to Seeker of Wisdom+
};

interface UploadFileData {
  file: File;
  tag: string;
}

interface LibraryProps {
  isAdmin: boolean;
  activeLearner?: Learner | null;
  onAddToFocus?: (item: ArchiveItem) => void;
  onMakeCircle?: (item: ArchiveItem) => void;
}

export function Library({ isAdmin, activeLearner, onAddToFocus, onMakeCircle }: LibraryProps) {
  const [files, setFiles] = useState<any[]>([]);
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [allRequestsWithFiles, setAllRequestsWithFiles] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [activeCategory, setActiveCategory] = useState<ArchiveItem['category']>('books');
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFileData[]>([]);
  const [isCollection, setIsCollection] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadAuthor, setUploadAuthor] = useState('');
  const [uploadSubject, setUploadSubject] = useState('');
  const [isCustomUploadSubject, setIsCustomUploadSubject] = useState(false);
  const [uploadLanguages, setUploadLanguages] = useState<string[]>(['English']);
  const [uploadOverview, setUploadOverview] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<ArchiveItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValue, setFilterValue] = useState<string>('none');
  const [lockedCategory, setLockedCategory] = useState<{ label: string; requiredTier: string } | null>(null);

  const userBadges = activeLearner ? getLearnerBadges(activeLearner) : [];
  const userStatus = getLearnerStatus(userBadges.length);

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const token = await driveService.getAuthToken();
        setIsConnected(!!token);
      } catch (err) {
        setIsConnected(false);
      }
    };
    checkConnection();
  }, []);

  useEffect(() => {
    if (isConnected === true) {
      fetchFiles();
    } else if (isConnected === false) {
      setLoading(false);
    }
  }, [isConnected]);

  // Handle live Firestore subscription for requests that have files
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = requestService.subscribeToRequests((allRequests) => {
        const requestsWithFiles = allRequests.filter(req => 
          req.details?.hasFile || req.details?.fileLink
        );
        setAllRequestsWithFiles(requestsWithFiles);

        const approvedWithFiles = requestsWithFiles.filter(req => req.status === 'approved');
        setRequests(approvedWithFiles);
      });
    } catch (err) {
      console.error("Failed to subscribe to requests in Archive:", err);
    }
    return () => unsubscribe();
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await driveService.listFiles();
      setFiles(docs);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Google Drive');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      await driveService.uploadFile(file);
      await fetchFiles(); // Refresh list
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
    e.target.value = '';
  };

  const executeDelete = async () => {
    if (!deleteConfirmItem) return;
    setIsDeleting(true);
    setError(null);
    const item = deleteConfirmItem;
    const isDirectDrive = !item.sourceRequest;

    try {
      if (isDirectDrive) {
        await driveService.deleteFile(item.id);
        await fetchFiles();
      } else if (item.sourceRequest) {
        // Delete from Drive first
        if (item.webViewLink) {
          const fileIds: string[] = [];
          try {
            const data = JSON.parse(item.webViewLink);
            if (Array.isArray(data)) {
               data.forEach(obj => {
                 const id = extractFileId(obj.link);
                 if (id) fileIds.push(id);
               });
            }
          } catch {
             if (item.webViewLink.includes('|||')) {
                item.webViewLink.split('|||').forEach(p => {
                  const id = extractFileId(p);
                  if (id) fileIds.push(id);
                });
             } else {
                const id = extractFileId(item.webViewLink);
                if (id) fileIds.push(id);
             }
          }
          
          for (const fileId of fileIds) {
            try {
              await driveService.deleteFile(fileId);
            } catch (driveErr) {
              console.warn("Could not delete associated Google Drive file, proceeding:", driveErr);
            }
          }
        }
        // Then delete the edit request doc to unlist it from approved requests
        await requestService.deleteRequest(
          item.id,
          item.sourceRequest.learnerName,
          (item.sourceRequest as any).docPath
        );
        // Refresh the file cache so list stays synced
        await fetchFiles();
      }
      setDeleteConfirmItem(null);
    } catch (err: any) {
      setError(err.message || 'Deletion failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const reconnectDrive = async () => {
     try {
       sessionStorage.removeItem('google_drive_access_token');
       await authService.adminSignIn(true);
       setIsConnected(true);
       setError(null);
     } catch (err: any) {
       if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
         return; // gracefully handle user closing the popup
       }
       console.error("Connection failed", err);
       setError('Re-connection failed. Please try again.');
     }
  };

  const handleSubmitRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (uploadFiles.length === 0) return;
    if (!activeLearner && !isAdmin) return;

    setUploading(true);
    setError(null);
    try {
      const fileData: { link: string; tag: string }[] = [];
      for (const obj of uploadFiles) {
        try {
          const fileName = obj.tag ? `${uploadTitle} - ${obj.tag}` : uploadTitle;
          const res = await driveService.uploadFile(obj.file, fileName, 'Books');
          if (res && res.webViewLink) fileData.push({ link: res.webViewLink, tag: obj.tag });
        } catch (err: any) {
          console.warn("Upload failed for file:", obj.file.name, err);
          if (err.message && err.message.includes('401')) {
            throw new Error('Drive connection expired. Admin needs to click Reconnect Drive.');
          }
          throw new Error(`Failed to upload ${obj.file.name}: ${err.message}`);
        }
      }

      const uploaderId = activeLearner?.id || 'admin';
      const uploaderName = activeLearner?.fullName || 'Lounge Admin';

      await requestService.submitRequest({
        learnerId: uploaderId,
        learnerName: uploaderName,
        type: 'book',
        isLibrarySubmission: true,
        status: isAdmin ? 'approved' : 'pending',
        details: {
          title: toTitleCase(uploadTitle),
          author: toTitleCase(uploadAuthor),
          hasFile: true,
          fileLink: JSON.stringify(fileData),
          documentOverview: uploadOverview,
          language: uploadLanguages.join(', '),
          subject: (isCustomUploadSubject ? toTitleCase(uploadSubject) : toTitleCase(uploadSubject)) || undefined
        }
      });
      
      if (isAdmin) {
        setSubmitSuccess("Books uploaded successfully and added to the Wisdom Archive!");
      } else {
        setSubmitSuccess("Book submission requests queued for admin review! (+1 Wisdom Point upon approval)");
      }
      setUploadFiles([]);
      setUploadTitle('');
      setUploadAuthor('');
      setUploadLanguages(['English']);
      setUploadOverview('');
      setUploadSubject('');
      setIsCustomUploadSubject(false);
      setIsUploadModalOpen(false);
      setTimeout(() => setSubmitSuccess(null), 5000);
      
      if (fileData.length > 0) await fetchFiles();
    } catch (err: any) {
      setError(err.message || "Failed to submit upload request");
    } finally {
      setUploading(false);
    }
  };

  const isMatchedByLink = (link1: string, link2: string) => {
    if (!link1 || !link2) return false;
    const extractId = (url: string) => {
      const match = url.match(/[-\w]{25,}/);
      return match ? match[0] : url;
    };

    try {
      const data = JSON.parse(link1);
      if (Array.isArray(data)) {
        return data.some(obj => extractId(obj.link) === extractId(link2));
      }
    } catch {
      // ignore JSON parse error
    }

    if (link1.includes('|||')) {
      const parts = link1.split('|||');
      return parts.some(p => extractId(p) === extractId(link2));
    }

    return extractId(link1) === extractId(link2);
  };

  // Convert requests and direct drive files into integrated archive items
  const requestItems: ArchiveItem[] = requests.map(req => {
    let cat: ArchiveItem['category'] = 'books';
    if (req.type === 'book') cat = 'books';
    else if (req.type === 'research papers/article') {
      cat = req.details?.isResearchPaper ? 'research_papers' : 'articles';
    } else if (['seerah', 'tafsir', 'dowra'].includes(req.type)) {
      cat = 'seerah_tafsir_dowra';
    } else if (req.type === 'talaqqi') {
      cat = 'guided_studies';
    } else if (req.type === 'presentation') {
      cat = 'presentations';
    }

    return {
      id: req.id,
      name: toTitleCase(req.details?.title || 'Untitled Document'),
      webViewLink: req.details?.fileLink || '',
      createdTime: req.requestedAt || new Date().toISOString(),
      uploader: req.learnerName,
      author: toTitleCase(req.details?.author || req.details?.ustadName || req.details?.speaker || 'Unknown Contribution'),
      prevType: req.type,
      overview: req.details?.documentOverview || req.details?.overview || req.details?.description || '',
      category: cat,
      sourceRequest: req,
      materialOwnership: req.details?.materialOwnership,
      language: req.details?.language,
      subject: req.details?.subject ? toTitleCase(req.details.subject) : undefined
    };
  }).filter(item => !!item.webViewLink);

  const cleanFileName = (rawName: string) => {
    // Remove extension
    let cleaned = rawName.replace(/\.[^/.]+$/, "");
    // Replace underscores/hyphens with spaces
    cleaned = cleaned.replace(/[_-]+/g, " ");
    // Capitalize words
    return toTitleCase(cleaned);
  };

  const directDriveItems: ArchiveItem[] = files.map(file => {
    // If this file matches ANY request (approved, pending, or rejected), we filter it out of directDriveItems
    const matchesAnyRequest = allRequestsWithFiles.some(req => isMatchedByLink(req.details?.fileLink || '', file.webViewLink || file.webContentLink));
    if (matchesAnyRequest) return null;

    return {
      id: file.id,
      name: cleanFileName(file.name),
      webViewLink: file.webViewLink || file.webContentLink || '',
      createdTime: file.createdTime || new Date().toISOString(),
      size: file.size,
      category: (file.driveCategory || 'books') as any, // dynamically assign category based on Google Drive parent folder
      uploader: 'Central Library Admin'
    };
  }).filter((item): item is ArchiveItem => item !== null);

  const allItems = [...requestItems, ...directDriveItems];
  const allUniqueAuthors = Array.from(new Set(allItems.map(i => i.author).filter(Boolean))).sort();
  const allUniqueSubjects = Array.from(new Set(allItems.map(i => i.subject).filter(Boolean))).sort();
  
  let categoryItems = allItems.filter(item => item.category === activeCategory);
  
  const uniqueUploaders = Array.from(new Set(categoryItems.map(i => i.uploader).filter(Boolean))).sort();
  const uniqueAuthors = Array.from(new Set(categoryItems.map(i => i.author).filter(Boolean))).sort();
  const uniqueSubjects = Array.from(new Set(categoryItems.map(i => i.subject).filter(Boolean))).sort();
  const uniqueLanguages = Array.from(new Set(categoryItems.map(i => i.language).filter(Boolean))).sort();

  let processedItems = [...categoryItems];

  if (searchTerm) {
    const lower = searchTerm.toLowerCase();
    processedItems = processedItems.filter(item => 
      item.name.toLowerCase().includes(lower) ||
      item.author?.toLowerCase().includes(lower) ||
      item.uploader?.toLowerCase().includes(lower) ||
      item.language?.toLowerCase().includes(lower) ||
      item.subject?.toLowerCase().includes(lower)
    );
  }

  if (filterValue !== 'none') {
    const colonIndex = filterValue.indexOf(':');
    if (colonIndex > -1) {
      const filterKey = filterValue.substring(0, colonIndex);
      const value = filterValue.substring(colonIndex + 1);
      processedItems = processedItems.filter(item => {
        if (filterKey === 'uploader') return item.uploader === value;
        if (filterKey === 'author') return item.author === value;
        if (filterKey === 'language') return item.language === value;
        if (filterKey === 'subject') return item.subject === value;
        return true;
      });
    }
  }

  // Sort book collection by their name alphabetically by default
  if (activeCategory === 'books') {
    processedItems.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  }

  const filteredItems = processedItems;
  const hoveredItemObj = hoveredItem ? filteredItems.find(i => i.id === hoveredItem) : null;

  if (isConnected === null) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-brown" />
        <p className="mt-4 text-sm font-medium text-brand-brown-light">Connecting to Wisdom Archive...</p>
      </div>
    );
  }

  if (isConnected === false) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="bg-brand-white border border-brand-border rounded-3xl p-8 md:p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-brand-beige rounded-2xl flex items-center justify-center mx-auto mb-6">
            <LibraryIcon className="w-10 h-10 text-brand-brown" />
          </div>
          <h2 className="font-serif text-3xl font-bold text-brand-text mb-4">Central Library</h2>
          {isAdmin ? (
            <>
              <p className="text-brand-brown-light mb-8 max-w-lg mx-auto">
                Connect Google Drive to organize and store books, research papers, articles, and scholastic materials submitted to the Wisdom Lounge.
              </p>
              <button
                onClick={reconnectDrive}
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-brown text-brand-offwhite rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-brand-brown/90 transition-colors"
              >
                <LinkIcon className="w-5 h-5" />
                Connect Google Drive
              </button>
            </>
          ) : (
            <p className="text-brand-brown-light max-w-lg mx-auto">
              The library is currently offline. An admin needs to connect the Lounge Library drive.
            </p>
          )}
        </div>
      </div>
    );
  }

  const renderLinks = (linkString: string) => {
    try {
      const data = JSON.parse(linkString);
      if (Array.isArray(data)) {
        return (
          <div className="flex-1 min-w-0 mr-2">
            <div className="flex overflow-x-auto no-scrollbar gap-2 max-w-full pb-0.5 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {data.map((obj: any, i: number) => (
                <a key={i} href={obj.link} target="_blank" rel="noreferrer" className="shrink-0 text-[10px] bg-white/10 border border-white/20 px-2.5 py-1 rounded font-bold uppercase tracking-wider text-brand-offwhite hover:bg-white/20 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  {obj.tag ? (obj.tag === 'Vol 1' && data.length === 1 ? 'Read' : obj.tag) : (data.length > 1 ? `Vol ${i+1}` : 'Read')}
                </a>
              ))}
            </div>
          </div>
        );
      }
    } catch (e) {
      // not JSON
    }
    
    if (linkString.includes('|||')) {
      const parts = linkString.split('|||');
      return (
        <div className="flex-1 min-w-0 mr-2">
          <div className="flex overflow-x-auto no-scrollbar gap-2 max-w-full pb-0.5 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {parts.map((p, i) => (
              <a key={i} href={p} target="_blank" rel="noreferrer" className="shrink-0 text-[10px] bg-white/10 border border-white/20 px-2.5 py-1 rounded font-bold uppercase tracking-wider text-brand-offwhite hover:bg-white/20 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                Vol {i+1}
              </a>
            ))}
          </div>
        </div>
      );
    }
    
    return (
      <a href={linkString} target="_blank" rel="noreferrer" className="shrink-0 text-[10px] bg-white/10 border border-white/20 px-2.5 py-1 rounded font-bold uppercase tracking-wider text-brand-offwhite hover:bg-white/20 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        Read
      </a>
    );
  };

  return (
    <div className="max-w-6xl mx-auto pt-4 pb-12">
      {/* Title & Actions bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-text flex items-center gap-3">
            <LibraryIcon className="w-8 h-8 text-brand-brown" />
            Wisdom Archive
          </h1>
          <p className="text-brand-brown-light mt-1">Centralized digital vault of classical books, articles, notes and presentations</p>
        </div>
        
        {activeCategory === 'books' && (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-brand-brown text-brand-offwhite rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-brand-brown/90 transition-all active:scale-95 shadow-md"
            >
              <Upload className="w-5 h-5" />
              <span>{isAdmin ? 'Upload Book' : 'Submit Book'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search library..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-3 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
        />
        <select
          value={filterValue}
          onChange={(e) => setFilterValue(e.target.value)}
          className="px-4 py-3 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown w-full sm:w-64 max-w-full"
        >
          <option value="none">All</option>
          {uniqueUploaders.length > 0 && <optgroup label="Uploader">
            {uniqueUploaders.map(u => <option key={`uploader:${u}`} value={`uploader:${u}`}>{u}</option>)}
          </optgroup>}
          {uniqueAuthors.length > 0 && <optgroup label="Author">
            {uniqueAuthors.map(a => <option key={`author:${a}`} value={`author:${a}`}>{a}</option>)}
          </optgroup>}
          {uniqueSubjects.length > 0 && <optgroup label="Subject">
            {uniqueSubjects.map(s => <option key={`subject:${s}`} value={`subject:${s}`}>{s}</option>)}
          </optgroup>}
          {uniqueLanguages.length > 0 && <optgroup label="Language">
            {uniqueLanguages.map(l => <option key={`language:${l}`} value={`language:${l}`}>{l}</option>)}
          </optgroup>}
        </select>
      </div>

      {submitSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-bold shadow-sm">
          {submitSuccess}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
             <p className="font-bold">Error accessing Drive</p>
             <p>{error}</p>
             {isAdmin && <button onClick={reconnectDrive} className="mt-2 text-xs font-bold uppercase tracking-wider underline">Reconnect Drive</button>}
          </div>
        </div>
      )}

      {/* Active Category Description Panel */}
      <div className="bg-brand-beige/20 border border-brand-border/60 rounded-2xl p-4 mb-6 flex items-start gap-3 text-sm text-brand-brown">
        <Info className="w-5 h-5 text-brand-brown shrink-0 mt-0.5" />
        <div>
          <span className="font-bold uppercase tracking-wider text-xs text-brand-brown block mb-0.5">
            {CATEGORIES.find(c => c.id === activeCategory)?.label} Category
          </span>
          <p className="text-brand-brown-light leading-relaxed">
            {CATEGORIES.find(c => c.id === activeCategory)?.desc}
          </p>
          {activeCategory !== 'books' && (
            <p className="text-xs font-medium text-brand-brown mt-2">
              📝 Submissions for this category are done as study uploads via the <strong className="underline">Dashboard ('Learner')</strong> as personal material notes or presentations.
            </p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {lockedCategory && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-start gap-3 shadow-sm"
          >
            <Lock className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">Access Restricted</p>
              <p>The <strong>{lockedCategory.label}</strong> section of the library is only available to members at the <strong>{lockedCategory.requiredTier}</strong> tier and above. Earning more badges will unlock this material.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories Tabs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          const requirement = CATEGORY_TIER_REQUIREMENTS[cat.id];
          const isLocked = !isAdmin && userBadges.length < requirement.minBadges;
          const count = allItems.filter(item => item.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => {
                if (isLocked) {
                  setLockedCategory({ label: cat.label, requiredTier: requirement.name });
                  setTimeout(() => setLockedCategory(null), 5000);
                } else {
                  setActiveCategory(cat.id);
                }
              }}
              className={`relative flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all duration-200 hover:-translate-y-0.5 ${isActive ? 'bg-brand-brown border-brand-brown text-brand-offwhite shadow-md' : 'bg-brand-white border-brand-border/60 text-brand-text hover:bg-brand-beige/20 hover:border-brand-border'} ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <span className="text-2xl mb-1.5">{cat.icon}</span>
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold tracking-tight leading-tight">{cat.label}</span>
                {!isLocked && (
                  <span className={`text-[9px] font-mono tracking-wider font-semibold mt-0.5 px-1.5 rounded-full ${isActive ? 'bg-white/20 text-brand-offwhite' : 'bg-brand-beige/40 text-brand-brown-light'}`}>
                    {count} {count === 1 ? 'item' : 'items'}
                  </span>
                )}
              </div>
              {isLocked && (
                <div className="absolute top-2 right-2 bg-brand-brown/80 rounded-full p-1 backdrop-blur-sm shadow-sm">
                  <Lock className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Content Archive list */}
      <div className="bg-brand-white border border-brand-border rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-brown mx-auto" />
            <p className="mt-4 text-sm font-medium text-brand-brown-light">Loading archive materials...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center text-brand-brown-light bg-brand-white">
            <div className="w-16 h-16 bg-brand-offwhite rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-brand-border" />
            </div>
            <h3 className="font-serif text-lg font-bold text-brand-text mb-1">No items in this category</h3>
            <p className="text-xs text-brand-brown-light max-w-sm mx-auto mb-4">
              This repository is waiting for approved submissions or direct archives.
            </p>
          </div>
        ) : activeCategory === 'books' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                className="group relative flex flex-col rounded-2xl border-2 border-brand-brown-dark bg-brand-brown-dark text-brand-offwhite shadow-lg transition-all duration-300 overflow-hidden cursor-pointer"
                onClick={() => {
                  if (window.matchMedia("(hover: none)").matches || window.innerWidth < 1024) {
                    toggleExpand(item.id);
                  }
                }}
                onMouseEnter={() => {
                  if (!window.matchMedia("(hover: none)").matches && window.innerWidth >= 1024) {
                    setHoveredItem(item.id);
                  }
                }}
                onMouseMove={(e) => {
                  if (!window.matchMedia("(hover: none)").matches && window.innerWidth >= 1024) {
                    setMousePosition({ x: e.clientX, y: e.clientY });
                  }
                }}
                onMouseLeave={() => {
                  if (!window.matchMedia("(hover: none)").matches && window.innerWidth >= 1024) {
                    setHoveredItem(null);
                  }
                }}
              >
                <div className="relative aspect-[3/4] p-4 flex flex-col">
                  {/* Top Subject */}
                  {item.subject && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-offwhite/80 mb-2 truncate">
                      {item.subject}
                    </span>
                  )}
                  
                  {/* Icon */}
                  <div className="flex-1 flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-brand-offwhite/20" />
                  </div>
                </div>
                
                {/* Title area */}
                <div className="px-4 pb-4">
                  <h4 className="font-serif font-bold text-brand-offwhite text-base truncate">{item.name}</h4>
                  {item.author && item.author !== 'Unknown Contribution' && <p className="text-xs text-brand-offwhite/70 truncate">by {item.author}</p>}
                </div>
                
                {/* Overview area - animated tooltip for mobile */}
                <AnimatePresence>
                  {expandedItems[item.id] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="absolute inset-0 bg-brand-brown-dark/95 backdrop-blur-md z-10 p-4 flex flex-col justify-center border-2 border-brand-brown-dark"
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }}
                        className="absolute top-2 right-2 p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-all active:scale-95 z-20"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                      <div className="overflow-y-auto pr-2 mt-4 text-left">
                        <div className="mb-2">
                          <span className="text-[9px] font-mono tracking-widest font-extrabold text-brand-beige uppercase block mb-1">
                            Full Book Title
                          </span>
                          <h5 className="font-serif font-bold text-sm text-brand-offwhite leading-snug">
                            {item.name}
                          </h5>
                        </div>

                        {item.overview && (
                          <p className="text-xs text-brand-offwhite/85 mt-2 mb-2 italic leading-relaxed">
                            "{item.overview}"
                          </p>
                        )}

                        {(item.author || item.uploader || item.language) && (
                          <div className="pt-2 mt-2 border-t border-white/10 text-[10px] text-brand-offwhite/60 space-y-1">
                            {item.author && item.author !== 'Unknown Contribution' && (
                              <p className="flex items-center justify-between gap-4">
                                <span className="font-mono text-[9px] tracking-wider text-brand-beige/80 uppercase">Author:</span>
                                <span className="text-right truncate max-w-[125px] font-medium">{item.author}</span>
                              </p>
                            )}
                            {item.uploader && (
                              <p className="flex items-center justify-between gap-4">
                                <span className="font-mono text-[9px] tracking-wider text-brand-beige/80 uppercase">Uploader:</span>
                                <span className="text-right truncate max-w-[120px] font-medium">{item.uploader}</span>
                              </p>
                            )}
                            {item.language && (
                              <p className="flex items-center justify-between gap-4">
                                <span className="font-mono text-[9px] tracking-wider text-brand-beige/80 uppercase">Language:</span>
                                <span className="text-right font-medium">{item.language}</span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Footer */}
                <div className="p-3 bg-black/10 border-t border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0 flex shrink-0 items-center gap-1.5">
                      {renderLinks(item.webViewLink)}
                      {isAdmin && onMakeCircle && activeCategory === 'books' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onMakeCircle(item); }}
                          className="shrink-0 text-[10px] bg-green-900/40 border border-green-500/30 px-2.5 py-1 rounded font-bold uppercase tracking-wider text-green-100 hover:bg-green-800/60 transition-all whitespace-nowrap h-[26px] flex items-center"
                          title="Make a Reading Circle for this book"
                        >
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />Circle</span>
                        </button>
                      )}
                    </div>
                    {isAdmin && (
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmItem(item); }} className="text-brand-offwhite/50 hover:text-red-300 shrink-0 ml-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {onAddToFocus && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToFocus(item);
                      }}
                      className="w-full text-[10px] bg-brand-brown text-brand-offwhite border border-brand-brown py-1.5 rounded font-bold uppercase tracking-wider hover:bg-brand-brown/85 whitespace-nowrap transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                      title="Add this book to your Active Focus"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Focus</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {/* Tooltip */}
            {hoveredItemObj && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="fixed z-[100] bg-brand-brown-dark/95 backdrop-blur-md text-brand-offwhite p-4 rounded-xl shadow-2xl border border-white/20 max-w-xs pointer-events-none"
                style={{ left: mousePosition.x + 15, top: mousePosition.y + 15 }}
              >
                <div className="mb-2">
                  <span className="text-[9px] font-mono tracking-widest font-extrabold text-brand-beige uppercase block mb-1">
                    Full Book Title
                  </span>
                  <h5 className="font-serif font-bold text-sm text-brand-offwhite leading-snug">
                    {hoveredItemObj.name}
                  </h5>
                </div>

                {hoveredItemObj.overview && (
                  <p className="text-xs text-brand-offwhite/85 mt-2 mb-2 italic leading-relaxed">
                    "{hoveredItemObj.overview}"
                  </p>
                )}

                {(hoveredItemObj.author || hoveredItemObj.uploader || hoveredItemObj.language) && (
                  <div className="pt-2 mt-2 border-t border-white/10 text-[10px] text-brand-offwhite/60 space-y-1">
                    {hoveredItemObj.author && hoveredItemObj.author !== 'Unknown Contribution' && (
                      <p className="flex items-center justify-between gap-4">
                        <span className="font-mono text-[9px] tracking-wider text-brand-beige/80 uppercase">Author:</span>
                        <span className="text-right truncate max-w-[150px] font-medium">{hoveredItemObj.author}</span>
                      </p>
                    )}
                    {hoveredItemObj.uploader && (
                      <p className="flex items-center justify-between gap-4">
                        <span className="font-mono text-[9px] tracking-wider text-brand-beige/80 uppercase">Uploader:</span>
                        <span className="text-right truncate max-w-[150px] font-medium">{hoveredItemObj.uploader}</span>
                      </p>
                    )}
                    {hoveredItemObj.language && (
                      <p className="flex items-center justify-between gap-4">
                        <span className="font-mono text-[9px] tracking-wider text-brand-beige/80 uppercase">Language:</span>
                        <span className="text-right font-medium">{hoveredItemObj.language}</span>
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-brand-border/60">
            {filteredItems.map((item) => (
          <div key={item.id} className={`p-5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group ${item.subject && SUBJECT_COLORS[item.subject] ? SUBJECT_COLORS[item.subject] : 'hover:bg-brand-beige/10'}`}>
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-brand-beige/40 flex items-center justify-center shrink-0 text-brand-brown border border-brand-border-light shadow-sm">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      {item.subject && (
                         <span className="block w-full text-[10px] font-bold uppercase tracking-widest text-brand-brown-light mb-0.5">
                           {item.subject}
                         </span>
                      )}
                      <a
                        href={item.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="font-serif font-bold text-brand-text hover:text-brand-brown hover:underline text-base md:text-lg shrink-0 max-w-[280px] sm:max-w-[420px] md:max-w-none truncate"
                      >
                        {item.name}
                      </a>
                      {item.author && item.author !== 'Unknown Contribution' && (
                        <span className="text-xs text-brand-brown-light font-medium">
                          by <span className="font-semibold text-brand-brown">{item.author}</span>
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1.5 py-1">
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-brown hover:text-brand-brown-light transition-colors py-1 cursor-pointer focus:outline-none"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{expandedItems[item.id] ? 'Hide Description' : 'Show Description'}</span>
                        {expandedItems[item.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      
                      {expandedItems[item.id] && (
                        <div className="bg-brand-beige/10 border border-brand-border/40 rounded-xl p-3 max-w-3xl animate-in fade-in slide-in-from-top-1 duration-200">
                          {item.overview ? (
                            <div className="space-y-1">
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-brown-light">Description:</span>
                              <p className="text-xs text-brand-brown leading-relaxed italic pr-4 whitespace-pro-wrap">
                                "{item.overview}"
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-brand-brown-light italic">
                              No description was provided by the uploader for this item.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brand-brown-light font-medium pt-1">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-brown/40" />
                        Uploader: <span className="font-semibold">{item.uploader || 'Lounge Admin'}</span>
                      </span>
                      <span>
                        • Shared on: {new Date(item.createdTime).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                      {item.size && (
                         <span>
                           • Size: {(parseInt(item.size as string) / 1024 / 1024).toFixed(2)} MB
                         </span>
                      )}
                      {item.materialOwnership && (
                        <span className="flex items-center gap-1">
                          • Material: 
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${item.materialOwnership === 'own' ? 'bg-green-100 text-green-800' : 'bg-brand-beige/80 text-brand-brown-light'}`}>
                            {item.materialOwnership === 'own' ? "Personal Notes/Material" : "Shared Reference"}
                          </span>
                        </span>
                      )}
                      {item.language && (
                        <span className="flex items-center gap-1 flex-wrap">
                          • Language: 
                          {item.language.split(',').map(lang => (
                            <span key={lang.trim()} className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight bg-blue-100/80 text-blue-800 border border-blue-200">
                              {lang.trim()}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {onAddToFocus && (
                    <button
                      onClick={() => onAddToFocus(item)}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-brand-offwhite bg-brand-brown hover:bg-brand-brown/95 border border-brand-brown/80 rounded-xl transition-all h-10 shadow-sm whitespace-nowrap active:scale-95"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Focus</span>
                    </button>
                  )}
                  <a 
                    href={item.webViewLink} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center gap-1 px-4 py-2 text-xs font-bold uppercase tracking-wider text-brand-brown bg-brand-white hover:bg-brand-beige border border-brand-border rounded-xl transition-all h-10 shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View / open</span>
                  </a>
                  {isAdmin && (
                    <button 
                      onClick={() => setDeleteConfirmItem(item)} 
                      className="p-2 text-brand-brown-light hover:text-red-500 bg-brand-white hover:bg-red-50 rounded-xl border border-transparent hover:border-red-200 transition-colors h-10 w-10 flex items-center justify-center shadow-sm" 
                      aria-label="Delete file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-brand-brown/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-bg-alt rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-brand-border/60 bg-brand-white flex items-center justify-between shrink-0">
              <h3 className="font-serif text-2xl font-bold text-brand-text">{isAdmin ? 'Upload Scholar Book' : 'Submit Scholar Book'}</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-brand-brown-light hover:text-brand-brown transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            {(!activeLearner && !isAdmin) ? (
              <div className="p-6 text-center text-brand-brown-light">
                Please sign in from the Dashboard to upload documents and earn points.
              </div>
            ) : (
              <form onSubmit={handleSubmitRequest} className="p-6 space-y-5 overflow-y-auto w-full">
                <p className="text-sm text-brand-brown-light leading-relaxed">
                  {isAdmin 
                    ? "Provide classical texts, Arabic editions, or authorized translated books to add directly to the digital archive."
                    : "Provide classical texts, Arabic editions, or authorized translated books. Admins will review the book and add it to the Wisdom Archive (+1 wisdom point on approval)."
                  }
                </p>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Book Title</label>
                  <input type="text" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} required className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown" placeholder="e.g. Riyad as-Salihin" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Book Author</label>
                  <input type="text" list="authors-list" value={uploadAuthor} onChange={e => setUploadAuthor(e.target.value)} required className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown" placeholder="e.g. Imam an-Nawawi" />
                  <datalist id="authors-list">
                    {allUniqueAuthors.map(author => (
                      <option key={author} value={author} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Subject</label>
                  <select
                    value={isCustomUploadSubject ? 'Other' : uploadSubject}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'Other') {
                        setIsCustomUploadSubject(true);
                        setUploadSubject('');
                      } else {
                        setIsCustomUploadSubject(false);
                        setUploadSubject(val);
                      }
                    }}
                    required
                    className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                  >
                    <option value="">Select a subject</option>
                    {Array.from(new Set([...SUBJECTS, ...allUniqueSubjects])).map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                    <option value="Other">Other (recommend a subject)</option>
                  </select>
                </div>
                {isCustomUploadSubject && (
                  <div className="mb-4">
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Specify Subject</label>
                      <input
                      type="text"
                      list="subjects-list"
                      value={uploadSubject}
                      onChange={(e) => setUploadSubject(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                      placeholder="Enter your recommended subject"
                      />
                      <datalist id="subjects-list">
                        {allUniqueSubjects.map(subject => (
                          <option key={subject} value={subject} />
                        ))}
                      </datalist>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                    Book Languages <span className="text-[10px] font-normal lowercase italic">(select all that apply)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Urdu', 'English', 'Arabic', 'Other'].map(lang => {
                      const isSelected = uploadLanguages.includes(lang);
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              // Let them unselect, but keep at least one
                              if (uploadLanguages.length > 1) {
                                setUploadLanguages(uploadLanguages.filter(l => l !== lang));
                              }
                            } else {
                              setUploadLanguages([...uploadLanguages, lang]);
                            }
                          }}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 border cursor-pointer select-none ${
                            isSelected
                              ? 'bg-brand-brown text-brand-offwhite border-brand-brown shadow-sm scale-[1.02]'
                              : 'bg-brand-white text-brand-brown border-brand-border/85 hover:bg-brand-beige/25'
                          }`}
                        >
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Select Book PDF(s) / Text(s)</label>
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-brown mb-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isCollection} 
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsCollection(checked);
                        if (!checked && uploadFiles.length > 1) {
                            setUploadFiles(uploadFiles.slice(0, 1).map(uf => ({ ...uf, tag: uf.tag || 'Vol 1' })));
                        } else if (checked) {
                            setUploadFiles(uploadFiles.map((uf, idx) => ({ ...uf, tag: uf.tag || `Vol ${idx + 1}` })));
                        }
                      }} 
                    />
                    Is this a collection/multiple volumes?
                  </label>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-2 px-4 py-2 border border-brand-border rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-brand-offwhite transition-colors bg-brand-white">
                      <Upload className="w-4 h-4" />
                      <span>{uploadFiles.length > 0 ? 'Change Files' : 'Browse Files'}</span>
                      <input 
                        type="file" 
                        multiple={isCollection} 
                        onChange={e => {
                          if (e.target.files) {
                            const filesArray = Array.from(e.target.files);
                            if (filesArray.length > 1) {
                              setIsCollection(true);
                            }
                            setUploadFiles(filesArray.map((f, i) => ({ file: f, tag: `Vol ${i + 1}` })));
                          }
                        }} 
                        className="hidden" 
                        accept=".pdf,.doc,.docx,.txt" 
                        required 
                      />
                    </label>
                    {uploadFiles.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {uploadFiles.map((uf, i) => (
                           <div key={i} className="flex flex-col gap-1 p-2 border border-brand-border rounded-lg bg-brand-white">
                             <span className="text-xs text-brand-brown-light font-medium truncate">{uf.file.name}</span>
                             {isCollection && (
                               <input type="text" placeholder="Tag (e.g. Vol 1, Book A)" value={uf.tag} onChange={e => {
                                 const f = [...uploadFiles];
                                 f[i].tag = e.target.value;
                                 setUploadFiles(f);
                               }} className="px-2 py-1 bg-brand-offwhite border border-brand-border rounded text-brand-brown w-full text-xs" />
                             )}
                           </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Description</label>
                  <textarea value={uploadOverview} onChange={e => setUploadOverview(e.target.value)} required rows={3} className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown resize-none" placeholder="Provide author name, edition details, or a brief description..." />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsUploadModalOpen(false)} className="flex-1 px-6 py-3 border border-brand-border rounded-xl text-xs font-bold uppercase tracking-widest text-brand-brown hover:bg-brand-offwhite transition-all">Cancel</button>
                  <button type="submit" disabled={uploading || uploadFiles.length === 0} className="flex-2 px-6 py-3 bg-brand-brown text-brand-offwhite rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>{isAdmin ? 'Upload & Approve' : 'Submit'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {deleteConfirmItem && (
        <div className="fixed inset-0 bg-brand-brown/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-brand-bg-alt rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 p-6 space-y-6 border border-brand-border">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-serif text-xl font-bold text-brand-text">Confirm Deletion</h3>
                <p className="text-xs text-brand-brown-light leading-relaxed">
                  {!deleteConfirmItem.sourceRequest 
                    ? `Are you sure you want to permanently delete "${deleteConfirmItem.name}" from the Library archive?`
                    : `Are you sure you want to permanently delete "${deleteConfirmItem.name}" from BOTH the Library and Google Drive?`
                  }
                </p>
                <p className="text-[10px] font-semibold text-red-500 uppercase tracking-widest mt-2">
                  ⚠️ This action is irreversible.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setDeleteConfirmItem(null)} 
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 border border-brand-border rounded-xl text-xs font-bold uppercase tracking-widest text-brand-brown hover:bg-brand-offwhite transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={executeDelete} 
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
