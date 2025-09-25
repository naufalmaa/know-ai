# Know-AI Drive Interface

A modern, Google Drive-like file management interface built with Next.js App Router, featuring real-time collaboration, intelligent search, and comprehensive file management capabilities.

## Features

### 🗂️ File & Folder Management
- **Create, rename, delete** folders and files
- **Drag & drop** file uploads
- **Hierarchical navigation** with breadcrumbs
- **Real-time updates** with optimistic UI
- **Bulk operations** with multi-select

### 🔍 Search & Discovery
- **Instant search** across all files
- **Filter by file type**, date, and metadata
- **Advanced search** with document content indexing
- **Recent files** and quick access

### 🎨 User Experience
- **Google Drive-like interface** with familiar interactions
- **Responsive design** for desktop and mobile
- **Keyboard shortcuts** for power users
- **Accessibility** features (WCAG 2.1 compliant)
- **Dark mode** support (coming soon)

### ⚡ Performance
- **Optimistic UI updates** for instant feedback
- **Smart caching** with SWR
- **Lazy loading** for large file lists
- **Background uploads** with progress tracking

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | Create new folder |
| `Delete` | Delete selected items |
| `F2` | Rename selected item |
| `Enter` | Open folder or file |
| `Escape` | Cancel current action |
| `Ctrl/Cmd + A` | Select all items |
| `Ctrl/Cmd + Click` | Multi-select items |
| `Space` | Quick preview (coming soon) |
| `Ctrl/Cmd + F` | Focus search box |

## API Endpoints

The drive interface uses the following RESTful API endpoints:

### Folders
- `GET /api/drive/children?folder_id={id}` - List folder contents
- `POST /api/drive/folder` - Create folder
- `PATCH /api/drive/folder/{id}` - Rename folder
- `DELETE /api/drive/folder/{id}` - Delete folder
- `GET /api/drive/breadcrumbs/{id}` - Get folder breadcrumbs

### Files
- `POST /api/uploads/presign` - Get presigned upload URL
- `POST /api/uploads/complete` - Complete file upload
- `PATCH /api/files/{id}` - Rename file
- `DELETE /api/files/{id}` - Delete file
- `PATCH /api/drive/file/{id}/move` - Move file to folder
- `GET /api/files/{id}/signed-get` - Get signed download URL

### Search
- `GET /api/drive/search?q={query}` - Search files and folders

## Component Architecture

```
app/drive/page.tsx                 # Main drive page
├── components/drive/
│   ├── Sidebar.tsx               # Navigation sidebar
│   ├── Toolbar.tsx               # Action toolbar with search
│   ├── FileGrid.tsx              # File/folder grid display
│   ├── Breadcrumbs.tsx           # Navigation breadcrumbs
│   └── NewFolderModal.tsx        # Folder creation modal
├── lib/api.ts                     # API client functions
└── globals.css                    # Animations and styles
```

## State Management

The app uses a combination of:
- **SWR** for server state management and caching
- **React hooks** for local component state
- **Event system** for cross-component communication
- **Optimistic updates** for immediate user feedback

## Error Handling

- **Graceful degradation** when services are unavailable
- **User-friendly error messages** with actionable suggestions
- **Automatic retry** for transient failures
- **Rollback mechanisms** for failed optimistic updates

## Accessibility Features

- **Keyboard navigation** throughout the interface
- **Screen reader support** with proper ARIA labels
- **Focus management** for modals and interactions
- **High contrast** focus indicators
- **Semantic HTML** structure

## Development

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Run linting
pnpm lint
```

## Environment Variables

```env
NEXT_PUBLIC_API_BASE=http://127.0.0.1:4000
NEXT_PUBLIC_CHAT_WS=ws://127.0.0.1:8000/ws
```

## File Upload Flow

1. **Initiate upload** - Client requests presigned URL
2. **Direct upload** - File uploaded directly to S3/MinIO
3. **Complete upload** - Client notifies server of completion
4. **Background processing** - Server triggers indexing and metadata extraction
5. **UI update** - File appears in interface with real-time status

## Security

- **Presigned URLs** for secure file uploads
- **Input validation** on all user inputs
- **CSRF protection** with SameSite cookies
- **Content-Type validation** for file uploads
- **Size limits** to prevent abuse

## Performance Optimizations

- **Virtual scrolling** for large file lists (coming soon)
- **Image thumbnails** with lazy loading (coming soon)
- **Request deduplication** with SWR
- **Optimistic updates** for immediate feedback
- **Background file processing** to avoid blocking UI

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

When making changes to the drive interface:

1. **Test keyboard navigation** thoroughly
2. **Verify accessibility** with screen readers
3. **Test error scenarios** and edge cases
4. **Ensure responsive design** works on all screen sizes
5. **Update this documentation** if adding new features

## Troubleshooting

### Upload Issues
- Check S3/MinIO configuration
- Verify CORS settings
- Check file size limits

### Search Not Working
- Ensure search service is running
- Check database connections
- Verify indexed content

### Performance Issues
- Check network tab for slow requests
- Monitor memory usage for large file lists
- Verify SWR cache configuration

### UI Glitches
- Clear browser cache
- Check console for JavaScript errors
- Verify CSS animations are supported
