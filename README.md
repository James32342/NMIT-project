# NeuroPath AI - Neural Cosmos

An adaptive cognitive profiling and intelligent assessment platform that provides personalized insights, living analytics, and AI-guided growth through beautiful neural visualizations.

## Features

### 🧠 Neural Constellation Visualization
- **Elegant orbital design** with 5 behavioral attributes orbiting a pulsing neural core
- **Real-time animations** with optimized performance
- **Interactive nodes** displaying behavioral metrics:
  - Resilience - Ability to bounce back from challenges
  - Decision Clarity - Confidence in making choices
  - Emotional Balance - Stability under pressure
  - Growth Mindset - Capacity for development
  - Social Intelligence - Understanding others & situations

### 📊 Comprehensive Assessment System
- **Adaptive questionnaire** with dynamic difficulty adjustment
- **Real-time performance tracking** (accuracy, response time, adaptability)
- **Evidence-based insights** linked directly to assessment performance
- **Detailed learning style analysis** with 8 key metrics
- **Personality spectrum** with 10 comprehensive attributes

### 🎯 Personalized Insights
- **Learning Style Analysis**: Processing speed, retention, transfer ability, consistency
- **Detailed Insights**: Cognitive performance, psychological patterns, adaptive capacity
- **Actionable Recommendations**: Immediate actions, long-term development, skill enhancement
- **Performance Evidence**: Response time analysis, accuracy consistency, adaptation speed

### 🎨 Beautiful UI/UX
- **Dark theme** with gradient backgrounds and glass morphism effects
- **Responsive design** optimized for all screen sizes
- **Smooth animations** and micro-interactions
- **Performance optimized** with GPU acceleration

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Styling**: CSS Grid, Flexbox, CSS Variables, Animations
- **Backend Ready**: Node.js/Express compatible structure
- **API Integration**: Gemini AI API ready (add key to .env)

## Getting Started

### Prerequisites
- Git (for version control)
- Node.js (optional, for backend)
- Modern web browser

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/neuropath-ai.git
   cd neuropath-ai
   ```

2. **Set up environment variables**
   ```bash
   # Create .env file in root directory
   echo "GEMINI_API_KEY=your_api_key_here" > .env
   ```

3. **Open in browser**
   ```bash
   # Simply open index.html in your browser
   # Or use a local server for better development
   python -m http.server 8000
   # or
   npx serve .
   ```

### Environment Setup

#### Git Installation (Windows)
```bash
# Download and install Git from https://git-scm.com/download/win
# Or use winget
winget install --id Git.Git -e --source winget

# Configure Git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

#### GitHub Setup
1. Create account at https://github.com
2. Create new repository: `neuropath-ai`
3. Add remote and push:
```bash
git remote add origin https://github.com/yourusername/neuropath-ai.git
git branch -M main
git push -u origin main
```

## Project Structure

```
neuropath-ai/
├── index.html          # Main application
├── style.css           # Styling and animations
├── script.js           # Application logic
├── .gitignore          # Git ignore file (protects .env)
├── .env               # Environment variables (API keys)
├── README.md           # This file
└── backend/            # Backend structure (optional)
```

## API Integration

### Gemini API Setup
1. Get API key from Google AI Studio
2. Add to `.env` file:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. The application will automatically use the API for enhanced insights

### Environment Variables
- `GEMINI_API_KEY`: Google Gemini AI API key
- `NODE_ENV`: Environment (development/production)

## Development

### Local Development
```bash
# Start local server
npx serve .

# Or use Python
python -m http.server 8000

# Or use Node.js
npx http-server
```

### Git Workflow
```bash
# Add changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push origin main

# Create new branch
git checkout -b feature-name

# Switch branches
git checkout main
```

## Performance Optimizations

- **CSS Containment**: GPU acceleration for animations
- **Will-change hints**: Optimized rendering
- **Reduced animations**: Minimal computational overhead
- **Efficient layout**: No unnecessary reflows

## Security

- **Environment variables**: API keys protected by .gitignore
- **No hardcoded secrets**: All sensitive data in environment
- **Secure defaults**: Production-ready configuration

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create GitHub issue
- Check documentation
- Review environment setup

---

**Built with ❤️ for the NeuroPath AI Hackathon**
