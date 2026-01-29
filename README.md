# 🔥 Wildfire Detection AI - Frontend

A modern, responsive React application for real-time wildfire detection using AI-powered image analysis.

![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-7.3.1-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-38B2AC?logo=tailwind-css)

## ✨ Features

- 🔥 **Fire & Smoke Detection** - Upload images/videos for YOLO-based fire detection
- 🛰️ **Satellite Analysis** - Analyze satellite imagery for wildfire risk assessment
- 📤 **Drag & Drop Upload** - Intuitive file upload with preview
- 🚨 **Real-time Alerts** - Browser notifications for detected threats
- 📊 **Detection History** - Track all past detections with timestamps
- 🎨 **Modern UI** - Dark theme with glassmorphism and smooth animations
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- Backend API running on `http://localhost:8000`

### Installation

```bash
# Navigate to frontend directory
cd frontend-new

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at **http://localhost:5173**

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🏗️ Project Structure

```
frontend-new/
├── src/
│   ├── components/          # React components
│   │   ├── FileUpload.jsx   # File upload with drag-and-drop
│   │   ├── DetectionResult.jsx  # Display detection results
│   │   ├── AlertStatus.jsx  # Alert notifications panel
│   │   └── HistoryPanel.jsx # Detection history tracker
│   ├── services/
│   │   └── api.js           # Backend API integration
│   ├── App.jsx              # Main application
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── .env                     # Environment variables
├── tailwind.config.js       # Tailwind configuration
└── package.json             # Dependencies
```

## 🎨 Tech Stack

- **Framework**: React 18 with hooks
- **Build Tool**: Vite (lightning-fast HMR)
- **Styling**: Tailwind CSS with custom theme
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Fonts**: Inter (Google Fonts)

## 🔌 API Integration

The frontend communicates with the FastAPI backend via two endpoints:

### Fire & Smoke Detection
```
POST /detect/fire-smoke
Content-Type: multipart/form-data

Response: {
  "detections": [
    { "class": "fire", "confidence": 0.95 }
  ]
}
```

### Satellite Fire Detection
```
POST /detect/satellite-fire
Content-Type: multipart/form-data

Response: {
  "wildfire": 0.85
}
```

### Configuration

Set the backend URL in `.env`:
```env
VITE_API_URL=http://localhost:8000
```

## 👤 User Flow

1. **Open Dashboard** → See the main interface with system status
2. **Select Mode** → Choose between Fire/Smoke or Satellite detection
3. **Upload File** → Drag & drop or click to upload image/video
4. **Start Detection** → Click button to analyze the file
5. **View Results** → See detection results with confidence scores
6. **Monitor Alerts** → Check alert panel for active threats
7. **Review History** → View past detections in the history panel

## 🎯 Key Components

### FileUpload
- Drag-and-drop interface
- File validation (type & size)
- Image preview
- Clear/reset functionality

### DetectionResult
- Color-coded alerts (red for threats, green for safe)
- Confidence scores for detections
- Wildfire probability visualization
- Animated icons

### AlertStatus
- Real-time alert notifications
- Browser notification support
- Severity-based styling
- Toggle notifications on/off

### HistoryPanel
- Chronological detection log
- Detection type and timestamp
- Visual threat indicators
- Scrollable list view

## 🎨 Design System

### Custom Colors
```javascript
fire: {
  500: '#f97316',  // Primary fire color
  600: '#ea580c',  // Hover states
}
```

### Custom Components
- `.glass-card` - Glassmorphism effect
- `.btn-primary` - Fire-themed gradient button
- `.btn-secondary` - Subtle glass button

### Animations
- Floating upload icon
- Pulsing alert indicators
- Smooth fade-in transitions

## 🧪 Testing

### Manual Testing Checklist
- [ ] Upload image and verify fire/smoke detection
- [ ] Upload satellite image and verify wildfire probability
- [ ] Test drag-and-drop functionality
- [ ] Verify browser notifications work
- [ ] Test responsive design on mobile
- [ ] Validate error handling when backend is offline

### Running Tests
```bash
# Start backend server first
cd ../backend
uvicorn app:app --reload

# Then start frontend
cd ../frontend-new
npm run dev
```

## 📦 Dependencies

### Production
- `react` - UI framework
- `react-dom` - React DOM rendering
- `axios` - HTTP client
- `lucide-react` - Icon library

### Development
- `vite` - Build tool
- `tailwindcss` - Utility-first CSS
- `postcss` - CSS processing
- `autoprefixer` - CSS vendor prefixes

## 🔧 Configuration

### Tailwind Config
Custom fire-themed colors and animations are defined in `tailwind.config.js`.

### Vite Config
Standard React configuration in `vite.config.js`.

### Environment Variables
- `VITE_API_URL` - Backend API base URL (default: http://localhost:8000)

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

The optimized build will be in the `dist/` directory.

### Deploy to Static Hosting
The built files can be deployed to:
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Any static hosting service

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of the Wildfire Detection AI system.

## 🆘 Troubleshooting

### Backend Connection Error
- Ensure backend server is running on `http://localhost:8000`
- Check CORS settings in backend
- Verify `.env` file has correct API URL

### Build Errors
- Delete `node_modules` and run `npm install` again
- Clear Vite cache: `rm -rf node_modules/.vite`

### Styling Issues
- Ensure Tailwind CSS is properly configured
- Check `tailwind.config.js` content paths
- Verify PostCSS is installed

## 📞 Support

For issues or questions, please check the main project documentation or create an issue in the repository.

---

**Built with ❤️ using React, Vite, and Tailwind CSS**
