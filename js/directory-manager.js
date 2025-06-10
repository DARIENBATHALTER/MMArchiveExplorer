/**
 * DirectoryManager - Handles local directory access using File System Access API
 * Provides fallback instructions for browsers that don't support the API
 */
class DirectoryManager {
    constructor() {
        this.directoryHandle = null;
        this.isSupported = this.checkSupport();
        this.videoFiles = new Map();
        
        console.log(`📁 DirectoryManager initialized - API supported: ${this.isSupported}`);
    }

    /**
     * Check if File System Access API is supported
     */
    checkSupport() {
        return 'showDirectoryPicker' in window;
    }

    /**
     * Request directory access from user
     */
    async requestDirectory() {
        if (!this.isSupported) {
            throw new Error('File System Access API not supported in this browser');
        }

        try {
            this.directoryHandle = await window.showDirectoryPicker({
                mode: 'read',
                startIn: 'documents'
            });
            
            console.log(`📁 Directory selected: ${this.directoryHandle.name}`);
            return this.directoryHandle;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Directory selection was cancelled');
            }
            throw error;
        }
    }

    /**
     * Scan directory for video files and metadata
     */
    async scanDirectory() {
        if (!this.directoryHandle) {
            throw new Error('No directory selected');
        }

        console.log('📁 Scanning directory for video files...');
        
        // Clear previous scan results
        this.videoFiles.clear();

        await this.scanDirectoryRecursive(this.directoryHandle, '');
        
        console.log(`📁 Scan complete - Found ${this.videoFiles.size} video files`);
        
        // Debug: List all found video files
        if (this.videoFiles.size > 0) {
            console.log('📹 Video files found:');
            for (const [path, handle] of this.videoFiles.entries()) {
                console.log(`  - ${path}`);
            }
        }
        
        return {
            videoFiles: this.videoFiles
        };
    }

    /**
     * Recursively scan directory for files
     */
    async scanDirectoryRecursive(dirHandle, currentPath) {
        for await (const [name, handle] of dirHandle.entries()) {
            const fullPath = currentPath ? `${currentPath}/${name}` : name;

            if (handle.kind === 'file') {
                // More robust extension checking
                const nameLower = name.toLowerCase();
                const extension = nameLower.includes('.') ? nameLower.split('.').pop() : '';
                
                // Check for video files only (metadata comes from server)
                const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'm4v'];
                
                if (videoExtensions.includes(extension)) {
                    console.log(`📹 Found video file: ${fullPath}`);
                    this.videoFiles.set(fullPath, handle);
                } else if (name.length > 0) {
                    // Log non-video files for debugging
                    console.log(`📄 Skipping non-video file: ${fullPath} (extension: ${extension})`);
                }
            } else if (handle.kind === 'directory') {
                console.log(`📁 Scanning subdirectory: ${fullPath}`);
                // Recursively scan subdirectories
                await this.scanDirectoryRecursive(handle, fullPath);
            }
        }
    }

    /**
     * Get video file as blob URL
     */
    async getVideoBlob(filePath) {
        const fileHandle = this.videoFiles.get(filePath);
        if (!fileHandle) {
            throw new Error(`Video file not found: ${filePath}`);
        }

        const file = await fileHandle.getFile();
        return URL.createObjectURL(file);
    }





    /**
     * Check if directory has been selected
     */
    isDirectorySelected() {
        return this.directoryHandle !== null;
    }

    /**
     * Get directory name
     */
    getDirectoryName() {
        return this.directoryHandle?.name || 'No directory selected';
    }

    /**
     * Clear current directory selection
     */
    clearDirectory() {
        this.directoryHandle = null;
        this.videoFiles.clear();
        
        // Revoke any blob URLs to free memory
        this.videoFiles.forEach(url => {
            if (typeof url === 'string' && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
    }
}

// Export for use in other modules
window.DirectoryManager = DirectoryManager; 