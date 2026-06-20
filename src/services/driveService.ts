const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

export const driveService = {
  async getAuthToken() {
    // In our auth.ts, we exported getAccessToken hanging on authService, but let's just dynamic import or let components call it
    const { authService } = await import('../lib/auth');
    let token = authService.getAccessToken();
    if (!token) {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        const snap = await getDoc(doc(db, 'settings', 'google_drive'));
        if (snap.exists()) {
          const data = snap.data();
          if (data && data.accessToken) {
            token = data.accessToken;
            // Cache it in sessionStorage
            sessionStorage.setItem('google_drive_access_token', token);
          }
        }
      } catch (err) {
        console.warn("Could not fetch Google Drive token from Firestore:", err);
      }
    }
    if (!token) throw new Error('Not connected to Google Drive');
    return token;
  },

  async ensureLibraryFolder() {
    const token = await this.getAuthToken();
    
    // Check if "Wisdom Lounge Library" folder exists
    const q = "mimeType='application/vnd.google-apps.folder' and name='Wisdom Lounge Library' and trashed=false";
    const searchRes = await fetch(`${DRIVE_API}/files?q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!searchRes.ok) {
      throw new Error(`Drive folder verification failed: ${searchRes.statusText || searchRes.status}`);
    }
    
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id; // Return the first matching folder's ID
    }

    // Create if not exists
    const createRes = await fetch(`${DRIVE_API}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Wisdom Lounge Library',
        mimeType: 'application/vnd.google-apps.folder'
      })
    });
    
    if (!createRes.ok) {
      throw new Error(`Drive folder creation failed: ${createRes.statusText || createRes.status}`);
    }
    
    const folderData = await createRes.json();
    return folderData.id;
  },

  async ensureCategoryFolder(categoryName: string) {
    const rootFolderId = await this.ensureLibraryFolder();
    const token = await this.getAuthToken();
    
    const q = `mimeType='application/vnd.google-apps.folder' and name='${categoryName}' and '${rootFolderId}' in parents and trashed=false`;
    const searchRes = await fetch(`${DRIVE_API}/files?q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!searchRes.ok) throw new Error("Failed to verify category folder");
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) return data.files[0].id;
    
    const createRes = await fetch(`${DRIVE_API}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: categoryName,
        parents: [rootFolderId],
        mimeType: 'application/vnd.google-apps.folder'
      })
    });
    
    if (!createRes.ok) throw new Error("Failed to create category folder");
    const folderData = await createRes.json();
    return folderData.id;
  },

  async listFiles() {
    try {
      const folderId = await this.ensureLibraryFolder();
      const token = await this.getAuthToken();
      
      // 1. Fetch subfolders within the library root
      const subfoldersQ = `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const subfoldersRes = await fetch(`${DRIVE_API}/files?q=${encodeURIComponent(subfoldersQ)}&fields=files(id,name)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const folderToCategoryMap: Record<string, string> = {};
      if (subfoldersRes.ok) {
        const subfoldersData = await subfoldersRes.json();
        for (const sf of subfoldersData.files || []) {
          const name = sf.name.toLowerCase();
          if (name === 'books') {
            folderToCategoryMap[sf.id] = 'books';
          } else if (name === 'articles') {
            folderToCategoryMap[sf.id] = 'articles';
          } else if (name === 'research papers') {
            folderToCategoryMap[sf.id] = 'research_papers';
          } else if (name === 'seerah, tafsir & dowra notes') {
            folderToCategoryMap[sf.id] = 'seerah_tafsir_dowra';
          } else if (name === 'guided studies notes') {
            folderToCategoryMap[sf.id] = 'guided_studies';
          } else if (name === 'presentation files') {
            folderToCategoryMap[sf.id] = 'presentations';
          }
        }
      }

      // 2. Build parents query
      let parentQuery = `'${folderId}' in parents`;
      const docFolderIds = Object.keys(folderToCategoryMap);
      if (docFolderIds.length > 0) {
        const subParentQueries = docFolderIds.map(id => `'${id}' in parents`).join(' or ');
        parentQuery = `(${parentQuery} or ${subParentQueries})`;
      }

      // 3. Exclude folders from files list, query only actual files in specified folders
      const q = `mimeType != 'application/vnd.google-apps.folder' and ${parentQuery} and trashed=false`;
      
      const res = await fetch(`${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,webContentLink,webViewLink,createdTime,size,parents)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error(`Drive api list failed: ${res.statusText || res.status}`);
      }
      const data = await res.json();
      const filesList = data.files || [];

      // 4. Map files to dynamic category
      for (const file of filesList) {
        let category = 'books'; // Default fallback for root files
        const fileParents = file.parents || [];
        for (const pid of fileParents) {
          if (folderToCategoryMap[pid]) {
            category = folderToCategoryMap[pid];
            break;
          }
        }
        file.driveCategory = category;
      }

      return filesList;
    } catch (err) {
      console.warn('Google Drive items currently unavailable (handled):', err);
      return [];
    }
  },

  async uploadFile(file: File, customName?: string, categoryName?: string) {
    const folderId = categoryName 
      ? await this.ensureCategoryFolder(categoryName)
      : await this.ensureLibraryFolder();
    const token = await this.getAuthToken();
    
    // Get extension from original file name
    const extMatch = file.name.match(/\.[^/.]+$/);
    const ext = extMatch ? extMatch[0] : '';
    const finalName = customName ? `${customName}${ext}` : file.name;
    
    const metadata = {
      name: finalName,
      parents: [folderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const res = await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: form
    });
    
    if (!res.ok) {
      throw new Error(`Upload failed: ${await res.text()}`);
    }
    
    return await res.json();
  },

  async deleteFile(fileId: string) {
    const token = await this.getAuthToken();
    const res = await fetch(`${DRIVE_API}/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Deletion failed');
    return true;
  }
};

export function extractFileId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}

